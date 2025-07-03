import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_API_KEY, isGeminiAvailable } from '../constants/config';
import * as Permissions from 'expo-permissions';
import { Alert, Platform } from 'react-native';
import * as Speech from 'expo-speech';
import Voice from '@react-native-voice/voice';

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
      const { status } = await Permissions.askAsync(Permissions.AUDIO_RECORDING);
      this.hasPermission = status === 'granted';
      if (!this.hasPermission) {
        Alert.alert('Permission Denied', 'Microphone access is required for voice features.');
      }
    } catch (err) {
      console.error('Permission error:', err);
    }
  }

  private initializeWebSpeech() {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      this.recognition = new (window as any).webkitSpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.onSpeechResultCallback?.(transcript);
      };

      this.recognition.onerror = (event: any) => console.error('Web speech error:', event.error);
      this.recognition.onend = () => {
        this.isListening = false;
        this.onSpeechEndCallback?.();
      };
    }
  }

  private initializeVoice() {
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
          await Voice.start('en-US');
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
          await Voice.stop();
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

      // Set language based on detection
      let language = 'en-US';
      if (isHindi || isMarathi) language = 'hi-IN';
      else if (isTamil) language = 'ta-IN';
      else if (isTelugu) language = 'te-IN';
      else if (isKannada) language = 'kn-IN';
      else if (isMalayalam) language = 'ml-IN';
      else if (isBengali) language = 'bn-IN';
      else if (isPunjabi) language = 'pa-IN';
      else if (isOdia) language = 'or-IN';

        await Speech.speak(text, {
        language: language,
          pitch: 1.0,
          rate: 0.9,
        });
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

      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
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
}

export default VoiceService; 