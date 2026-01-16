import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_API_KEY, isGeminiAvailable, getGeminiModel } from '../constants/config';
import { Alert, Platform } from 'react-native';
import * as Speech from 'expo-speech';

// Conditionally import Voice only on non-web platforms
let Voice: any = null;
if (Platform.OS !== 'web') {
  try {
    Voice = require('@react-native-voice/voice').default;
  } catch (error) {
    console.warn('Voice module not available:', error);
  }
}

type SpeechResultCallback = (text: string) => void;
type SpeechEndCallback = () => void;

const genAI = isGeminiAvailable() ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

class VoiceService {
  private static instance: VoiceService;
  private hasPermission = false;
  private isListening = false;
  private isTTSAvailable = true;
  private recognition: any = null;
  private genAI: GoogleGenerativeAI | null = null;
  private onSpeechResultCallback: SpeechResultCallback | null = null;
  private onSpeechEndCallback: SpeechEndCallback | null = null;
  private currentLanguage = 'en-US';

  private constructor() {
    this.init();
  }

  private async init() {
    await this.checkPermissions();
    this.initializeTTS();
    if (Platform.OS === 'web') {
      this.initializeWebSpeech();
    } else {
      this.initializeVoice();
    }
    if (isGeminiAvailable()) {
      this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    }
  }

  public static getInstance(): VoiceService {
    if (!VoiceService.instance) {
      VoiceService.instance = new VoiceService();
    }
    return VoiceService.instance;
  }

  private async checkPermissions() {
      if (Platform.OS === 'web') {
        this.hasPermission = true;
        return;
      }
    try {
      // For native platforms, assume permission is granted or handle via request
      // expo-permissions is deprecated, permissions now handled at manifest/runtime level
      this.hasPermission = true;
    } catch (err) {
      console.error('Permission error:', err);
      this.hasPermission = false;
    }
  }

  private initializeWebSpeech() {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      this.recognition = new (window as any).webkitSpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        if (finalTranscript) {
          this.onSpeechResultCallback?.(finalTranscript);
        }
      };

