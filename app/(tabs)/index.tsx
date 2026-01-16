import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import FarmerServicesModal from '../../components/FarmerServicesModal';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { Audio } from 'expo-av';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, ImageBackground, Linking, Platform, Modal, TextInput, KeyboardAvoidingView, ActivityIndicator, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColor } from '../../hooks/useThemeColor';
import { getDb, getAuth } from '../../config/firebase';
import VoiceService from '../../services/VoiceService';
import { GEMINI_API_KEY, isGeminiAvailable, getGeminiModel } from '../../constants/config';
import CropDiseaseModal from '../../components/CropDiseaseModal';
import FirebaseTaskService, { Task } from '../../services/firebaseTaskService';
import SchemeService from '../../services/schemeService';
import WeatherService, { WeatherData } from '../../services/weatherService';
import ScrollStack from '../../components/ScrollStack';
import NewsCard from '../../components/NewsCard';
import StickyScrollStack from '../../components/ScrollStack';

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

const NewsSection = ({ userLocation }: { userLocation: { city: string; state: string } }) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGeneralNews, setIsGeneralNews] = useState(false);
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
  const accentColor = useThemeColor({ light: '#2E7D32', dark: '#2E7D32' }, 'tint');
  const textColor = useThemeColor({ light: '#333333', dark: '#333333' }, 'text');

  useEffect(() => {
    const fetchNews = async () => {
      try {
        console.log('NewsSection: Fetching news for state:', userLocation.state);
        const apiKey = '0ba0ad111fe34dab9d1827fbf12428b3';
        
        // First try state-specific agriculture news
        let response = await fetch(
          `https://newsapi.org/v2/everything?q=agriculture farming ${userLocation.state}&language=en&sortBy=publishedAt&pageSize=20&apiKey=${apiKey}`
        );
        let data = await response.json();
        console.log('NewsSection: Received', data.articles?.length || 0, 'articles from state-specific API');
        
        // If no state-specific articles, fallback to general India agriculture news
        if (!data.articles || data.articles.length === 0) {
          console.log('NewsSection: No state-specific articles found, fetching general India agriculture news');
          response = await fetch(
            `https://newsapi.org/v2/everything?q=agriculture farming india&language=en&sortBy=publishedAt&pageSize=20&apiKey=${apiKey}`
          );
          data = await response.json();
          console.log('NewsSection: Received', data.articles?.length || 0, 'articles from general India API');
          
          // If still no articles, try getting any recent Indian news
          if (!data.articles || data.articles.length === 0) {
            console.log('NewsSection: No agriculture articles found, fetching any recent Indian news');
            response = await fetch(
              `https://newsapi.org/v2/top-headlines?country=in&pageSize=20&apiKey=${apiKey}`
            );
            data = await response.json();
            console.log('NewsSection: Received', data.articles?.length || 0, 'articles from top headlines API');
          }
          setIsGeneralNews(true);
        } else {
          setIsGeneralNews(false);
        }
        
        if (data.articles) {
          // Filter for agriculture-related news and Indian sources
          const filteredNews = data.articles.filter((article: any) => {
            const title = article.title?.toLowerCase() || '';
            const description = article.description?.toLowerCase() || '';
            const content = article.content?.toLowerCase() || '';
            
            // Keywords related to agriculture and farming (more specific)
            const agricultureKeywords = [
              'agriculture', 'farming', 'farmer', 'crop', 'harvest', 'irrigation',
              'fertilizer', 'pesticide', 'soil', 'seed', 'agricultural', 'kisan',
              'krishi', 'mandi', 'yojana', 'scheme', 'subsidy', 'loan', 'pm kisan',
              'agricultural policy', 'rural development', 'farm', 'plantation',
              'wheat', 'rice', 'sugarcane', 'cotton', 'pulses', 'vegetables',
              'horticulture', 'dairy', 'poultry', 'fishery', 'sericulture'
            ];
            
            // Check if article contains agriculture-related keywords (less strict)
            const hasAgricultureContent = agricultureKeywords.some(keyword => 
              title.toLowerCase().includes(keyword) || 
              description.toLowerCase().includes(keyword) || 
              content.toLowerCase().includes(keyword)
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
            
            // Show articles that are either agriculture-related OR from Indian sources
            return hasAgricultureContent || isIndianSource;
          });
          
          // If still no articles after filtering, show all articles from Indian sources
          if (filteredNews.length === 0) {
            console.log('NewsSection: No agriculture articles found, showing all Indian news');
            const allIndianNews = data.articles.filter((article: any) => {
              const source = article.source?.name?.toLowerCase() || '';
              const url = article.url?.toLowerCase() || '';
              const indianSources = [
                'timesofindia', 'hindustantimes', 'thehindu', 'indianexpress',
                'ndtv', 'zeenews', 'news18', 'moneycontrol', 'livemint',
                'business-standard', 'financialexpress', 'economic times'
              ];
              return indianSources.some(indianSource => 
                source.includes(indianSource) || url.includes(indianSource)
              );
            });
            setNews(allIndianNews.slice(0, 10));
            console.log('NewsSection: Showing', allIndianNews.length, 'Indian news articles');
          } else {
            setNews(filteredNews.slice(0, 10)); // Get top 10 filtered agriculture news items
            console.log('NewsSection: Filtered to', filteredNews.length, 'agriculture articles');
          }
        }
      } catch (error) {
        console.error('Error fetching news:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [userLocation.state]); // Re-fetch when user's state changes

  const handleNewsCardIndex = (index: number) => {
    setCurrentNewsIndex(index);
  };

  if (loading) {
    return (
      <View style={styles.newsContainer}>
        <ActivityIndicator size="small" color={accentColor} />
      </View>
    );
  }

  if (news.length === 0) {
    return (
      <View style={styles.newsContainer}>
        <Text style={[styles.noNewsText, { color: textColor }]}>
          No news available at the moment
        </Text>
      </View>
    );
  }

  // Create header component
  const headerComponent = (
    <View style={styles.sectionHeader}>
      <FontAwesome name="newspaper-o" size={20} color="#2E7D32" />
      <Text style={[styles.sectionTitle, { color: textColor }]}>
        {isGeneralNews 
          ? 'Latest News from India' 
          : `Latest Farming News from ${userLocation.state}`
        }
      </Text>
      <Text style={styles.newsCounter}>
        {currentNewsIndex + 1} / {news.length}
      </Text>
    </View>
  );

  // Create children array: [header, firstCard, ...restCards]
  const stackChildren = [
    headerComponent,
    <NewsCard
      key={0}
      item={news[0]}
      index={0}
      textColor={textColor}
      accentColor={accentColor}
    />,
    ...news.slice(1).map((item, idx) => (
      <NewsCard
        key={idx + 1}
        item={item}
        index={idx + 1}
        textColor={textColor}
        accentColor={accentColor}
      />
    )),
  ];

  return (
    <View style={{ flex: 1 }}>
      <StickyScrollStack
        children={stackChildren as React.ReactNode[]}
        cardHeight={380}
        gap={16}
        headerHeight={70}
        firstCardHeight={380}
        onCardIndex={handleNewsCardIndex}
      />
    </View>
  );
};

export default function HomeScreen() {
  const [isAssistantVisible, setAssistantVisible] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [assistantResponse, setAssistantResponse] = useState('');
  const [buttonPressed, setButtonPressed] = useState(null);
  const [isCropModalVisible, setCropModalVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [isServicesModalVisible, setServicesModalVisible] = useState(false);
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
  const [userLocation, setUserLocation] = useState({ city: 'Pune', state: 'Maharashtra' });
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const taskService = FirebaseTaskService.getInstance(); // Initialize task service
  const [showWeatherModal, setShowWeatherModal] = useState(false);
  const [showWeatherVariables, setShowWeatherVariables] = useState(true);

  // Note: Real weather data is now fetched from WeatherService API
  // This mock function is kept for reference but not used
  const getLocationWeatherData = (city: string, state: string) => {
    // Real weather is fetched from OpenWeatherMap API via WeatherService
    return null;
  };

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
    //{ id: '2', title: 'Check Status', icon: 'search' as const, color: '#34C759', route: '/schemes' as TabRoute },
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
      // Only process voice input if we're on the home screen and assistant is visible
      if (isAssistantVisible) {
        setTranscript(text);
        setCurrentTranscript(text);
        // Pass the selected language to processCommand
        processCommand(text, selectedLanguage);
      }
    });

    // Set up speech end callback
    voiceService.current.setOnSpeechEnd(() => {
      setIsListening(false);
    });

    return () => {
      // Clean up - stop listening and clear callbacks when leaving this screen
      if (voiceService.current) {
        voiceService.current.stopListening();
        voiceService.current.setOnSpeechResult(null);
        voiceService.current.setOnSpeechEnd(null);
      }
    };
  }, [selectedLanguage, isAssistantVisible]); // Add isAssistantVisible as dependency

  // Fetch user profile data on component mount and when screen is focused (to refresh after profile updates)
  useFocusEffect(
    useCallback(() => {
      const fetchUserProfile = async () => {
        try {
          console.log('HomeScreen: Fetching user profile...');
          const auth = getAuth();
          const db = getDb();
          if (auth?.currentUser && db) {
            console.log('HomeScreen: User is logged in, fetching profile...');
            const userRef = doc(db, 'users', auth.currentUser.uid);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              console.log('HomeScreen: User data from Firebase:', userData);
              const location = {
                city: userData.city || 'Pune',
                state: userData.state || 'Maharashtra'
              };
              setUserLocation(location);
              console.log('HomeScreen: User location set to:', location);
            } else {
              console.log('HomeScreen: User document does not exist, using default location');
              setUserLocation({ city: 'Pune', state: 'Maharashtra' });
            }
          } else {
            console.log('HomeScreen: No user logged in, using default location');
            setUserLocation({ city: 'Pune', state: 'Maharashtra' });
          }
        } catch (error) {
          console.error('HomeScreen: Error fetching user profile:', error);
          setUserLocation({ city: 'Pune', state: 'Maharashtra' });
        }
      };

      fetchUserProfile();
    }, [])
  );

  // Fetch weather data when user location changes
  useEffect(() => {
    const fetchWeatherData = async () => {
      setWeatherLoading(true);
      try {
        const weatherService = WeatherService.getInstance();
        let weather = null;
        
        // Try to get weather for user's location
        if (userLocation.city && userLocation.city !== 'Pune') {
          weather = await weatherService.getUserWeather(userLocation.city, '');
          console.log('HomeScreen: Real weather data fetched for user location:', weather);
        }
        
        // Fallback to Pune if no user location or if user location failed
        if (!weather) {
          weather = await weatherService.getWeatherByCity('Pune');
          console.log('HomeScreen: Fallback weather data fetched for Pune:', weather);
        }
        
        setWeatherData(weather);
      } catch (error) {
        console.error('HomeScreen: Error fetching weather:', error);
        setWeatherData(null);
      } finally {
        setWeatherLoading(false);
      }
    };

    fetchWeatherData();
  }, [userLocation.city]);

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

  // DEPRECATED: isFarmingRelated removed - Gemini handles filtering now
  // const isFarmingRelated = (text: string): boolean => {
    const farmingKeywords = [
      'farm', 'crop', 'agriculture', 'soil', 'irrigation', 'seed', 'fertilizer', 'pest', 
      'disease', 'harvest', 'sowing', 'season', 'weather', 'rain', 'sun', 'farmer', 'field',
      'cultivat', 'plant', 'grow', 'fertiliz', 'compost', 'organic', 'mandi', 'price',
      'subsidy', 'scheme', 'government', 'kheti', 'fisher', 'fish', 'aqua', 'livestock', 'animal', 'poultry',
      'पौध', 'खेत', 'मिट्टी', 'बीज', 'कीटनाशक', 'मछली', 'पशु', 'पालन',
      'फसल', 'सिंचाई', 'जैव', 'उर्वरक', 'योजना', 'सरकार', 'कटाई', 'बुवाई',
      'ಫಸಲ್', 'ಕೃಷಿ', 'ಬೀಜ', 'ಸಾರ', 'ನೀರುನಿರ್ವಹಣೆ', 'ರೋಗ', 'ಮೀನು', 'ಪಶು',
      'પાક', 'ખેતર', 'બીજ', 'ખેતી', 'ખાતર', 'માછલી',
      'পাট', 'ফসল', 'বীজ', 'মাটি', 'সার', 'মাছ', 'পশु'
    ];
    
    // Removed - Gemini handles filtering now

  // Get non-farming response in multiple languages - DEPRECATED (Gemini handles it now)

  const getGeminiResponse = async (prompt: string) => {
    try {
      if (!genAI) {
        throw new Error('Gemini API is not available');
      }

      // Check if this is a greeting and if we've already introduced
      const isGreeting = /^(नमस्ते|hello|hi|namaste|नमस्कार|ਸਤ ਸ੍ਰੀ ਅਕਾਲ|નમસ્તે|নমস্કার|ನಮಸ್ಕಾರ)/i.test(prompt.trim());
      
      // Set introduction flag if this is the first greeting
      if (isGreeting && !hasIntroduced) {
        setHasIntroduced(true);
      }

      // Get Gemini model with fallback support
      const model = getGeminiModel(genAI);
      if (!model) {
        throw new Error('No Gemini model available');
      }
      
      // Add user message to chat history
      const userMessage: ChatMessage = {
        role: 'user',
        parts: [{ text: prompt }]
      };
      setChatHistory((prev: ChatMessage[]) => [...prev, userMessage]);

      // System prompt for agricultural assistant - Gemini will evaluate if question is farming-related
      const systemPrompt = `You are a specialized agricultural assistant for Smart Bharat, helping Indian farmers with farming and agriculture topics ONLY.

IMPORTANT: You MUST ONLY answer questions about:
- Agriculture, farming, crops, plants, cultivation
- Livestock, dairy farming, animal husbandry, poultry
- Fisheries, aquaculture, fish farming
- Irrigation, soil management, fertilizers, pesticides
- Weather and farming, agricultural seasons
- Government schemes, subsidies for farmers
- Mandi prices, agricultural economics
- Horticulture, organic farming, composting
- Related rural development topics

For ANY non-agricultural topic:
- Politely decline and say you can only help with farming and agriculture questions
- Do NOT provide information on non-farming topics
- Suggest they ask an agriculture-related question instead

Your responses should be natural, helpful, and in the same language as the user's query.

User's question: "${prompt}"`;

      // Create chat session with history and system prompt
      const chat = model.startChat({
        history: [
          {
            role: 'user',
            parts: [{ text: systemPrompt }]
          },
          {
            role: 'model',
            parts: [{ text: 'I understand. I will only answer agriculture and farming related questions for Indian farmers. I will decline non-farming topics politely.' }]
          },
          ...chatHistory.map(msg => ({
            role: msg.role,
            parts: msg.parts
          }))
        ]
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
          handleAssistantVisibility(false); // Close chat window
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
      
      // getGeminiResponse already adds messages to chat history, no need to add again
      
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
      
      // getGeminiResponse already adds messages to chat history, no need to add again
      
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
        // Speak the entire text at once for smooth, continuous speech (no stuttering)
        await voiceService.current.speak(text.trim());
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

  // Map current weather condition to Rain-main's weather images
  // Uses day/night detection similar to Rain-main's StatusWeather.getImageNow()
  const getRainWeatherIcon = () => {
    const condition = weatherData?.current.condition.text.toLowerCase() || '';
    const now = new Date();
    const hour = now.getHours();
    const isDayTime = hour >= 6 && hour < 18; // Day: 6 AM to 6 PM

    // Thunder/Storm
    if (condition.includes('thunder') || condition.includes('storm')) {
      return require('../../Rain-main/assets/images/thunder.png');
    }
    // Snow
    if (condition.includes('snow') || condition.includes('sleet')) {
      return isDayTime 
        ? require('../../Rain-main/assets/images/snow_day.png')
        : require('../../Rain-main/assets/images/snow_night.png');
    }
    // Rain
    if (condition.includes('rain') || condition.includes('drizzle') || condition.includes('shower')) {
      return isDayTime
        ? require('../../Rain-main/assets/images/rain_day.png')
        : require('../../Rain-main/assets/images/rain_night.png');
    }
    // Fog/Mist
    if (condition.includes('fog') || condition.includes('mist') || condition.includes('haze')) {
      return isDayTime
        ? require('../../Rain-main/assets/images/fog_day.png')
        : require('../../Rain-main/assets/images/fog_night.png');
    }
    // Cloudy
    if (condition.includes('cloud')) {
      return isDayTime
        ? require('../../Rain-main/assets/images/cloudy_day.png')
        : require('../../Rain-main/assets/images/cloudy_night.png');
    }
    // Clear
    if (condition.includes('clear') || condition.includes('sunny')) {
      return isDayTime
        ? require('../../Rain-main/assets/images/clear_day.png')
        : require('../../Rain-main/assets/images/clear_night.png');
    }

    // Default
    return require('../../Rain-main/assets/images/atmospheric.png');
  };


  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <ScrollView style={styles.scrollView}>
        {/* Top gradient hero: welcome + weather */}
        <LinearGradient
          colors={['#FFFBEA', '#E4F7EB']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.topGradient}
        >
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <View style={styles.welcomeHeader}>
              <FontAwesome name="leaf" size={24} color="#2E7D32" />
              <View style={styles.welcomeTextContainer}>
                <Text style={[styles.welcomeText, { color: textColor }]}>
                  Welcome to Smart Bharat
                </Text>
                <Text style={[styles.subtitle, { color: secondaryTextColor }]}>
                  Your Digital Companion for Rural India
                </Text>
              </View>
            </View>
            <View style={styles.welcomeStats}>
              <View style={styles.statItem}>
                <FontAwesome name="users" size={16} color="#2E7D32" />
                <Text style={styles.statText}>1.2M+ Farmers</Text>
              </View>
              <View style={styles.statItem}>
                <FontAwesome name="map-marker" size={16} color="#2E7D32" />
                <Text style={styles.statText}>28 States</Text>
              </View>
              <View style={styles.statItem}>
                <FontAwesome name="check-circle" size={16} color="#2E7D32" />
                <Text style={styles.statText}>350+ Schemes</Text>
              </View>
            </View>
          </View>

          {/* Weather Section - Rain-main style Card design */}
          <TouchableOpacity onPress={() => setShowWeatherModal(true)} activeOpacity={0.9}>
            <View style={styles.weatherCardRain}>
              <View style={styles.weatherCardContent}>
                <View style={styles.weatherCardLeft}>
                  <Text style={styles.weatherCityName}>
                    {userLocation.city}, {userLocation.state}
                  </Text>
                  <Text style={styles.weatherDateRain}>
                    {weatherData?.location?.localtime
                      ? new Date(weatherData.location.localtime).toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric'
                        })
                      : new Date().toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric'
                        })}
                  </Text>
                  <Text style={styles.weatherConditionRain}>
                    {weatherData?.current?.condition?.text || 'Weather for your farm'}
                  </Text>
                  {weatherData && (
                    <View style={styles.weatherFeelsLikeRow}>
                      <Text style={styles.weatherFeelsLikeLabel}>Feels like</Text>
                      <Text style={styles.weatherFeelsLikeValue}>
                        {' • '}
                        {Math.round(weatherData.current.feelslike_c)}°C
                      </Text>
                    </View>
                  )}
                  <View style={styles.weatherTempSpacer} />
                  <Text style={styles.weatherTempRain}>
                    {weatherLoading || !weatherData
                      ? '--'
                      : Math.round(weatherData.current.temp_c)}
                    °C
                  </Text>
                  {weatherData && (
                    <View style={styles.weatherMinMaxRow}>
                      <Text style={styles.weatherMinMaxText}>
                        {Math.round(weatherData.current.temp_c + 3)}°C / {Math.round(weatherData.current.temp_c - 3)}°C
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.weatherCardRight}>
                  <Image source={getRainWeatherIcon()} style={styles.weatherImageRain} />
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </LinearGradient>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <View style={styles.sectionHeader}>
            <FontAwesome name="bolt" size={20} color="#2E7D32" />
            <Text style={[styles.sectionTitle, { color: textColor }]}>Quick Actions</Text>
          </View>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.id}
                style={[styles.quickActionCard, { backgroundColor: cardBackground, borderColor }]}
                onPress={() => handleActionPress(action.route)}
              >
                <View style={[styles.actionIconContainer, { backgroundColor: action.color + '20' }]}>
                  <FontAwesome name={action.icon} size={24} color={action.color} />
                </View>
                <Text style={[styles.quickActionText, { color: textColor }]}>
                  {action.title}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={[styles.quickActionCard, { backgroundColor: cardBackground, borderColor }]} 
              onPress={() => setCropModalVisible(true)}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#D35400' + '20' }]}>
                <FontAwesome name="medkit" size={24} color="#D35400" />
              </View>
              <Text style={[styles.quickActionText, { color: textColor }]}>Crop-Checkup</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.quickActionCard, { backgroundColor: cardBackground, borderColor }]} 
              onPress={() => router.push('/rent')}
            >
              <View style={[styles.actionIconContainer, { backgroundColor: '#4CAF50' + '20' }]}>
                <MaterialIcons name="agriculture" size={24} color="#4CAF50" />
              </View>
              <Text style={[styles.quickActionText, { color: textColor }]}>Farm Services</Text>
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
        <NewsSection userLocation={userLocation} />


      </ScrollView>

      {/* Farmer Services Modal */}
      <FarmerServicesModal 
        visible={isServicesModalVisible} 
        onClose={() => setServicesModalVisible(false)} 
      />

      {/* Weather Details Modal */}
      {/* Chat Button */}
      <TouchableOpacity
        style={styles.chatButton}
        onPress={() => handleAssistantVisibility(true)}
      >
        <MaterialIcons name="chat" size={32} color="white" />
      </TouchableOpacity>

      {/* Chat Window - Bottom Sheet Modal */}
      <Modal
        visible={isAssistantVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => handleAssistantVisibility(false)}
      >
        <BlurView intensity={90} style={styles.chatBlurOverlay}>
          <TouchableOpacity 
            style={styles.chatOverlayTouchable}
            onPress={() => handleAssistantVisibility(false)}
            activeOpacity={1}
          />
        </BlurView>
        
        <View style={styles.chatModalContainer}>
          <View style={styles.chatModalContent}>
            {/* Header */}
            <View style={styles.chatModalHeader}>
              <View style={styles.chatHeaderLeft}>
                <View style={styles.chatBotIconContainer}>
                  <MaterialIcons name="smart-toy" size={24} color="#2E7D32" />
                </View>
                <View>
                  <Text style={styles.chatBotTitle}>Smart Assistant</Text>
                </View>
              </View>
              
              <View style={styles.chatHeaderControls}>
                <TouchableOpacity 
                  style={styles.chatControlButton}
                  onPress={() => setShowLanguageSelector(!showLanguageSelector)}
                >
                  <MaterialIcons name="language" size={22} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.chatControlButton}
                  onPress={toggleMute}
                >
                  <MaterialIcons 
                    name={isMuted ? 'volume-off' : 'volume-up'} 
                    size={22} 
                    color="#666" 
                  />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.chatControlButton}
                  onPress={clearChat}
                >
                  <MaterialIcons name="delete-outline" size={22} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.chatControlButton, styles.chatCloseButton]}
                  onPress={() => handleAssistantVisibility(false)}
                >
                  <MaterialIcons name="close" size={22} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Language Selector */}
            {showLanguageSelector && (
              <View style={styles.chatLanguageBar}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.chatLanguageScroll}
                >
                  {languages.map((lang) => (
                    <TouchableOpacity
                      key={lang.code}
                      style={[
                        styles.chatLanguageButton,
                        selectedLanguage === lang.code && styles.chatLanguageButtonActive
                      ]}
                      onPress={() => {
                        setSelectedLanguage(lang.code);
                        setShowLanguageSelector(false);
                      }}
                    >
                      <Text style={[
                        styles.chatLanguageButtonText,
                        selectedLanguage === lang.code && styles.chatLanguageButtonTextActive
                      ]}>
                        {lang.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Chat Messages */}
            <ScrollView style={styles.chatMessagesArea}>
              {!hasIntroduced && !chatHistory.length && (
                <View style={styles.chatWelcomeMessage}>
                  <View style={styles.chatWelcomeIcon}>
                    <MaterialIcons name="emoji-emotions" size={48} color="#2E7D32" />
                  </View>
                  <Text style={styles.chatWelcomeTitle}>नमस्ते! How can I help?</Text>
                  <Text style={styles.chatWelcomeSubtitle}>
                    Ask me about crop yields, weather, or government schemes
                  </Text>
                </View>
              )}
              
              {chatHistory.map((message, index) => (
                <ChatMessage key={index} message={message} index={index} />
              ))}
              {isProcessing && (
                <View style={styles.chatLoadingContainer}>
                  <ActivityIndicator size="small" color="#2E7D32" />
                </View>
              )}
            </ScrollView>

            {/* Quick Action Buttons */}
            {!chatHistory.length && (
              <View style={styles.chatQuickActions}>
                <TouchableOpacity 
                  style={styles.chatQuickButton}
                  onPress={() => handleSendMessage('How to apply for PM Kisan?')}
                >
                  <Text style={styles.chatQuickButtonText}>How to apply?</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.chatQuickButton}
                  onPress={() => handleSendMessage('Check subsidy status')}
                >
                  <Text style={styles.chatQuickButtonText}>Check status</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.chatQuickButton}
                  onPress={() => handleSendMessage('List of beneficiaries')}
                >
                  <Text style={styles.chatQuickButtonText}>Beneficiary list</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Input Area */}
            <View style={styles.chatInputContainer}>
              <View style={styles.chatInputArea}>
                <TextInput
                  style={styles.chatInput}
                  placeholder="कृपया अपना प्रश्न पूछें..."
                  placeholderTextColor="#999"
                  value={transcript}
                  onChangeText={setTranscript}
                  onSubmitEditing={() => handleSendMessage(transcript)}
                />
                <TouchableOpacity style={styles.chatAttachButton}>
                  <MaterialIcons name="attach-file" size={20} color="#999" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.chatButtonsGroup}>
                <TouchableOpacity
                  style={[styles.chatMicButton, isListening && styles.chatMicButtonActive]}
                  onPress={handleMicPress}
                >
                  <MaterialIcons
                    name="mic"
                    size={24}
                    color="white"
                  />
                  <Text style={styles.chatMicButtonText}>
                    {languages.find(lang => lang.code === selectedLanguage)?.code?.toUpperCase() || 'EN'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.chatSendButton}
                  onPress={() => handleSendMessage(transcript)}
                >
                  <MaterialIcons name="send" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <CropDiseaseModal
        visible={isCropModalVisible}
        onClose={() => setCropModalVisible(false)}
      />

      <Modal
        visible={showWeatherModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowWeatherModal(false)}
      >
        <View style={styles.weatherModalOverlay}>
          <View style={styles.weatherModalContent}>
            <TouchableOpacity
              onPress={() => setShowWeatherModal(false)}
              style={styles.weatherCloseButton}
            >
              <FontAwesome name="times" size={24} color="#333333" />
            </TouchableOpacity>

            {weatherLoading ? (
              <View style={styles.weatherLoadingContainer}>
                <ActivityIndicator size="large" color="#7C3AED" />
                <Text style={styles.weatherLoadingText}>Loading weather data...</Text>
              </View>
            ) : weatherData ? (
              <ScrollView style={styles.weatherScrollView} showsVerticalScrollIndicator={false}>
                {/* Header: Location & Current Temp */}
                <View style={styles.weatherHeaderCard}>
                  <Text style={styles.weatherLocation}>{weatherData.location.name}</Text>
                  <Text style={styles.weatherDate}>
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </Text>
                  <View style={styles.weatherMainContainer}>
                    <View style={styles.weatherTempSection}>
                      <Text style={styles.weatherTemperature}>
                        {Math.round(weatherData.current.temp_c)}°C
                      </Text>
                      <Text style={styles.weatherFeelsLike}>
                        Feels • {Math.round(weatherData.current.feelslike_c)}°C
                      </Text>
                    </View>
                    <View style={styles.weatherIconSection}>
                      <Text style={styles.weatherConditionEmoji}>☁️</Text>
                    </View>
                  </View>
                  <Text style={styles.weatherCondition}>{weatherData.current.condition.text}</Text>
                  <View style={styles.weatherTempRange}>
                    <View style={styles.tempRangeItem}>
                      <Text style={styles.tempRangeLabel}>Min</Text>
                      <Text style={styles.tempRangeValue}>4°C</Text>
                    </View>
                    <View style={styles.tempRangeItem}>
                      <Text style={styles.tempRangeLabel}>Max</Text>
                      <Text style={styles.tempRangeValue}>12°C</Text>
                    </View>
                  </View>
                </View>

                {/* Hourly Forecast */}
                <View style={styles.weatherHourlySection}>
                  <Text style={styles.weatherSectionTitle}>Hourly Forecast</Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.weatherHourlyScroll}
                  >
                    {[
                      { time: '20:00', temp: 8, day: 'Tue' },
                      { time: '21:00', temp: 7, day: 'Tue' },
                      { time: '22:00', temp: 7, day: 'Tue' },
                      { time: '23:00', temp: 6, day: 'Tue' },
                    ].map((item, idx) => (
                      <View key={idx} style={[styles.weatherHourlyCard, idx === 0 && styles.weatherHourlyCardActive]}>
                        <Text style={styles.weatherHourlyTime}>{item.time}</Text>
                        <Text style={styles.weatherHourlyDay}>{item.day}</Text>
                        <Text style={styles.weatherHourlyEmoji}>☁️</Text>
                        <Text style={styles.weatherHourlyTemp}>{item.temp}°C</Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>

                {/* Sun Info */}
                <View style={styles.weatherSunSection}>
                  <View style={styles.weatherSunItem}>
                    <Text style={styles.weatherSunEmoji}>🌅</Text>
                    <Text style={styles.weatherSunLabel}>Sunrise</Text>
                    <Text style={styles.weatherSunTime}>06:54</Text>
                  </View>
                  <View style={styles.weatherSunDivider} />
                  <View style={styles.weatherSunItem}>
                    <Text style={styles.weatherSunEmoji}>🌇</Text>
                    <Text style={styles.weatherSunLabel}>Sunset</Text>
                    <Text style={styles.weatherSunTime}>18:24</Text>
                  </View>
                </View>

                {/* Weather Variables / Detailed Metrics */}
                <View style={styles.weatherVariablesSection}>
                  <TouchableOpacity 
                    style={styles.weatherVariablesHeader}
                    onPress={() => setShowWeatherVariables(!showWeatherVariables)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.weatherVariablesTitle}>Weather Variables</Text>
                    <FontAwesome 
                      name={showWeatherVariables ? "chevron-up" : "chevron-down"} 
                      size={16} 
                      color="#A78BFA" 
                    />
                  </TouchableOpacity>

                  {showWeatherVariables && (
                    <View style={styles.weatherDetailsGrid}>
                    <View style={styles.weatherDetailCard}>
                      <View style={styles.weatherDetailIconBox}>
                        <FontAwesome name="tint" size={20} color="#7C3AED" />
                      </View>
                      <Text style={styles.weatherDetailLabel}>Humidity</Text>
                      <Text style={styles.weatherDetailValue}>
                        {weatherData.current.humidity}%
                      </Text>
                    </View>

                    <View style={styles.weatherDetailCard}>
                      <View style={styles.weatherDetailIconBox}>
                        <MaterialIcons name="air" size={20} color="#7C3AED" />
                      </View>
                      <Text style={styles.weatherDetailLabel}>Wind Speed</Text>
                      <Text style={styles.weatherDetailValue}>
                        {Math.round(weatherData.current.wind_kph)} km/h
                      </Text>
                    </View>

                    <View style={styles.weatherDetailCard}>
                      <View style={styles.weatherDetailIconBox}>
                        <FontAwesome name="compass" size={20} color="#7C3AED" />
                      </View>
                      <Text style={styles.weatherDetailLabel}>Wind Dir</Text>
                      <Text style={styles.weatherDetailValue}>
                        {weatherData.current.wind_dir}
                      </Text>
                    </View>

                    <View style={styles.weatherDetailCard}>
                      <View style={styles.weatherDetailIconBox}>
                        <FontAwesome name="eye" size={20} color="#7C3AED" />
                      </View>
                      <Text style={styles.weatherDetailLabel}>Visibility</Text>
                      <Text style={styles.weatherDetailValue}>
                        {weatherData.current.visibility_km} km
                      </Text>
                    </View>

                    <View style={styles.weatherDetailCard}>
                      <View style={styles.weatherDetailIconBox}>
                        <FontAwesome name="tachometer" size={20} color="#7C3AED" />
                      </View>
                      <Text style={styles.weatherDetailLabel}>Pressure</Text>
                      <Text style={styles.weatherDetailValue}>
                        {weatherData.current.pressure_mb} mb
                      </Text>
                    </View>

                    <View style={styles.weatherDetailCard}>
                      <View style={styles.weatherDetailIconBox}>
                        <MaterialIcons name="water-drop" size={20} color="#7C3AED" />
                      </View>
                      <Text style={styles.weatherDetailLabel}>Precipitation</Text>
                      <Text style={styles.weatherDetailValue}>
                        {weatherData.current.precip_mm} mm
                      </Text>
                    </View>
                  </View>
                  )}
                </View>

              </ScrollView>
            ) : (
              <View style={styles.weatherErrorContainer}>
                <Text style={styles.weatherErrorText}>
                  Weather data not available
                </Text>
                <Text style={styles.weatherErrorSubtext}>
                  Please check your location settings
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
  const isUser = message.role === 'user';
  const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

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
    <Animated.View
      style={[
        styles.chatMessageWrapper,
        isUser ? styles.userMessageWrapper : styles.assistantMessageWrapper,
        {
          opacity,
          transform: [{ translateY }]
        }
      ]}
    >
      {!isUser && (
        <View style={styles.avatarContainer}>
          <MaterialIcons name="home" size={20} color="#2E7D32" />
        </View>
      )}
      
      <View style={[
        styles.messageBubble,
        isUser ? styles.userBubble : styles.assistantBubble
      ]}>
        <Text style={[
          styles.messageContent,
          isUser ? styles.userMessageText : styles.assistantMessageText
        ]}>
          {message.parts[0].text}
        </Text>
        <Text style={[
          styles.messageTime,
          isUser ? styles.userMessageTime : styles.assistantMessageTime
        ]}>
          {currentTime}
        </Text>
      </View>

      {isUser && (
        <View style={styles.userAvatarContainer}>
          <MaterialIcons name="person" size={20} color="#ffffff" />
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F8F3', // soft green-tinted background
  },
  topGradient: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    marginBottom: 16,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '92%',
  },
  weatherModalTitle: {
    fontSize: 18,
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
  newsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  newsCategory: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  newsCategoryText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  newsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  newsSource: {
    fontSize: 11,
    color: '#888',
    fontStyle: 'italic',
  },
  newsSourceBadge: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  newsSourceText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
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
  weatherCardRain: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginTop: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  weatherCardContent: {
    flexDirection: 'row',
    paddingTop: 14,
    paddingBottom: 14,
    paddingLeft: 18,
    paddingRight: 12,
    alignItems: 'center',
  },
  weatherCardLeft: {
    flex: 1,
  },
  weatherCardRight: {
    marginLeft: 10,
  },
  weatherCityName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 8,
  },
  weatherDateRain: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  weatherConditionRain: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  weatherFeelsLikeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  weatherFeelsLikeLabel: {
    fontSize: 14,
    color: '#666',
  },
  weatherFeelsLikeValue: {
    fontSize: 14,
    color: '#666',
  },
  weatherTempSpacer: {
    height: 10,
  },
  weatherTempRain: {
    fontSize: 42,
    fontWeight: '800',
    color: '#333',
    marginBottom: 5,
  },
  weatherMinMaxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weatherMinMaxText: {
    fontSize: 14,
    color: '#666',
  },
  weatherImageRain: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
  },
  weatherCard: {
    width: '100%',
    aspectRatio: 2.6,
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 16,
  },
  weatherCardImage: {
    resizeMode: 'cover',
  },
  weatherOverlay: {
    flex: 1,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },
  weatherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  weatherTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  weatherDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  weatherText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  weatherRefreshButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.25)',
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
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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
  chatMessageWrapper: {
    flexDirection: 'row',
    marginVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'flex-end',
    gap: 8,
  },
  userMessageWrapper: {
    justifyContent: 'flex-end',
  },
  assistantMessageWrapper: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBubble: {
    maxWidth: '75%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#2E7D32',
  },
  assistantBubble: {
    backgroundColor: '#f0f0f0',
  },
  messageContent: {
    fontSize: 15,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#ffffff',
  },
  assistantMessageText: {
    color: '#333333',
  },
  messageTime: {
    fontSize: 12,
    marginTop: 6,
  },
  userMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  assistantMessageTime: {
    color: '#999999',
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    color: 'red',
  },
  inputArea: {
    height: 'auto',
    minHeight: 70,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    backgroundColor: '#ffffff',
    gap: 10,
  },
  input: {
    height: 48,
    flex: 1,
    borderWidth: 1,
    borderColor: '#ced4da',
    backgroundColor: '#f8f9fa',
    borderRadius: 24,
    paddingLeft: 20,
    paddingRight: 16,
    fontSize: 14,
    color: '#333',
  },
  sendButton: {
    height: 48,
    width: 48,
    borderRadius: 24,
    borderWidth: 0,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  voiceButton: {
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2E7D32',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  voiceButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  voiceButtonActive: {
    backgroundColor: '#FF3B30',
    transform: [{ scale: 1.05 }],
  },
  loader: {
    width: 40,
    height: 40,
  },
  chat: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  assistantResponseBox: {
    marginHorizontal: 12,
    marginVertical: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2E7D32',
    backgroundColor: '#F0F7F0',
  },
  assistantResponseText: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '500',
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
  welcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  welcomeIconContainer: {
    padding: 16,
    backgroundColor: '#2E7D32',
    borderRadius: 16,
  },
  welcomeTextContainer: {
    flex: 1,
  },
  welcomeStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  weatherIconContainer: {
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 16,
  },
  weatherIconImage: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  weatherInfo: {
    flex: 1,
  },
  weatherSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  weatherDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  actionIconContainer: {
    padding: 12,
    borderRadius: 12,
    marginRight: 8,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF3B30',
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D1D5DB',
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#f0f0f0',
  },
  modalScrollView: {
    flexGrow: 0,
  },
  weatherModalSection: {
    marginBottom: 16,
  },

  weatherMainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  temperatureContainer: {
    alignItems: 'center',
  },
  temperatureText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  feelsLikeText: {
    fontSize: 14,
    color: '#666',
  },
  conditionContainer: {
    alignItems: 'center',
  },
  conditionText: {
    fontSize: 16,
    textAlign: 'center',
  },
  weatherDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  detailItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  detailValue: {
    fontSize: 12,
  },
  agricultureSection: {
    marginTop: 15,
  },
  agricultureContent: {
    marginTop: 10,
  },
  agricultureStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  agricultureStatusText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  alertsSection: {
    marginBottom: 10,
  },
  alertsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  alertText: {
    fontSize: 12,
    marginBottom: 2,
  },
  recommendationsSection: {
    marginBottom: 10,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  recommendationText: {
    fontSize: 12,
    marginBottom: 2,
  },
  modalCard: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  // New Weather Modal Styles - Matching App Design
  weatherModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  weatherModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 24,
    paddingBottom: 32,
    maxHeight: '90%',
    borderTopWidth: 4,
    borderTopColor: '#2E7D32',
  },
  weatherCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  weatherScrollView: {
    marginTop: 8,
    paddingHorizontal: 20,
  },
  weatherLoadingContainer: {
    paddingVertical: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weatherLoadingText: {
    color: '#333333',
    fontSize: 16,
    marginTop: 12,
  },

  // Header Card
  weatherHeaderCard: {
    backgroundColor: '#F0F9F0',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
  },
  weatherLocation: {
    color: '#333333',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  weatherDate: {
    color: '#666666',
    fontSize: 14,
    marginBottom: 16,
  },
  weatherMainContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  weatherTempSection: {
    flex: 1,
  },
  weatherTemperature: {
    fontSize: 56,
    fontWeight: '700',
    color: '#2E7D32',
    lineHeight: 62,
  },
  weatherFeelsLike: {
    color: '#666666',
    fontSize: 14,
    marginTop: 4,
  },
  weatherIconSection: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  weatherConditionEmoji: {
    fontSize: 64,
  },
  weatherCondition: {
    color: '#333333',
    fontSize: 16,
    marginBottom: 12,
  },
  weatherTempRange: {
    flexDirection: 'row',
    gap: 12,
  },
  tempRangeItem: {
    flex: 1,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  tempRangeLabel: {
    color: '#666666',
    fontSize: 12,
    marginBottom: 4,
  },
  tempRangeValue: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: '600',
  },

  // Hourly Forecast
  weatherHourlySection: {
    marginBottom: 24,
  },
  weatherSectionTitle: {
    color: '#333333',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  weatherHourlyScroll: {
    gap: 12,
  },
  weatherHourlyCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    minWidth: 100,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  weatherHourlyCardActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#2E7D32',
  },
  weatherHourlyTime: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  weatherHourlyDay: {
    color: '#666666',
    fontSize: 12,
    marginBottom: 8,
  },
  weatherHourlyEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  weatherHourlyTemp: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '600',
  },

  // Sun Info
  weatherSunSection: {
    flexDirection: 'row',
    backgroundColor: '#F0F9F0',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  weatherSunItem: {
    alignItems: 'center',
    flex: 1,
  },
  weatherSunEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  weatherSunLabel: {
    color: '#666666',
    fontSize: 12,
    marginBottom: 4,
  },
  weatherSunTime: {
    color: '#333333',
    fontSize: 14,
    fontWeight: '600',
  },
  weatherSunDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#C8E6C9',
    marginHorizontal: 8,
  },

  // Weather Variables / Detailed Metrics
  weatherVariablesSection: {
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  weatherVariablesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: '#F5F3FF',
  },
  weatherVariablesTitle: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '600',
  },
  weatherDetailCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  weatherDetailIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  weatherDetailLabel: {
    color: '#666666',
    fontSize: 11,
    marginBottom: 4,
    fontWeight: '500',
  },
  weatherDetailValue: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '600',
  },
  weatherErrorContainer: {
    paddingVertical: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weatherErrorText: {
    color: '#D32F2F',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  weatherErrorSubtext: {
    color: '#666666',
    fontSize: 14,
  },

  errorSubtext: {
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
  },
  newsStackContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  noNewsText: {
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: 32,
    fontStyle: 'italic',
  },
  newsCounter: {
    marginLeft: 'auto',
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
  },

  // New Chat Modal Styles - Bottom Sheet
  chatBlurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  chatOverlayTouchable: {
    flex: 1,
  },
  chatModalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '85%',
    backgroundColor: 'transparent',
  },
  chatModalContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    overflow: 'hidden',
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  chatModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
    backgroundColor: '#FFFFFF',
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chatBotIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(45, 106, 79, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatBotTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.3,
  },
  chatHeaderControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatControlButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  chatCloseButton: {
    marginLeft: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
  },
  chatLanguageBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
    backgroundColor: '#FAFAFA',
  },
  chatLanguageScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  chatLanguageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  chatLanguageButtonActive: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  chatLanguageButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  chatLanguageButtonTextActive: {
    color: '#FFFFFF',
  },
  chatMessagesArea: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  chatWelcomeMessage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  chatWelcomeIcon: {
    marginBottom: 16,
  },
  chatWelcomeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  chatWelcomeSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 20,
  },
  chatLoadingContainer: {
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatQuickActions: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
    backgroundColor: '#FAFAFA',
  },
  chatQuickButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    alignItems: 'center',
  },
  chatQuickButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  chatInputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
    backgroundColor: '#FFFFFF',
  },
  chatInputArea: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 24,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  chatInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
    backgroundColor: 'transparent',
  },
  chatAttachButton: {
    padding: 8,
    marginLeft: 8,
  },
  chatButtonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatMicButton: {
    width: 64,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'column',
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  chatMicButtonActive: {
    backgroundColor: '#FF3B30',
    shadowColor: '#FF3B30',
  },
  chatMicButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  chatSendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
});