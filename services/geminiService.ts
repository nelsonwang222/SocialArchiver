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
    **STEP 2:** Search for "site:twitter.com ${expectedId}" and "nitter ${expectedId}".
    **STEP 3 (Fallback):** Search for "${url.split('/')[3] || 'User'} latest tweet".

    **OUTPUT RULES:**
    1. If you found a result with the EXACT ID "${expectedId}", set "foundStatusId" to matches.
    2. If you found a "Latest Post" without the exact ID, do NOT set "foundStatusId".
    3. Return the content you found.
    
    Output JSON with field "foundStatusId" (string) ONLY if verified.`;

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
            foundStatusId: { type: Type.STRING, description: "The exact Status ID found in the source snippet/URL. Leave empty if not found." }
          },
          required: ["platform", "content", "keywords"]
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini.");

    const data = JSON.parse(text);

    // Strict Code-Level Verification
    let finalContent = data.content;

    if (expectedId) {
      if (data.foundStatusId === expectedId) {
        finalContent = `✅ [Verified]: ${finalContent}`;
      } else if (data.foundStatusId && data.foundStatusId !== expectedId) {
        // AI found a DIFFERENT ID -> Hallucination regarding the target.
        finalContent = `⚠️ [Approximation - Wrong ID]: ${finalContent}`;
      } else {
        // No ID found -> Likely a guess or latest tweet
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
      foundStatusId: data.foundStatusId
    };
  } catch (error: any) {
    console.error("Gemini analysis error:", error);
    // Improve error messaging
    const msg = error.message || "Failed to analyze the link.";
    throw new Error(msg);
  }
};