      this.recognition.onerror = (event: any) => console.error('Web speech error:', event.error);
      this.recognition.onend = () => {
        this.isListening = false;
        this.onSpeechEndCallback?.();
      };
    }
  }

  private initializeVoice() {
    if (!Voice) {
      console.warn('Voice module not available on this platform');
      return;
    }
    Voice.onSpeechResults = (e) => {
      const text = e.value?.[0] || '';
      this.onSpeechResultCallback?.(text);
    };
    Voice.onSpeechError = (e) => console.error('Voice error:', e);
    Voice.onSpeechStart = () => (this.isListening = true);
    Voice.onSpeechEnd = () => {
      this.isListening = false;
      this.onSpeechEndCallback?.();
    };
  }

  private async initializeTTS() {
    try {
      if (Platform.OS === 'web') {
        this.isTTSAvailable = 'speechSynthesis' in window;
      } else {
        this.isTTSAvailable = true;
      }
    } catch (error) {
      console.error('TTS init error:', error);
      this.isTTSAvailable = false;
    }
  }

  public setOnSpeechResult(callback: SpeechResultCallback | null) {
    this.onSpeechResultCallback = callback;
  }

  public setOnSpeechEnd(callback: SpeechEndCallback | null) {
    this.onSpeechEndCallback = callback;
  }

  public isVoiceListening() {
    return this.isListening;
  }

  public isTTSEnabled() {
    return this.isTTSAvailable;
  }

  public async startListening() {
    if (!this.hasPermission) {
      await this.checkPermissions();
      if (!this.hasPermission) return;
  }

    try {
      if (!this.isListening) {
        if (Platform.OS === 'web') {
          this.recognition?.start();
        } else {
          // Map language codes for mobile voice recognition
          const languageMap: { [key: string]: string } = {
            'hindi': 'hi-IN',
            'english': 'en-US',
            'kannada': 'kn-IN',
            'punjabi': 'pa-IN',
            'marathi': 'mr-IN',
            'gujarati': 'gu-IN',
            'bengali': 'bn-IN',
            'tamil': 'ta-IN',
            'telugu': 'te-IN',
            'malayalam': 'ml-IN',
            'odia': 'or-IN'
          };
          
          const langCode = languageMap[this.currentLanguage] || 'en-US';
          
          // Configure voice recognition for shorter silence timeout
          if (Voice) {
            await Voice.start(langCode, {
              EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 2000, // 2 seconds minimum
              EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 1500, // 1.5 seconds silence to end
              EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 1000, // 1 second for possible end
            });
          } else {
            throw new Error('Voice module not available');
          }
        }
        this.isListening = true;
      }
    } catch (err) {
      console.error('Start listen error:', err);
      this.isListening = false;
    }
  }

  public async stopListening() {
    try {
      if (this.isListening) {
        if (Platform.OS === 'web') {
          this.recognition?.stop();
        } else {
          if (Voice) {
            await Voice.stop();
          }
        }
        this.isListening = false;
      }
    } catch (err) {
      console.error('Stop listen error:', err);
    }
  }

  public async speak(text: string) {
    if (!this.isTTSAvailable) return;

    try {
      // Detect language from text
      const isHindi = /[\u0900-\u097F]/.test(text);
      const isMarathi = /[\u0900-\u097F]/.test(text); // Marathi uses Devanagari script
      const isTamil = /[\u0B80-\u0BFF]/.test(text);
      const isTelugu = /[\u0C00-\u0C7F]/.test(text);
      const isKannada = /[\u0C80-\u0CFF]/.test(text);
      const isMalayalam = /[\u0D00-\u0D7F]/.test(text);
      const isBengali = /[\u0980-\u09FF]/.test(text);
      const isPunjabi = /[\u0A00-\u0A7F]/.test(text);
      const isOdia = /[\u0B00-\u0B7F]/.test(text);

      console.log('Language detection:', {
        text: text.substring(0, 50) + '...',
        isHindi,
        isKannada,
        isTamil,
        isTelugu,
        isMalayalam,
        isBengali,
        isPunjabi,
        isOdia
      });

      // Set language based on detection
      let language = 'en-US';
      let rate = 1.2; // Faster speech rate
      let pitch = 1.0;
      
      if (isHindi || isMarathi) {
        language = 'hi-IN';
        rate = 1.1; // Slightly faster for Hindi
        pitch = 1.0;
      } else if (isTamil) {
        language = 'ta-IN';
        rate = 1.1;
        pitch = 1.0;
      } else if (isTelugu) {
        language = 'te-IN';
        rate = 1.1;
        pitch = 1.0;
      } else if (isKannada) {
        // Always use Hindi for Kannada
        language = 'hi-IN';
        rate = 1.1;
        pitch = 1.0;
        console.log('Kannada text detected, using Hindi voice:', language);
      } else if (isMalayalam) {
        language = 'ml-IN';
        rate = 1.1;
        pitch = 1.0;
      } else if (isBengali) {
        language = 'bn-IN';
        rate = 1.1;
        pitch = 1.0;
      } else if (isPunjabi) {
        language = 'pa-IN';
        rate = 1.1;
        pitch = 1.0;
      } else if (isOdia) {
        language = 'or-IN';
        rate = 1.1;
        pitch = 1.0;
      } else {
        // English - use better voice settings
        language = 'en-US';
        rate = 1.3; // Faster for English
        pitch = 1.1; // Slightly higher pitch for better quality
      }

      // Priority 1: Use web speech synthesis if available (better quality and language support)
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        console.log('Using web speech synthesis for language:', language);
        
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = language;
        utterance.rate = rate;
        utterance.pitch = pitch;
        
        // Try to find the best voice for the specific language
        const voices = window.speechSynthesis.getVoices();
        console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));
        
        let preferredVoice = voices.find(voice => 
          voice.lang === language || 
          voice.lang.startsWith(language.split('-')[0])
        );
        
        if (preferredVoice) {
          utterance.voice = preferredVoice;
          console.log('Using voice:', preferredVoice.name, 'for language:', language);
        } else {
          console.log('No specific voice found for language:', language, 'using default');
        }
        
        window.speechSynthesis.speak(utterance);
      } else {
        // Priority 2: Fallback to expo-speech for mobile platforms
        console.log('Using expo-speech for language:', language);
        
        await Speech.speak(text, {
          language: language,
          pitch: pitch,
          rate: rate,
        });
      }
    } catch (err) {
      console.error('Speak error:', err);
      this.isTTSAvailable = false;
    }
  }

  public async stop() {
    try {
      await Speech.stop();
    } catch (err) {
      console.error('Stop speech error:', err);
    }
  }

  public async processCommand(userInput: string): Promise<string> {
    try {
      if (!this.genAI || !isGeminiAvailable()) {
        return 'I apologize, but I am currently unable to assist you. Please try again later.';
      }

      const model = getGeminiModel(this.genAI);
      const prompt = `You are a friendly and knowledgeable agricultural assistant for Smart Bharat, designed to help Indian farmers. Your responses should be:

1. Natural and conversational - avoid robotic or formal language
2. Focused on agriculture, farming, and rural development
3. Helpful and practical - provide actionable advice when possible
4. Culturally aware - use appropriate greetings and terms
5. Multilingual - respond in the same language as the user's query

For non-agricultural topics:
- Acknowledge the topic briefly
- Politely redirect to farming-related subjects
- Suggest relevant agricultural topics they might be interested in

User's message: "${userInput}"

Remember:
- Keep responses concise but informative
- Use simple, clear language
- Include both English and Hindi terms when appropriate
- Maintain a warm, helpful tone
- If the user uses a greeting, respond naturally and guide them to agricultural topics`;

      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      console.error('Process command error:', err);
      return 'I apologize, but I encountered an error. Please try again.';
    }
  }

  // Method to set language for voice recognition
  public setLanguage(language: string) {
    if (Platform.OS === 'web' && this.recognition) {
      // Map language codes for web speech recognition
      const languageMap: { [key: string]: string } = {
        'hindi': 'hi-IN',
        'english': 'en-US',
        'kannada': 'kn-IN',
        'punjabi': 'pa-IN',
        'marathi': 'mr-IN',
        'gujarati': 'gu-IN',
        'bengali': 'bn-IN',
        'tamil': 'ta-IN',
        'telugu': 'te-IN',
        'malayalam': 'ml-IN',
        'odia': 'or-IN'
      };
      
      const langCode = languageMap[language] || 'en-US';
      this.recognition.lang = langCode;
    }
    this.currentLanguage = language;
  }

  // Method to use Google Cloud Text-to-Speech for better language support
  private async speakWithGoogleTTS(text: string, language: string, rate: number, pitch: number) {
    try {
      // This would require Google Cloud Text-to-Speech API key
      // For now, we'll implement the structure
      const response = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GOOGLE_CLOUD_API_KEY}` // You'd need to add this
        },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: language,
            name: language === 'kn-IN' ? 'kn-IN-Standard-A' : undefined
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: rate,
            pitch: pitch
          }
        })
      });
      
      if (response.ok) {
        const audioContent = await response.json();
        // Play the audio (would need additional implementation)
        console.log('Google TTS response received');
      }
    } catch (error) {
      console.error('Google TTS error:', error);
      // Fallback to regular speech
      await Speech.speak(text, { language, rate, pitch });
    }
  }

  // Method to get available voices (web only)
  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      return window.speechSynthesis.getVoices();
    }
    return [];
  }

  // Method to check if a specific language is supported
  public isLanguageSupported(languageCode: string): boolean {
    if (Platform.OS === 'web') {
      const voices = this.getAvailableVoices();
      return voices.some(voice => 
        voice.lang === languageCode || 
        voice.lang.startsWith(languageCode.split('-')[0])
      );
    }
    // For mobile, we'll assume basic support for common languages
    const supportedLanguages = ['en-US', 'hi-IN', 'kn-IN', 'ta-IN', 'te-IN', 'ml-IN', 'bn-IN', 'pa-IN', 'mr-IN', 'gu-IN'];
    return supportedLanguages.includes(languageCode);
  }

  // Method to get the best available voice for a language
  public getBestVoiceForLanguage(languageCode: string): SpeechSynthesisVoice | null {
    if (Platform.OS === 'web') {
      const voices = this.getAvailableVoices();
      // First try exact match
      let voice = voices.find(v => v.lang === languageCode);
      if (!voice) {
        // Then try language family match
        const langFamily = languageCode.split('-')[0];
        voice = voices.find(v => v.lang.startsWith(langFamily));
      }
      return voice || null;
    }
    return null;
  }

  // Method to get platform and TTS information
  public getTTSInfo() {
    const info = {
      platform: Platform.OS,
      isWeb: Platform.OS === 'web',
      hasWebSpeech: Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window,
      hasExpoSpeech: this.isTTSAvailable,
      availableVoices: Platform.OS === 'web' ? this.getAvailableVoices().length : 'N/A (mobile)',
      currentLanguage: this.currentLanguage
    };
    
    console.log('TTS Info:', info);
    return info;
  }

  // Method to test speech synthesis for a specific language
  public async testSpeech(language: string, text: string = 'Hello') {
    try {
      console.log(`Testing speech for language: ${language}`);
      
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(v => v.lang === language || v.lang.startsWith(language.split('-')[0]));
        
        if (voice) {
          console.log(`Found voice: ${voice.name} for ${language}`);
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = language;
          utterance.voice = voice;
          utterance.rate = 1.2;
          window.speechSynthesis.speak(utterance);
        } else {
          console.log(`No voice found for ${language}`);
        }
      } else {
        console.log('Testing with expo-speech');
        await Speech.speak(text, { language, rate: 1.2 });
      }
    } catch (error) {
      console.error('Test speech error:', error);
    }
  }

  // Method to test Kannada speech specifically
  public async testKannadaSpeech(text: string = 'ನಮಸ್ಕಾರ! ನಾನು ಸ್ಮಾರ್ಟ್ ಭಾರತ') {
    console.log('=== Testing Kannada Speech with Hindi Voice ===');
    console.log('Text:', text);
    
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        console.log('All available voices:', voices.map(v => `${v.name} (${v.lang})`));
        
        // Always use Hindi voice for Kannada
        const hindiVoices = voices.filter(v => v.lang === 'hi-IN' || v.lang.startsWith('hi'));
        
        console.log('Hindi voices found:', hindiVoices.length);
        
        if (hindiVoices.length > 0) {
          console.log('Using Hindi voice for Kannada:', hindiVoices[0].name);
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'hi-IN';
          utterance.voice = hindiVoices[0];
          utterance.rate = 1.1;
          window.speechSynthesis.speak(utterance);
        } else {
          console.log('No Hindi voice found, using default');
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'hi-IN';
          utterance.rate = 1.1;
          window.speechSynthesis.speak(utterance);
        }
        
      } else {
        // Mobile fallback - always use Hindi for Kannada
        console.log('Testing Kannada on mobile with Hindi voice');
        await Speech.speak(text, { language: 'hi-IN', rate: 1.1 });
      }
    } catch (error) {
      console.error('Kannada test failed:', error);
    }
  }

  // Method to get detailed voice information
  public getVoiceInfo() {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const voices = window.speechSynthesis.getVoices();
      const voiceInfo = {
        totalVoices: voices.length,
        hindiVoices: voices.filter(v => v.lang === 'hi-IN' || v.lang.startsWith('hi')),
        kannadaVoices: voices.filter(v => v.lang === 'kn-IN' || v.lang.startsWith('kn')),
        indianVoices: voices.filter(v => v.lang.includes('IN')),
        allVoices: voices.map(v => ({ name: v.name, lang: v.lang, default: v.default }))
      };
      
      console.log('Voice Information:', voiceInfo);
      console.log('Note: Kannada text will use Hindi voice');
      return voiceInfo;
    }
    return null;
  }
}

export default VoiceService; 