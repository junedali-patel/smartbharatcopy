import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { Audio } from 'expo-av';
import { collection, getDocs } from 'firebase/firestore';
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, Linking, Platform, Modal, TextInput, KeyboardAvoidingView, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColor } from '../../hooks/useThemeColor';
import { db } from '../../config/firebase'; // Import db from firebase config
import VoiceService from '../../services/VoiceService';
import { GEMINI_API_KEY, isGeminiAvailable } from '../../constants/config';
import CropDiseaseModal from '../../components/CropDiseaseModal';
import TaskService, { Task } from '../../services/taskService';
import SchemeService from '../../services/schemeService';

type TabRoute = '/' | '/schemes' | '/explore' | '/tasks' | '/profile';

// Initialize Gemini API
const genAI = isGeminiAvailable() ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Add Web Speech API type definitions
// first ever change --junedali
// second change - sapala vishay
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
    recognition?: SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

interface NewsItem {
  title: string;
  description: string;
  url: string;
  urlToImage: string;
  publishedAt: string;
}

interface ChatMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface ChatSession {
  sendMessage: (message: string) => Promise<{ response: { text: () => string } }>;
}

const NewsSection = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const accentColor = useThemeColor({ light: '#2E7D32', dark: '#2E7D32' }, 'tint');
  const textColor = useThemeColor({ light: '#333333', dark: '#333333' }, 'text');

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const apiKey = '0ba0ad111fe34dab9d1827fbf12428b3';
        // Updated query to get agriculture-related news from India
        const response = await fetch(
          `https://newsapi.org/v2/everything?q=agriculture farming india&language=en&sortBy=publishedAt&pageSize=7&apiKey=${apiKey}`
        );
        const data = await response.json();
        if (data.articles) {
          // Filter for agriculture-related news and Indian sources
          const filteredNews = data.articles.filter((article: any) => {
            const title = article.title?.toLowerCase() || '';
            const description = article.description?.toLowerCase() || '';
            const content = article.content?.toLowerCase() || '';
            
            // Keywords related to agriculture and farming
            const agricultureKeywords = [
              'agriculture', 'farming', 'farmer', 'crop', 'harvest', 'irrigation',
              'fertilizer', 'pesticide', 'soil', 'seed', 'agricultural', 'kisan',
              'krishi', 'mandi', 'yojana', 'scheme', 'subsidy', 'loan', 'pm kisan',
              'agricultural policy', 'rural development', 'farm', 'plantation'
            ];
            
            // Check if article contains agriculture-related keywords
            const hasAgricultureContent = agricultureKeywords.some(keyword => 
              title.includes(keyword) || description.includes(keyword) || content.includes(keyword)
            );
            
            // Check if source is from India (common Indian news sources)
            const indianSources = [
              'timesofindia', 'hindustantimes', 'thehindu', 'indianexpress',
              'ndtv', 'zeenews', 'news18', 'moneycontrol', 'livemint',
              'business-standard', 'financialexpress', 'economic times'
            ];
            
            const source = article.source?.name?.toLowerCase() || '';
            const url = article.url?.toLowerCase() || '';
            const isIndianSource = indianSources.some(indianSource => 
              source.includes(indianSource) || url.includes(indianSource)
            );
            
            return hasAgricultureContent || isIndianSource;
          });
          
          setNews(filteredNews.slice(0, 7)); // Get top 7 filtered news items
        }
      } catch (error) {
        console.error('Error fetching news:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  const handleNewsPress = (url: string) => {
    Linking.openURL(url);
  };

  if (loading) {
    return (
      <View style={styles.newsContainer}>
        <ActivityIndicator size="small" color={accentColor} />
      </View>
    );
  }

  return (
    <View style={styles.newsContainer}>
      <Text style={[styles.sectionTitle, { color: textColor }]}>Latest Farming News</Text>
      {news.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={[styles.newsCard, { backgroundColor: '#ffffff', borderColor: '#e0e0e0' }]}
          onPress={() => handleNewsPress(item.url)}
        >
          {item.urlToImage && (
            <Image
              source={{ uri: item.urlToImage }}
              style={styles.newsImage}
              resizeMode="cover"
            />
          )}
          <View style={styles.newsContent}>
            <Text style={[styles.newsTitle, { color: textColor }]} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={[styles.newsDescription, { color: textColor }]} numberOfLines={2}>
              {item.description}
            </Text>
            <Text style={styles.newsDate}>
              {new Date(item.publishedAt).toLocaleDateString()}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// Add the business info constant
const businessInfo = `You are a friendly and knowledgeable agricultural assistant for Smart Bharat, designed to help Indian farmers. Your responses should be:

1. Natural and conversational - avoid robotic or formal language
2. Focused on agriculture, farming, and rural development
3. Helpful and practical - provide actionable advice when possible
4. Culturally aware - use appropriate greetings and terms
5. IMPORTANT: Respond in the same language as the user's input
6. Keep responses concise - maximum 2-3 sentences for simple questions
7. CRITICAL: Maintain exact context from previous messages
8. For follow-up questions like "Adhik Jankari dijiye", provide more details about the EXACT SAME topic as the last message
9. NEVER switch topics unless explicitly asked
10. If the last message was about a specific topic (like loans, schemes, crops), continue discussing that SAME topic

Tone Instructions:
Conciseness: Respond in short, informative sentences.
Formality: Use polite language with slight formality.
Clarity: Avoid technical jargon unless necessary.
Consistency: Ensure responses are aligned in tone and style across all queries.
Example: "Thank you for reaching out! Please let us know if you need further assistance."`;

export default function HomeScreen() {
  const [isAssistantVisible, setAssistantVisible] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [assistantResponse, setAssistantResponse] = useState('');
  const [buttonPressed, setButtonPressed] = useState(null);
  const [isWeatherModalVisible, setWeatherModalVisible] = useState(false);
  const [isCropModalVisible, setCropModalVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const voiceService = useRef<VoiceService | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceAvailable, setIsVoiceAvailable] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatSession, setChatSession] = useState<ChatSession | null>(null);
  const [currentContext, setCurrentContext] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState('hindi');
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasIntroduced, setHasIntroduced] = useState(false);
  const taskService = TaskService.getInstance(); // Initialize task service

  const languages = [
    { code: 'hindi', name: 'हिंदी', greeting: 'नमस्ते' },
    { code: 'english', name: 'English', greeting: 'Hello' },
    { code: 'kannada', name: 'ಕನ್ನಡ', greeting: 'ನಮಸ್ಕಾರ' },
    { code: 'punjabi', name: 'ਪੰਜਾਬੀ', greeting: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ' },
    { code: 'marathi', name: 'मराठी', greeting: 'नमस्कार' },
    { code: 'gujarati', name: 'ગુજરાતી', greeting: 'નમસ્તે' },
    { code: 'bengali', name: 'বাংলা', greeting: 'নমস্কার' },
  ];

  const handleAssistantVisibility = (visible: boolean) => {
    if (!visible && isListening) {
      voiceService.current?.stopListening();
      setIsListening(false);
    }
    setAssistantVisible(visible);
  };

  // Use white background for all layouts
  const backgroundColor = '#ffffff';
  const cardBackground = '#ffffff';
  const textColor = useThemeColor({ light: '#333333', dark: '#333333' }, 'text');
  const secondaryTextColor = useThemeColor({ light: '#666', dark: '#666' }, 'text');
  const accentColor = useThemeColor({ light: '#2E7D32', dark: '#2E7D32' }, 'tint');
  const borderColor = '#e0e0e0';

  const quickActions = [
    { id: '1', title: 'Apply for Scheme', icon: 'gift' as const, color: '#FF9500', route: '/schemes' as TabRoute },
    { id: '2', title: 'Check Status', icon: 'search' as const, color: '#34C759', route: '/schemes' as TabRoute },
    { id: '4', title: 'Voice Assistant', icon: 'microphone' as const, color: '#FF3B30', route: '/tasks' as TabRoute },
  ];

  const recentSchemes = [
    { id: '1', title: 'Pradhan Mantri Awas Yojana', status: 'Applied', progress: 75 },
    { id: '2', title: 'Ayushman Bharat', status: 'In Progress', progress: 30 },
  ];

  useEffect(() => {
    voiceService.current = VoiceService.getInstance();

    // Set up speech result callback with language awareness
    voiceService.current.setOnSpeechResult((text: string) => {
      setTranscript(text);
      setCurrentTranscript(text);
      // Pass the selected language to processCommand
      processCommand(text, selectedLanguage);
    });

    // Set up speech end callback
    voiceService.current.setOnSpeechEnd(() => {
      setIsListening(false);
    });

    return () => {
      // Clean up
      if (voiceService.current) {
        voiceService.current.setOnSpeechResult(null);
        voiceService.current.setOnSpeechEnd(null);
      }
    };
  }, [selectedLanguage]); // Add selectedLanguage as dependency

  const handleMicPress = async () => {
    try {
      if (isListening) {
        await voiceService.current?.stopListening();
        setIsListening(false);
      } else {
        setTranscript('');
        setCurrentTranscript('');
        // Set language for voice recognition
        voiceService.current?.setLanguage(selectedLanguage);
        await voiceService.current?.startListening();
        setIsListening(true);
      }
    } catch (error) {
      console.error('Error toggling voice input:', error);
      setError('Failed to access microphone. Please check permissions.');
      setIsListening(false);
    }
  };

  // Add manual stop function
  const handleStopRecording = async () => {
    try {
      if (isListening) {
        await voiceService.current?.stopListening();
        setIsListening(false);
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };

  const toggleMute = async () => {
    try {
      if (isMuted) {
        // Unmute - speak the current response if there is one
        if (assistantResponse && voiceService.current) {
          await voiceService.current.speak(assistantResponse);
        }
      } else {
        // Mute - stop any ongoing speech
        if (voiceService.current) {
          await voiceService.current.stop();
        }
      }
      setIsMuted(!isMuted);
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  };

  const handleActionPress = (route: TabRoute) => {
    router.push(route);
  };

  const getGeminiResponse = async (prompt: string) => {
    try {
      if (!genAI) {
        throw new Error('Gemini API is not available');
      }

      // Check if this is a greeting and if we've already introduced
      const isGreeting = /^(नमस्ते|hello|hi|namaste|नमस्कार|ਸਤ ਸ੍ਰੀ ਅਕਾਲ|નમસ્તે|নমস্কার|ನಮಸ್ಕಾರ)/i.test(prompt.trim());
      
      // Set introduction flag if this is the first greeting
      if (isGreeting && !hasIntroduced) {
        setHasIntroduced(true);
      }

      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        systemInstruction: `You are a friendly and knowledgeable agricultural assistant for Smart Bharat, designed to help Indian farmers. Your responses should be:

1. Natural and conversational - avoid robotic or formal language
2. Focused on agriculture, farming, and rural development
3. Helpful and practical - provide actionable advice when possible
4. Culturally aware - use appropriate greetings and terms
5. CRITICAL: ALWAYS respond in ${selectedLanguage.toUpperCase()} for ALL queries
6. Keep responses concise - maximum 2-3 sentences for simple questions
7. CRITICAL: Maintain exact context from previous messages for ALL types of queries
8. For ANY follow-up question, provide more details about the EXACT SAME topic as the last message
9. NEVER switch topics unless explicitly asked
10. If the last message was about ANY topic, continue discussing that SAME topic
11. CRITICAL: Remember the last topic discussed and maintain context throughout the conversation
12. For ANY follow-up question, first understand what specific aspect of the previous topic is being asked about

Task Handling Rules:
- If the user's message is a request to add a task, reminder, or todo (in any language), respond ONLY with __TASK__: followed by a clear, concise, and actionable task description in the same language as the user's message.
- Do NOT add any extra text, greetings, or explanations. Only output __TASK__: and the task description.
- The task description should be ready to be added to a task manager (e.g., "Water the crops tomorrow morning", "खेत में खाद डालना है", etc.)
- If the user's message is NOT a task, respond normally as per the other instructions.

Introduction Rules:
- ONLY introduce yourself on the VERY FIRST greeting of the conversation
- If user has already greeted you before in this conversation, DO NOT introduce yourself again
- If the conversation has history, continue naturally without introduction
- Introduction should be in the selected language
- Keep introduction short and clear
- Include your name (Smart Bharat) and main purpose
- Example introductions (ONLY for first greeting):
  ${selectedLanguage === 'hindi' ? `
  Hindi: "नमस्ते! मैं स्मार्ट भारत हूं, आपका कृषि सहायक। मैं किसानों को खेती, योजनाओं और कृषि से जुड़ी जानकारी देने में मदद करता हूं।"` : ''}
  ${selectedLanguage === 'marathi' ? `
  Marathi: "नमस्कार! मी स्मार्ट भारत आहे, तुमचा शेती सहाय्यक. मी शेतकऱ्यांना शेती, योजना आणि कृषी संबंधित माहिती देण्यात मदत करतो."` : ''}
  ${selectedLanguage === 'punjabi' ? `
  Punjabi: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਸਮਾਰਟ ਭਾਰਤ ਹਾਂ, ਤੁਹਾਡਾ ਖੇਤੀਬਾੜੀ ਸਹਾਇਕ. ਮੈਂ ਕਿਸਾਨਾਂ ਨੂੰ ਖੇਤੀਬਾੜੀ, ਯੋਜਨਾਵਾਂ ਅਤੇ ਖੇਤੀਬਾੜੀ ਸੰਬੰਧੀ ਜਾਣਕਾਰੀ ਦੇਣ ਵਿੱਚ ਮਦਦ ਕਰਦਾ ਹਾਂ."` : ''}
  ${selectedLanguage === 'gujarati' ? `
  Gujarati: "નમસ્તે! હું સ્માર્ટ ભારત છું, તમારો કૃષિ સહાયક. હું ખેડૂતોને ખેતી, યોજનાઓ અને કૃષિ સંબંધિત માહિતી આપવામાં મદਦ કરું છું."` : ''}
  ${selectedLanguage === 'bengali' ? `
  Bengali: "নমস্কার! আমি স্মার্ট ভারত, আপনার কৃষি সহায়ক. আমি কৃষকদের কৃষি, প্রকল্প এবং কৃষি সম্পর্কিত তথ্য প্রদান করতে সাহায্য করি."` : ''}
  ${selectedLanguage === 'english' ? `
  English: "Hello! I am Smart Bharat, your agricultural assistant. I help farmers with farming, schemes, and agricultural information."` : ''}
  ${selectedLanguage === 'kannada' ? `
  Kannada: "ನಮಸ್ಕಾರ! ನಾನು ಸ್ಮಾರ್ಟ್ ಭಾರತ, ನಿಮ್ಮ ಕೃಷಿ ಸಹಾಯಕ. ನಾನು ರೈತರಿಗೆ ಕೃಷಿ, ಯೋಜನೆಗಳು ಮತ್ತು ಕೃಷಿ ಸಂಬಂಧಿತ ಮಾಹಿತಿಯನ್ನು ನೀಡಲು ಸಹಾಯ ಮಾಡುತ್ತೇನೆ."` : ''}

Context Retention Rules:
- CRITICAL: ALWAYS maintain context from the previous message
- If the last message was about a scheme (like PM-KISAN), continue discussing that scheme
- If the last message was about crops, continue discussing those crops
- If the last message was about farming techniques, continue discussing those techniques
- If the last message was about weather, continue discussing weather
- If the last message was about equipment, continue discussing that equipment
- For ANY topic, remember the last discussed aspect and provide relevant follow-up information
- NEVER ask for clarification about the previous topic unless absolutely necessary
- ALWAYS assume the follow-up question is about the last discussed topic
- If user mentions their location (like "मैं कोल्हापुर में रहता हूं"), remember this context
- If user asks about specific crops (like "सोयाबीन"), continue discussing that crop
- If user mentions weather conditions, relate it to farming advice

Language Rules:
- CRITICAL: You MUST respond in ${selectedLanguage.toUpperCase()} ONLY
- NEVER mix languages in your response
- Use proper grammar and vocabulary for ${selectedLanguage}
- Use appropriate greetings for ${selectedLanguage}
- Use proper numerals and currency symbols for ${selectedLanguage}
- Use proper punctuation for ${selectedLanguage}
- NEVER use any other language unless absolutely necessary (like scheme names)

Language-Specific Instructions:
${selectedLanguage === 'hindi' ? `
For Hindi:
- Use proper Hindi grammar and vocabulary
- Use Hindi numerals (१, २, ३)
- Use Hindi currency symbol (₹)
- Use Hindi greetings (नमस्ते, प्रणाम)
- Use Hindi punctuation` : ''}
${selectedLanguage === 'marathi' ? `
For Marathi:
- Use proper Marathi grammar and vocabulary
- Use Marathi numerals (१, २, ३)
- Use Marathi currency symbol (₹)
- Use Marathi greetings (नमस्कार, राम राम)
- Use Marathi punctuation` : ''}
${selectedLanguage === 'punjabi' ? `
For Punjabi:
- Use proper Punjabi grammar and vocabulary
- Use Punjabi numerals (੧, ੨, ੩)
- Use Punjabi currency symbol (₹)
- Use Punjabi greetings (ਸਤ ਸ੍ਰੀ ਅਕਾਲ, ਫਿਰ ਮਿਲਾਂਗੇ)
- Use Punjabi punctuation` : ''}
${selectedLanguage === 'gujarati' ? `
For Gujarati:
- Use proper Gujarati grammar and vocabulary
- Use Gujarati numerals (૧, ૨, ૩)
- Use Gujarati currency symbol (₹)
- Use Gujarati greetings (નમસ્તે, રામ રામ)
- Use Gujarati punctuation` : ''}
${selectedLanguage === 'bengali' ? `
For Bengali:
- Use proper Bengali grammar and vocabulary
- Use Bengali numerals (১, ২, ৩)
- Use Bengali currency symbol (₹)
- Use Bengali greetings (নমস্কার, আসসালামু আলাইকুম)
- Use Bengali punctuation` : ''}
${selectedLanguage === 'english' ? `
For English:
- Use proper English grammar and vocabulary
- Use English numerals (1, 2, 3)
- Use English currency symbol ($)
- Use English greetings (Hello, Hi)
- Use English punctuation` : ''}
${selectedLanguage === 'kannada' ? `
For Kannada:
- Use proper Kannada grammar and vocabulary
- Use Kannada numerals (೧, ೨, ೩)
- Use Kannada currency symbol (₹)
- Use Kannada greetings (ನಮಸ್ಕಾರ, ರಾಮ ರಾಮ)
- Use Kannada punctuation` : ''}

Tone Instructions:
Conciseness: Respond in short, informative sentences.
Formality: Use polite language with slight formality.
Clarity: Avoid technical jargon unless necessary.
Consistency: Ensure responses are aligned in tone and style across all queries.`
      });
      
      // Add user message to chat history
      const userMessage: ChatMessage = {
        role: 'user',
        parts: [{ text: prompt }]
      };
      setChatHistory((prev: ChatMessage[]) => [...prev, userMessage]);

      // Create chat session with history
      const chat = model.startChat({
        history: chatHistory.map(msg => ({
          role: msg.role,
          parts: msg.parts
        }))
      });

      // Send message and get stream
      const result = await chat.sendMessageStream(prompt);
      
      let response = '';
      for await (const chunk of result.stream) {
        response += chunk.text();
      }

      // Add model response to chat history
      const modelMessage: ChatMessage = {
        role: 'model',
        parts: [{ text: response }]
      };
      setChatHistory((prev: ChatMessage[]) => [...prev, modelMessage]);

      // Check for scheme detection in user message
      const detectedScheme = SchemeService.detectScheme(prompt);
      if (detectedScheme) {
        const schemeMessages = {
          hindi: `मैंने "${detectedScheme.title}" योजना का पता लगाया है। मैं आपको योजनाओं टैब में ले जा रहा हूं।`,
          english: `I detected the "${detectedScheme.title}" scheme. I will direct you to it in the Schemes tab.`,
          kannada: `ನಾನು "${detectedScheme.title}" ಯೋಜನೆಯನ್ನು ಪತ್ತೆ ಮಾಡಿದ್ದೇನೆ. ನಾನು ನಿಮ್ಮನ್ನು ಯೋಜನೆಗಳ ಟ್ಯಾಬ್‌ನಲ್ಲಿ ಅದಕ್ಕೆ ನಿರ್ದೇಶಿಸುತ್ತೇನೆ.`,
          marathi: `मी "${detectedScheme.title}" योजना शोधली आहे. मी तुम्हाला योजना टॅबमध्ये त्याकडे निर्देश करतो.`,
          punjabi: `ਮੈਂ "${detectedScheme.title}" ਯੋਜਨਾ ਦਾ ਪਤਾ ਲਗਾਇਆ ਹੈ. ਮੈਂ ਤੁਹਾਨੂੰ ਯੋਜਨਾਵਾਂ ਟੈਬ ਵਿੱਚ ਇਸ ਵੱਲ ਨਿਰਦੇਸ਼ ਕਰਾਂਗਾ.`,
          gujarati: `મેં "${detectedScheme.title}" યોજના શોધી છે. હું તમને યોજનાઓ ટેબમાં તેની તરફ નિર્દેશ કરીશ.`,
          bengali: `আমি "${detectedScheme.title}" প্রকল্পটি সনাক্ত করেছি। আমি আপনাকে প্রকল্প ট্যাবে এটি দেখাতে নিয়ে যাব।`
        };
        
        const response = schemeMessages[selectedLanguage as keyof typeof schemeMessages] || schemeMessages.english;
        
        // Navigate to schemes tab with the detected scheme ID after speech completes
        setTimeout(() => {
          router.push({
            pathname: '/schemes',
            params: { 
              schemeId: detectedScheme.id,
              schemeName: detectedScheme.title 
            }
          });
        }, 3000); // Increased delay to allow speech to complete
        
        return response;
      }

      // If Gemini response is a task marker, add the task and show confirmation
      if (response.trim().startsWith('__TASK__:')) {
        const taskText = response.replace(/^__TASK__:/, '').trim();
        const taskData = taskService.parseTaskFromText(taskText);
        const newTask = await taskService.addTask(taskData);
        const confirmationMessages = {
          hindi: `टास्क जोड़ दिया गया है: "${newTask.title}"। आप इसे टास्क टैब में देख सकते हैं।`,
          english: `Task added: "${newTask.title}". You can view it in the Tasks tab.`,
          kannada: `ಟಾಸ್ಕ್ ಸೇರಿಸಲಾಗಿದೆ: "${newTask.title}". ನೀವು ಅದನ್ನು ಟಾಸ್ಕ್ ಟ್ಯಾಬ್‌ನಲ್ಲಿ ನೋಡಬಹುದು.`,
          marathi: `कार्य जोडले आहे: "${newTask.title}". तुम्ही ते कार्य टॅबमध्ये पाहू शकता.`,
          punjabi: `ਟਾਸਕ ਜੋੜਿਆ ਗਿਆ ਹੈ: "${newTask.title}". ਤੁਸੀਂ ਇਸਨੂੰ ਟਾਸਕ ਟੈਬ ਵਿੱਚ ਦੇਖ ਸਕਦੇ ਹੋ.`,
          gujarati: `કાર્ય ઉમેર્યું છે: "${newTask.title}". તમે તેને કાર્ય ટેબમાં જોઈ શકો છો.`,
          bengali: `কাজ যোগ করা হয়েছে: "${newTask.title}". আপনি এটি কাজ ট্যাবে দেখতে পারেন.`
        };
        return confirmationMessages[selectedLanguage as keyof typeof confirmationMessages] || confirmationMessages.english;
      }

      return response;
    } catch (error) {
      console.error('Error getting Gemini response:', error);
      return 'मुझे क्षमा करें, मैं अभी आपकी सहायता नहीं कर पा रहा हूं। कृपया कुछ देर बाद पुनः प्रयास करें।';
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;
    
    try {
      setIsProcessing(true);
      const response = await getGeminiResponse(message);
      setAssistantResponse(response);
      setTranscript(''); // Clear the input after sending
      if (!isMuted) {
        await speakResponse(response);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const processCommand = async (command: string, language: string = selectedLanguage) => {
    try {
      setIsProcessing(true);
      const response = await getGeminiResponse(command);
      setAssistantResponse(response);
      setTranscript(''); // Clear the input after processing voice command
      if (!isMuted) {
        await speakResponse(response);
      }
    } catch (error) {
      console.error('Error processing command:', error);
      setError('Failed to process command. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const parseResponse = (response: string) => {
    if (!response) return { type: '', action: '', details: '' };
    const parts = response.split('|').map(part => part.trim());
    const type = parts[0]?.split(':')[1]?.trim() || '';
    const action = parts[1]?.split(':')[1]?.trim() || '';
    const details = parts[2]?.split(':')[1]?.trim() || '';
    return { type, action, details };
  };

  const { type, action, details } = parseResponse(transcript);

  const renderResponse = () => {
    if (isProcessing) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={textColor} />
          <Text style={[styles.loadingText, { color: secondaryTextColor }]}>
            Processing...
          </Text>
        </View>
      );
    }

    if (!type) {
      return (
        <Text style={[styles.placeholderText, { color: secondaryTextColor }]}>
          Waiting for your input...
        </Text>
      );
    }

    switch (type) {
      case 'task':
        return (
          <View style={styles.taskContainer}>
            <View style={[styles.actionBadge, { backgroundColor: getActionColor(action) }]}>
              <Text style={styles.actionText}>{action}</Text>
            </View>
            <Text style={[styles.detailsText, { color: textColor }]}>{details}</Text>
          </View>
        );
      case 'scheme':
        return (
          <View style={styles.schemeContainer}>
            <View style={[styles.schemeBadge, { backgroundColor: '#4CAF50' }]}>
              <MaterialIcons name="policy" size={20} color="white" />
              <Text style={styles.schemeBadgeText}>Scheme</Text>
            </View>
            <Text style={[styles.detailsText, { color: textColor }]}>{details}</Text>
          </View>
        );
      case 'error':
        return (
          <View style={styles.errorContainer}>
            <View style={[styles.errorBadge, { backgroundColor: '#F44336' }]}>
              <MaterialIcons name="error" size={20} color="white" />
              <Text style={styles.errorBadgeText}>Error</Text>
            </View>
            <Text style={[styles.detailsText, { color: textColor }]}>{details}</Text>
          </View>
        );
      default:
        return (
          <Text style={[styles.detailsText, { color: textColor }]}>{details}</Text>
        );
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'add':
        return '#4CAF50';
      case 'delete':
        return '#F44336';
      case 'complete':
        return '#2196F3';
      case 'list':
        return '#FF9800';
      default:
        return '#9E9E9E';
    }
  };

  // Function to speak the response
  const speakResponse = async (text: string) => {
    try {
      if (voiceService.current) {
        // Split text into sentences for better speech handling
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        
        // Speak each sentence with a small delay
        for (const sentence of sentences) {
          await voiceService.current.speak(sentence.trim());
          // Add a small pause between sentences
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (error) {
      console.error('Error speaking response:', error);
    }
  };

  // Update the clear chat function
  const clearChat = () => {
    setChatHistory([]);
    setAssistantResponse('');
    setHasIntroduced(false); // Reset introduction state
  };

  // Debug function to check available voices
  const checkAvailableVoices = () => {
    if (voiceService.current) {
      // Get TTS information
      const ttsInfo = voiceService.current.getTTSInfo();
      
      // Get detailed voice information
      const voiceInfo = voiceService.current.getVoiceInfo();
      
      const voices = voiceService.current.getAvailableVoices();
      console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));
      
      const supportedLanguages = ['en-US', 'hi-IN', 'kn-IN', 'ta-IN', 'te-IN', 'ml-IN', 'bn-IN', 'pa-IN', 'mr-IN', 'gu-IN'];
      supportedLanguages.forEach(lang => {
        const isSupported = voiceService.current?.isLanguageSupported(lang);
        console.log(`${lang} supported:`, isSupported);
      });

    
    }
  };

  useEffect(() => {
    // Check available voices after a delay to ensure speech synthesis is loaded
    const timer = setTimeout(() => {
      checkAvailableVoices();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <ScrollView style={styles.scrollView}>
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={[styles.welcomeText, { color: textColor }]}>
            Welcome to Smart Bharat
          </Text>
          <Text style={[styles.subtitle, { color: secondaryTextColor }]}>
            Your Digital Companion for Rural India
          </Text>
        </View>

        {/* Weather Section */}
        <TouchableOpacity onPress={() => setWeatherModalVisible(true)}>
          <View style={[styles.weatherCard, { backgroundColor: cardBackground, borderColor }]}>
            <View style={styles.weatherHeader}>
              <FontAwesome name="cloud" size={24} color={accentColor} />
              <Text style={[styles.weatherTitle, { color: textColor }]}>Weather Update</Text>
            </View>
            <View style={styles.weatherDetails}>
              <Text style={[styles.weatherText, { color: textColor }]}>
                Temperature: 28°C
              </Text>
              <Text style={[styles.weatherText, { color: textColor }]}>
                Humidity: 65%
              </Text>
              <Text style={[styles.weatherText, { color: textColor }]}>
                Wind: 12 km/h
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[styles.quickActionCard, { backgroundColor: cardBackground, borderColor }]}
                onPress={() => handleActionPress(action.route)}
              >
                <FontAwesome name={action.icon} size={24} color={action.color} />
                <Text style={[styles.quickActionText, { color: textColor }]}>
                  {action.title}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.quickActionCard} onPress={() => setCropModalVisible(true)}>
              <FontAwesome name="medkit" size={24} color="#D35400" />
              <Text style={styles.quickActionText}>Crop-Checkup</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Schemes */}
        <View style={styles.recentSchemesContainer}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Recent Schemes</Text>
          {recentSchemes.map((scheme) => (
            <View
              key={scheme.id}
              style={[styles.schemeCard, { backgroundColor: cardBackground, borderColor }]}
            >
              <Text style={[styles.schemeTitle, { color: textColor }]}>
                {scheme.title}
              </Text>
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { backgroundColor: accentColor }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${scheme.progress}%`, backgroundColor: accentColor }
                    ]}
                  />
                </View>
                <Text style={[styles.progressText, { color: secondaryTextColor }]}>
                  {scheme.progress}%
                </Text>
              </View>
              <Text style={[styles.schemeStatus, { color: secondaryTextColor }]}>
                Status: {scheme.status}
              </Text>
            </View>
          ))}
        </View>

        {/* News Section */}
        <NewsSection />

        {/* Language Selector */}
        <View style={styles.languageContainer}>
          <Text style={[styles.languageTitle, { color: textColor }]}>Select Language</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.languageScroll}>
            {languages.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageButton,
                  { backgroundColor: selectedLanguage === lang.code ? accentColor : cardBackground },
                  { borderColor }
                ]}
                onPress={() => setSelectedLanguage(lang.code)}
              >
                <Text style={[
                  styles.languageText,
                  { color: selectedLanguage === lang.code ? '#fff' : textColor }
                ]}>
                  {lang.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          {/* Test Kannada Button */}
          <TouchableOpacity
            style={[styles.testButton, { backgroundColor: accentColor }]}
            onPress={() => voiceService.current?.testKannadaSpeech('ನಮಸ್ಕಾರ! ನಾನು ಸ್ಮಾರ್ಟ್ ಭಾರತ')}
          >
            <Text style={styles.testButtonText}>Test Kannada (Hindi Voice)</Text>
          </TouchableOpacity>
        </View>

        {/* Voice Input Section */}
        <View style={styles.voiceSection}>
          <View style={styles.voiceControls}>
            <TouchableOpacity
              style={[
                styles.voiceButton,
                { backgroundColor: isListening ? '#ff4444' : accentColor }
              ]}
              onPress={handleMicPress}
            >
              <FontAwesome 
                name={isListening ? "stop" : "microphone"} 
                size={24} 
                color="white" 
              />
            </TouchableOpacity>
            
            {isListening && (
              <TouchableOpacity
                style={[styles.stopButton, { backgroundColor: '#ff4444' }]}
                onPress={handleStopRecording}
              >
                <Text style={styles.stopButtonText}>Stop</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[
                styles.muteButton,
                { backgroundColor: isMuted ? '#666' : accentColor }
              ]}
              onPress={toggleMute}
            >
              <FontAwesome 
                name={isMuted ? "volume-off" : "volume-up"} 
                size={20} 
                color="white" 
              />
            </TouchableOpacity>
          </View>
          
          {isListening && (
            <View style={styles.recordingIndicator}>
              <Text style={[styles.recordingText, { color: accentColor }]}>
                🎤 Recording... Speak now
              </Text>
            </View>
          )}
          
          {transcript && (
            <View style={styles.transcriptContainer}>
              <Text style={[styles.transcriptLabel, { color: textColor }]}>
                You said:
              </Text>
              <Text style={[styles.transcriptText, { color: textColor }]}>
                {transcript}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Weather Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isWeatherModalVisible}
        onRequestClose={() => setWeatherModalVisible(false)}
      >
        <View style={styles.weatherModalContainer}>
          <View style={styles.weatherModalView}>
            <Text style={styles.weatherModalTitle}>Detailed Weather Report</Text>
            <Text style={styles.weatherModalText}>Location: Pune, Maharashtra</Text>
            <Text style={styles.weatherModalText}>Temperature: 28°C (Feels like 30°C)</Text>
            <Text style={styles.weatherModalText}>Forecast: Partly cloudy with a chance of rain.</Text>
            <Text style={styles.weatherModalText}>Wind: 12 km/h from SW</Text>
            <Text style={styles.weatherModalText}>Humidity: 65%</Text>
            <Text style={styles.weatherModalText}>UV Index: 5 (Moderate)</Text>
            <Text style={styles.weatherModalText}>Analysis: Good day to stay indoors during the afternoon.</Text>
            <TouchableOpacity
              style={styles.weatherModalCloseButton}
              onPress={() => setWeatherModalVisible(false)}
            >
              <Text style={styles.weatherModalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Chat Button */}
      <TouchableOpacity
        style={styles.chatButton}
        onPress={() => handleAssistantVisibility(true)}
      >
        <MaterialIcons name="chat" size={32} color="white" />
      </TouchableOpacity>

      {/* Chat Window */}
      <Modal
        visible={isAssistantVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => handleAssistantVisibility(false)}
      >
        <View style={[styles.chatWindow, isAssistantVisible && styles.chatOpen]}>
          <View style={styles.chatHeader}>
            <Text style={{ color: '#333', fontSize: 16, fontWeight: 'bold' }}>Smart Assistant</Text>
            <View style={styles.chatControls}>
              <TouchableOpacity onPress={() => setShowLanguageSelector(!showLanguageSelector)}>
                <MaterialIcons name="language" size={22} color="#555" />
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleMute}>
                <MaterialIcons name={isMuted ? 'volume-off' : 'volume-up'} size={22} color="#555" />
              </TouchableOpacity>
              <TouchableOpacity onPress={clearChat}>
                <MaterialIcons name="delete" size={22} color="#555" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleAssistantVisibility(false)}>
                <MaterialIcons name="close" size={22} color="#555" />
              </TouchableOpacity>
            </View>
          </View>

          {showLanguageSelector && (
            <View style={styles.languageSelector}>
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageOption,
                    selectedLanguage === lang.code && styles.selectedLanguage
                  ]}
                  onPress={() => {
                    setSelectedLanguage(lang.code);
                    setShowLanguageSelector(false);
                  }}
                >
                  <Text style={[
                    styles.languageText,
                    selectedLanguage === lang.code && styles.selectedLanguageText
                  ]}>
                    {lang.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <ScrollView style={styles.chat}>
            {chatHistory.map((message, index) => (
              <ChatMessage key={index} message={message} index={index} />
            ))}
            {isProcessing && (
              <View style={styles.loader} />
            )}
          </ScrollView>

          <View style={styles.inputArea}>
            <TextInput
              style={styles.input}
              placeholder="कृपया अपना प्रश्न पूछें..."
              value={transcript}
              onChangeText={setTranscript}
              onSubmitEditing={() => handleSendMessage(transcript)}
            />
            <TouchableOpacity
              style={[styles.voiceButton, isListening && styles.voiceButtonActive]}
              onPress={handleMicPress}
            >
              <MaterialIcons
                name={isListening ? 'mic' : 'mic-none'}
                size={24}
                color="white"
              />
              <Text style={styles.voiceButtonText}>
                {languages.find(lang => lang.code === selectedLanguage)?.name || 'हिंदी'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sendButton}
              onPress={() => handleSendMessage(transcript)}
            >
              <MaterialIcons name="send" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <CropDiseaseModal
        visible={isCropModalVisible}
        onClose={() => setCropModalVisible(false)}
      />
    </SafeAreaView>
  );
}

