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
    const userHandle = url.split('/')[3];

    // Construct proxy URLs which often expose metadata to search
    const fxtwitter = `fxtwitter.com/${userHandle}/status/${expectedId}`;
    const vxtwitter = `vxtwitter.com/${userHandle}/status/${expectedId}`;

    const prompt = `Analyze the following social media link: ${url}.
    
    TARGET ID: ${expectedId}
    
    TASK:
    1. Search for these specific proxy URLs which contain the accurate text in their metadata:
       - "${fxtwitter}"
       - "${vxtwitter}"
    2. Also search for "site:twitter.com ${expectedId}".
    
    **CRITICAL EXTRACTION RULES**:
    - The search result must explicitly reference the ID **${expectedId}**.
    - If you find a result for "${fxtwitter}" or "${vxtwitter}", the text in the snippet is the CORRECT content. Extract it.
    - If you find a result for a DIFFERENT ID (e.g. 1900...), IGNORE IT. It is a hallucination.
    - If you cannot find a result with ID ${expectedId}, return "Content unavailable".
    
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
