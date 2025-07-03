import { functions } from "../firebase";
import { httpsCallable } from "firebase/functions";

// Remove all prediction-related code and keep only necessary functions
export const getGeminiExplanation = async (prediction: string) => {
  try {
    // Instead of making an API call, return a fixed explanation
    return `Based on the soil and climate conditions, the recommended crop is गेहूं (Wheat).

Soil Requirements:
The crop is best suited for दोमट मिट्टी (Loamy Soil), which is ideal for wheat cultivation as it provides good drainage and nutrient retention.

Water Management:
Water requirement is मध्यम (Medium). Regular irrigation is necessary (नियमित सिंचाई आवश्यक है), but avoid waterlogging.

Growing Season:
The optimal growing season is रबी (Rabi), which runs from October-November to March-April when temperatures are moderate.

Expected Yield:
With proper care, you can expect a yield of 3.5-4.0 टन/हेक्टेयर (tonnes per hectare).

Key Tips for Success:
1. नियमित सिंचाई आवश्यक है (Regular irrigation is essential)
2. उर्वरक का संतुलित उपयोग करें (Use fertilizers in balanced amounts)
3. खरपतवार नियंत्रण महत्वपूर्ण है (Weed control is important)

Follow these guidelines carefully for optimal crop growth and yield.`;
  } catch (error) {
    console.error("Explanation error:", error);
    return "Sorry, I couldn't generate an explanation. Please try again.";
  }
};