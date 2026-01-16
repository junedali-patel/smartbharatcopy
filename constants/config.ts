// Hardcoded Gemini API key for Smart Bharat app
export const GEMINI_API_KEY = 'AIzaSyATFG-N_HT4IFm8SHGLnlAFtH_7fzqB_j0';

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

// Base URL of the FastAPI backend serving the local plant disease model.
// For web/localhost development, use localhost:8000
// For real devices/mobile, replace with your PC's LAN IP (e.g., 192.168.1.X:8000)
export const BACKEND_BASE_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? 'http://localhost:8000' 
  : 'http://192.168.1.3:8000';