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
    
    **STEP 2 (Fallback):** Use the 'detective' strategy searching for the unique status ID (numbers) from the URL.
    
    **CRITICAL VERIFICATION**:
    - You MUST verify that the content you find belongs to the **Exact Status ID** "${url.match(/\d{15,}/)?.[0] || 'ID'}".
    - Do NOT return a random post from the same user just because the topic feels similar.
    - Do NOT return a pinned tweet or a recent top tweet if the IDs do not match.
    
    **OUTPUT RULES:**
    1. **Exact Match**: If you find content explicitly linked to this Status ID, return it.
    2. **Approximation**: If you find a search result that mentions "Status ${url.match(/\d{15,}/)?.[0] || '...'}", use it with "⚠️ [Approximation]: ".
    3. **Failure**: If you cannot match the ID, return: "Content unavailable (ID verification failed)."
       
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
