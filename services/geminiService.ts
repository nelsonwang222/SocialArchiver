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
    const userHandle = url.split('/')[3] || 'unknown';

    // 1. Proxy URLs (Best for fresh content metadata)
    const fxtwitter = `fxtwitter.com/${userHandle}/status/${expectedId}`;
    const vxtwitter = `vxtwitter.com/${userHandle}/status/${expectedId}`;

    // 2. Archive URLs (Best for deleted/old content)
    const wayback = `web.archive.org/web/*/twitter.com/${userHandle}/status/${expectedId}`;
    const archiveIs = `archive.is/twitter.com/${userHandle}/status/${expectedId}`;

    const prompt = `Analyze the following social media link: ${url}.
    
    TARGET ID: ${expectedId}
    
    TASK:
    1. Search for these specific PROXY URLs (they often contain the text in snippet):
       - "${fxtwitter}"
       - "${vxtwitter}"
    2. Search for ARCHIVE versions:
       - "${wayback}"
       - "${archiveIs}"
    3. Search for the official URL: "site:twitter.com ${expectedId}"
    4. **BROAD SEARCH**: Search for "${userHandle}" AND "${expectedId}" to find external citations (news, blogs, forums).
    
    **CRITICAL EXTRACTION RULES**:
    - The content MUST belong to the ID **${expectedId}**.
    - If you find a result for "fxtwitter" or "vxtwitter", the snippet text is likely the correct content.
    - If you find a result from "archive.org" or "archive.is" matching this ID, extract the text.
    - If you find a news article citing "Tweet ${expectedId}", extract the quoted text.
    - **VERIFY**: Does the snippet text match the context of the user/date? (e.g. don't return an Obama tweet for a 2025 ID).
    - If NO result explicitly links this ID to specific text, return "Content unavailable".
    
    Return the result in JSON format.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp", // Updated to a valid model if needed, or keep previous
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from Gemini.");
    }

    const data = JSON.parse(text);

    return {
      platform: data.platform || "Unknown",
      content: data.content || "Could not extract content.",
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
