import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalyzedPost } from "../types";

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    platform: {
      type: Type.STRING,
      description: "The name of the social media platform (e.g., Twitter, Facebook, LinkedIn, Instagram).",
    },
    content: {
      type: Type.STRING,
      description: "A summary or the actual text content extracted from the post link. If exact content cannot be read, provide a descriptive summary of what the link likely contains based on search results.",
    },
    keywords: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A list of 3-7 relevant keywords or hashtags related to the post content.",
    },
  },
  required: ["platform", "content", "keywords"],
};

export const analyzeLink = async (url: string): Promise<AnalyzedPost> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please configure it in the project settings or .env file.");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const expectedId = url.match(/\d{15,}/)?.[0];
    const prompt = `Analyze the following social media link: ${url}. 
    
    TASK:
    **STEP 1:** Search for the Quoted ID: "${expectedId}".
    **STEP 2:** Search for "site:fxtwitter.com ${expectedId}" and "site:vxtwitter.com ${expectedId}" (These are metadata proxies).
    **STEP 3:** Search for "site:twitter.com ${expectedId}" or "nitter ${expectedId}".
    **STEP 4 (Fallback):** Search for "${url.split('/')[3] || 'User'} latest tweet".

    **OUTPUT RULES:**
    1. Identify the **Source URL** where you found the content.
    2. Extract the content.
    3. Return the keywords.
    
    **ANTI-HALLUCINATION RULES:**
    - Twitter/X results often show "Pinned Tweets" or "More tweets" if the main one is login-walled.
    - **DO NOT** extract text from "Pinned Tweet", "More to explore", or unrelated sidebars.
    - If the main tweet text is hidden, return "Content unavailable" (so we can try the fallback).
    - **VERIFY THE DATE**: If the post text is from years ago (e.g. 2012) but the Link ID is new (19 digits starts with 18 or 20), it is WRONG. Rejects it.
    
    Output JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            platform: { type: Type.STRING },
            content: { type: Type.STRING },
            keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            sourceUrl: { type: Type.STRING, description: "The specific URL of the search result where the content was found." }
          },
          required: ["platform", "content", "keywords"]
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini.");

    const data = JSON.parse(text);

    // Strict Code-Level Verification via Source Link
    let finalContent = data.content;
    const foundStatusId = data.sourceUrl?.match(/\d{15,}/)?.[0];

    if (expectedId) {
      if (foundStatusId === expectedId) {
        finalContent = `✅ [Verified]: ${finalContent}`;
      } else if (foundStatusId && foundStatusId !== expectedId) {
        // AI found a page with a different Status ID -> Wrong Tweet
        finalContent = `⚠️ [Approximation - Wrong ID]: ${finalContent}`;
      } else {
        // Source URL doesn't have an ID (e.g. user profile, generic page)
        // or AI didn't provide a URL.
        if (!finalContent.includes("Approximation")) {
          finalContent = `⚠️ [Likely Latest Post]: ${finalContent}`;
        }
      }
    }

    return {
      platform: data.platform || "Unknown",
      content: finalContent || "Could not extract content.",
      keywords: data.keywords || [],
      originalLink: url,
    };
  } catch (error: any) {
    console.error("Gemini analysis error:", error);
    // Improve error messaging
    const msg = error.message || "Failed to analyze the link.";
    throw new Error(msg);
  }
};