interface CommandItemProps {
  icon: string;
  text: string;
  color: string;
}

const CommandItem = ({ icon, text = '', color }: CommandItemProps) => {
  // Ensure text is always a string and not null/undefined
  const displayText = typeof text === 'string' ? text : '';
  
  return (
    <View style={styles.commandItem}>
      <View style={styles.iconContainer}>
        <MaterialIcons name={icon as any} size={20} color={color} />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.commandText, { color }]}>{displayText}</Text>
      </View>
    </View>
  );
};

const ChatMessage = ({ message, index }: { message: ChatMessage; index: number }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  return (
    <Animated.Text
      style={[
        styles.messageText,
        message.role === 'user' ? styles.userMessage : styles.modelMessage,
        {
          opacity,
          transform: [{ translateY }]
        }
      ]}
    >
      {message.parts[0].text}
    </Animated.Text>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  taskContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 12,
  },
  actionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  detailsText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  micButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
      },
    }),
  },
  micButtonText: {
    color: '#fff',
    fontSize: 24,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  errorText: {
    color: '#c62828',
    fontSize: 16,
  },
  helpCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  commandList: {
    gap: 12,
  },
  commandItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  iconContainer: {
    width: 24,
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  commandText: {
    fontSize: 16,
    color: '#666',
  },

  weatherModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  weatherModalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
  },
  weatherModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    width: '100%',
  },
  weatherModalText: {
    fontSize: 16,
    marginBottom: 10,
  },
  weatherModalCloseButton: {
    backgroundColor: '#2E7D32',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    elevation: 2,
    marginTop: 15,
    alignSelf: 'center',
  },
  weatherModalCloseButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  chatContainer: {
    flex: 1,
    padding: 20,
  },
  chatMessageContainer: {
    marginBottom: 20,
  },
  chatMessage: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chatMessageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  chatMessageTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  chatMessageText: {
    fontSize: 16,
    lineHeight: 24,
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  processingText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '500',
  },
  modalFooter: {
    padding: 20,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  voiceControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  voiceButton: {
    padding: 12,
    borderRadius: 25,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceButtonActive: {
    backgroundColor: '#FF3B30',
    transform: [{ scale: 1.1 }],
  },
  stopButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#ff4444',
  },
  muteButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#666',
  },
  recordingIndicator: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  recordingText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  transcriptContainer: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  transcriptLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  transcriptText: {
    fontSize: 16,
  },
  welcomeCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  welcomeSubtext: {
    fontSize: 16,
    opacity: 0.8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  quickActionsContainer: {
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  quickActionCard: {
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    width: '46%',
    marginBottom: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  quickActionText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  recentSchemesContainer: {
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  recentSchemesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  schemeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  schemeTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 5,
  },
  schemeStatus: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  progressContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginVertical: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2E7D32',
  },
  progressText: {
    fontSize: 12,
    marginTop: 4,
  },
  assistantButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 3.84px rgba(0, 0, 0, 0.25)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
      },
    }),
  },
  assistantIcon: {
    color: '#fff',
  },
  scrollView: {
    padding: 16,
  },
  newsContainer: {
    padding: 16,
  },
  newsCard: {
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      },
    }),
  },
  newsImage: {
    width: '100%',
    height: 150,
  },
  newsContent: {
    padding: 12,
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  newsDescription: {
    fontSize: 14,
    marginBottom: 8,
    opacity: 0.8,
  },
  newsDate: {
    fontSize: 12,
    color: '#666',
  },
  placeholderText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#666',
  },
  schemeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  schemeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  schemeBadgeText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  errorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  errorBadgeText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  clearButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#FF3B30',
  },
  welcomeSection: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.05)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
      },
    }),
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.8,
  },
  weatherCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  weatherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  weatherTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  weatherDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  weatherText: {
    fontSize: 14,
  },
  chatButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 998,
    backgroundColor: '#2E7D32',
    height: 60,
    width: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  chatWindow: {
    display: 'none',
    position: 'absolute',
    zIndex: 999,
    bottom: 90,
    right: 20,
    height: 600,
    width: 360,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    flexDirection: 'column',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  chatOpen: {
    display: 'flex',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  chatControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  messageText: {
    borderRadius: 20,
    width: '80%',
    marginVertical: 8,
    fontSize: 16,
    padding: 16,
    opacity: 0,
  },
  modelMessage: {
    backgroundColor: '#f5f5f5',
  },
  userMessage: {
    backgroundColor: '#2E7D32',
    color: 'white',
    alignSelf: 'flex-end',
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    color: 'red',
  },
  inputArea: {
    height: 'auto',
    minHeight: 60,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  input: {
    height: 40,
    flex: 1,
    borderWidth: 1,
    borderColor: '#ced4da',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingLeft: 16,
    paddingRight: 16,
    fontSize: 14,
  },
  sendButton: {
    height: 40,
    width: 40,
    borderRadius: 20,
    borderWidth: 0,
    marginLeft: 8,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  loader: {
    width: 40,
    height: 40,
  },
  chat: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 0,
  },
  languageContainer: {
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  languageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  languageScroll: {
    marginBottom: 12,
  },
  languageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  languageText: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectedLanguage: {
    backgroundColor: '#5856D6',
  },
  selectedLanguageText: {
    color: 'white',
  },
  showLanguageSelector: {
    display: 'flex',
  },
  voiceButtonText: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
  },
  testButton: {
    padding: 12,
    borderRadius: 20,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
  },
  testButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  languageSelector: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 8,
    zIndex: 1000,
    ...Platform.select({
      web: {
        boxShadow: 'rgba(0, 0, 0, 0.24) 0px 3px 8px',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.24,
        shadowRadius: 8,
        elevation: 5,
      },
    }),
  },
  languageOption: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
  },
  voiceSection: {
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  stopButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});