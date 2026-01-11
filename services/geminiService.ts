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
    TARGET USER: ${userHandle}
    
    TASK:
    1. **PRIMARY SEARCH**: Search for "${userHandle} ${expectedId}".
       - Also try: "${userHandle}" "${expectedId}" (quoted).
    2. Search Proxy URLs: "${fxtwitter}" and "${vxtwitter}".
    3. Search Archive URLs: "${wayback}" and "${archiveIs}".
    4. **BROAD ID SEARCH**: Search for the ID "${expectedId}" alone.
    
    **CRITICAL EXTRACTION RULES**:
    - **Snippet/Title Match**: If a search result Title or Snippet contains the ID "${expectedId}" (or a close match), TRUST the text associated with it.
    - **External Citations**: If you find the ID in a news article, blog, or secondary site (like "note.com"), EXTRACT the summary of the tweet from that page.
    - **Contextual Verification**: If the search finding mentions the **User** ("${userHandle}") and **Content** related to the ID, EXTRACT IT. 
    - **Generalization**: This applies to ANY user (e.g. politics, tech, crypto). Trust the search result if it links the ID to text.
    - **DO NOT** require the User Handle and ID to be right next to each other in the snippet. As long as they are in the same result context, it is valid.
    
    If you find the content, output it. If absolutely nothing matches the ID, return "Content unavailable".
    
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
