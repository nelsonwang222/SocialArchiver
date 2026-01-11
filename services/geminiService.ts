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
    const prompt = `Analyze the following social media link: ${url}. 
    
    TASK:
    **STEP 1:** Search for the Quoted ID: "${url.match(/\d{15,}/)?.[0]}".
    **STEP 2:** Search for "site:twitter.com ${url.match(/\d{15,}/)?.[0]}" and "nitter ${url.match(/\d{15,}/)?.[0]}".
    
    **STEP 3 (Fallback for New Posts):** 
    - If ID search fails, search for: "${url.split('/')[3] || 'User'} latest tweet".
    - Look for results dated "mins ago", "hours ago", or "today".
    
    **OUTPUT RULES:**
    1. **Verified**: If you found the EXACT ID, return content with "✅ [Verified]: ".
    2. **Latest Post Guess**: If you didn't find the ID but found a very recent post (e.g., "posted 1 hour ago") from this user that seems to match the context of a new link, return it with "⚠️ [Likely Latest Post]: ".
    3. **Failure**: Return "Content unavailable (ID not found)" only if both fail.
    
    **CONSTRAINT**:
    - Do NOT return content older than 2 days for the "Latest Post" fallback.
    - Do NOT return the user's bio.
    
    Generate 3-7 relevant keywords.
    
    Return the result in JSON format.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
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
