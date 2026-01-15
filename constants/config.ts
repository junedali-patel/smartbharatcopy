export const GEMINI_API_KEY = 'AIzaSyBlfOPGjxA_vF-smaFGhqj1eo8ChK67jgU';

export const isGeminiAvailable = () => {
  return !!GEMINI_API_KEY;
};

// Base URL of the FastAPI backend serving the local plant disease model.
// For web/localhost development, use localhost:8000
// For real devices/mobile, replace with your PC's LAN IP (e.g., 192.168.1.X:8000)
export const BACKEND_BASE_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? 'http://localhost:8000' 
  : 'http://192.168.1.3:8000';