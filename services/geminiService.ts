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
    **STEP 1 (Primary):** Search for the exact URL provided.
    - If the search result snippet contains the post text, extract it immediately.
    
    **STEP 2 (Fallback):** If Step 1 returns generic info, use the 'detective' strategy:
    - Search for the unique status ID (numbers) from the URL + "twitter" or "x.com" or platform name.
    - Search for "nitter" + the status ID.
    - Search for the username + "latest posts" to see if this one appears in recent cache.
    
    **GOAL: Extract the content.**
    
    **OUTPUT RULES:**
    1. **Exact Match**: If you find the verbatim text, return it as strictly the content.
    2. **Approximation**: If you can only find snippets/references (e.g., "User X posted about Bitcoin price..."), 
       you MUST prefix the content with: "⚠️ [Approximation]: " followed by the best reconstruction you can make.
    3. **Failure**: Only return "Content unavailable" if you strictly cannot find *anything* related to this specific post ID/Topic.
       
    **CONSTRAINT**:
    - Do NOT make up a generic bio.
    - Do NOT hallucinate quotes.
       
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
