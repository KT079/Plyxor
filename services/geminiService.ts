import { GoogleGenAI } from "@google/genai";

// Initialize Gemini Client
// Note: In a real production app, you would handle this more securely, usually via a backend proxy.
// The API key must be obtained exclusively from the environment variable process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const translateMessage = async (text: string, targetLanguage: string): Promise<string> => {
  try {
    const prompt = `Translate the following informal chat message into ${targetLanguage}. Keep the tone and slang if possible: "${text}"`;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || text;
  } catch (error) {
    console.error("Translation error", error);
    return text;
  }
};