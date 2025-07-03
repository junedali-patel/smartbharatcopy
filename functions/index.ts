import * as functions from "firebase-functions";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Define types for the function parameters
interface GeminiExplainData {
  prediction: string;
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const geminiExplain = functions.https.onCall(async (data: GeminiExplainData, context: functions.https.CallableContext) => {
  if (!data.prediction) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Prediction data is required"
    );
  }

  const prediction = data.prediction;
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `You are an agricultural expert assistant. A farmer has received a crop prediction: "${prediction}".
    
    Please explain this prediction in simple, farmer-friendly terms. Your response should:
    1. Use clear, non-technical language
    2. Explain why this crop might be suitable
    3. Include basic care instructions
    4. Mention potential challenges
    5. Suggest some best practices
    
    Keep the response concise and easy to understand. Use a mix of Hindi and English if appropriate.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API error:", error);
    if (error instanceof Error) {
      throw new functions.https.HttpsError(
        "internal",
        `Failed to generate explanation: ${error.message}`
      );
    }
    throw new functions.https.HttpsError(
      "internal",
      "Failed to generate explanation"
    );
  }
});