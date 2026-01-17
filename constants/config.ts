// Hardcoded Gemini API key for Smart Bharat app
export const GEMINI_API_KEY = 'AIzaSyDaLIkmG8V1E1synWS1xkD_bCy8eni7Wj4';

// List of Gemini models to try in order (fallback chain)
export const GEMINI_MODELS = [
  'gemini-3-flash-preview',
  'gemini-2.0-flash',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-pro',
];

export const isGeminiAvailable = () => {
  return !!GEMINI_API_KEY;
};

// Helper function to get a working Gemini model with fallback support
export const getGeminiModel = (genAI: any) => {
  if (!genAI) return null;
  
  // Try models in order, return the first one available
  for (const modelName of GEMINI_MODELS) {
    try {
      return genAI.getGenerativeModel({ model: modelName });
    } catch (error) {
      console.warn(`Model ${modelName} not available, trying next...`);
      continue;
    }
  }
  
  // Fallback to first model if all fail
  console.warn('No models available, using default gemini-1.5-pro');
  return genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
};

// FastAPI Backend Configuration
// Make sure your FastAPI backend is running with:
// uvicorn main:app --host 0.0.0.0 --port 8000
// Replace 192.168.1.X with your PC's actual LAN IP address
export const BACKEND_BASE_URL = 'http://10.1.44.253:8000'; // Change to your PC's LAN IP