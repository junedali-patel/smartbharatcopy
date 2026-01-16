import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as Speech from 'expo-speech';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useState, useMemo } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColor } from '../../hooks/useThemeColor';
import VoiceService from '../../services/VoiceService';
import { GEMINI_API_KEY, isGeminiAvailable, getGeminiModel } from '../../constants/config';
import FirebaseTaskService, { Task } from '../../services/firebaseTaskService';
import LocalTaskService from '../../services/taskService';
import NotificationService from '../../services/notificationService';
import UserService from '../../services/userService';
import { getAuth, onAuthStateChanged } from '../../config/firebase';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '../../constants/newDesignSystem';
import { StyledHeader, PrimaryCard, StyledCard, StyledButton, Heading2, CaptionText, BodyText } from '../../components/StyledComponents';

// Initialize Gemini API
const genAI = isGeminiAvailable() ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

export default function TasksScreen() {
  // Design system colors
  const backgroundColor = Colors.background.light;
  const cardBackground = Colors.white;
  const textColor = Colors.text.primary;
  const accentColor = Colors.primary;
  const borderColor = Colors.border;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [assistantResponse, setAssistantResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
  const [lastSpeechTime, setLastSpeechTime] = useState<number>(0);
  const AUTO_STOP_DELAY = 1500; // 1.5 seconds delay before auto-stopping
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [selectedStatus, setSelectedStatus] = useState<'ongoing' | 'completed' | 'all'>('ongoing');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'farming' | 'personal' | 'general'>('all');
  const categories: ('all' | 'farming' | 'personal' | 'general')[] = ['all', 'farming', 'personal', 'general'];
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Initialize FirebaseTaskService and local TaskService
  const taskService = useMemo(() => FirebaseTaskService.getInstance(), []);
  const localTaskService = useMemo(() => LocalTaskService.getInstance(), []);

  useEffect(() => {
    console.log('TasksScreen: Setting up auth listener');
    const auth = getAuth();
    
    // Check if auth is available (it's null on Expo Go)
    if (!auth) {
      console.warn('TasksScreen: Auth not available on this platform (Expo Go) - Using Demo Mode');
      // Demo mode: set a default user for Expo Go
      setCurrentUser({ uid: 'demo-user', email: 'demo@smartbharat.local' });
      return;
    }
    
    // Listen for auth state changes
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      console.log('TasksScreen: Auth state changed, user:', user?.uid);
      setCurrentUser(user);
    });
    
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    console.log('TasksScreen: Component mounted, setting up task listener');
    
    // Only initialize if user is authenticated
    if (!currentUser) {
      console.log('TasksScreen: User not authenticated, waiting...');
      return;
    }
    
    // Initialize notifications and register FCM tokens
    const initializeNotifications = async () => {
      try {
        const notificationService = NotificationService.getInstance();
        const userService = UserService.getInstance();
        
        // Request notification permissions
        const hasPermission = await notificationService.checkNotificationPermissions();
        if (!hasPermission) {
          const granted = await notificationService.requestPermissions();
          if (!granted) {
            console.log('Notification permissions not granted');
            return;
          }
        }
        
        // Register FCM tokens with user profile
        await userService.registerFCMToken();
        console.log('TasksScreen: Notifications initialized and FCM tokens registered');
      } catch (error) {
        console.error('TasksScreen: Error initializing notifications:', error);
      }
    };
    
    initializeNotifications();
    
    // Subscribe to task updates from TaskService
    const handleTaskUpdate = (updatedTasks: Task[]) => {
      console.log('TasksScreen: Received task update:', updatedTasks.length, 'tasks');
      setTasks([...updatedTasks]); // Force a new array reference
    };

    // Add listener with error handling
    try {
      taskService.addListener(handleTaskUpdate);
      console.log('TasksScreen: Listener added successfully');
    } catch (error) {
      console.error('TasksScreen: Error adding listener:', error);
    }

    // Also manually load tasks to ensure we have initial data
    const loadInitialTasks = async () => {
      try {
        const initialTasks = await taskService.getTasks();
        console.log('TasksScreen: Loaded initial tasks:', initialTasks.length);
        setTasks(initialTasks);
      } catch (error) {
        console.error('TasksScreen: Error loading initial tasks:', error);
        // If real-time listener fails, set up a fallback timer to refresh tasks
        const refreshInterval = setInterval(async () => {
          try {
            const refreshedTasks = await taskService.getTasks();
            setTasks(refreshedTasks);
          } catch (refreshError) {
            console.error('TasksScreen: Error in refresh interval:', refreshError);
          }
        }, 5000); // Refresh every 5 seconds as fallback
        
        // Cleanup interval on unmount
        return () => clearInterval(refreshInterval);
      }
    };
    
    loadInitialTasks();

    // Cleanup listener on unmount
    return () => {
      console.log('TasksScreen: Component unmounting, removing listener');
      try {
        taskService.removeListener(handleTaskUpdate);
      } catch (error) {
        console.error('TasksScreen: Error removing listener:', error);
      }
    };
  }, [taskService]);

  // Add a manual refresh function
  const refreshTasks = async () => {
    try {
      console.log('TasksScreen: Manually refreshing tasks...');
      const refreshedTasks = await taskService.getTasks();
      console.log('TasksScreen: Refreshed tasks:', refreshedTasks.length);
      setTasks(refreshedTasks);
    } catch (error) {
      console.error('TasksScreen: Error refreshing tasks:', error);
      setError('Failed to load tasks. Please try again.');
    }
  };

  const { ongoingTasks, completedTasks } = useMemo(() => {
    const ongoing: Task[] = [];
    const completed: Task[] = [];
    tasks.forEach(task => {
      if (task.completed) {
        completed.push(task);
      } else {
        ongoing.push(task);
      }
    });
    return { ongoingTasks: ongoing, completedTasks: completed };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    if (selectedCategory === 'all') {
      return ongoingTasks;
    }
    return ongoingTasks.filter(task => task.category === selectedCategory);
  }, [ongoingTasks, selectedCategory]);

  const groupedTasks = useMemo(() => {
    const groups: { high: Task[], medium: Task[], low: Task[] } = {
      high: [],
      medium: [],
      low: [],
    };
    filteredTasks.forEach(task => {
      if (groups[task.priority]) {
        groups[task.priority].push(task);
      }
    });
    return groups;
  }, [filteredTasks]);

  // Initialize VoiceService
  const voiceService = VoiceService.getInstance();

  useEffect(() => {
    // Set up speech result callback
    voiceService.setOnSpeechResult((text) => {
      // Only process voice input if we're actively listening on the tasks screen
      if (isListening) {
        setCurrentTranscript(text);
        setLastSpeechTime(Date.now());
        processCommand(text);
      }
    });

    // Set up speech end callback
    voiceService.setOnSpeechEnd(() => {
      setTimeout(() => {
        if (isListening) {
          stopListening();
        }
      }, AUTO_STOP_DELAY);
    });

    return () => {
      // Clean up - stop listening and clear callbacks when leaving this screen
      if (isListening) {
        voiceService.stopListening();
      }
      voiceService.setOnSpeechResult(null);
      voiceService.setOnSpeechEnd(null);
    };
  }, [isListening]);

  const scheduleReminder = async (task: Task) => {
    const now = new Date();
    let reminderTime = new Date(`${task.dueDate}T${task.dueTime}`);
    
    // If the time has passed, schedule for next day
    if (reminderTime < now) {
      reminderTime.setDate(reminderTime.getDate() + 1);
    }

    if (Platform.OS === 'web') {
      // Use browser's Notification API for web
      const timeout = reminderTime.getTime() - now.getTime();
      if (timeout > 0) {
        setTimeout(() => {
          new Notification('Task Reminder', {
            body: `Time to ${task.title}`,
            icon: '/icon.png',
            requireInteraction: true,
          });
        }, timeout);
      }
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Task Reminder",
        body: `Time to ${task.title}`,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 250, 250, 250],
        autoDismiss: false,
        sticky: true,
        categoryIdentifier: 'reminder',
        data: { taskId: task.id },
      },
      trigger: {
        date: reminderTime,
        channelId: 'default',
      },
    });
  };

  const stopListening = async () => {
    try {
      await voiceService.stopListening();
      setIsListening(false);
    } catch (error) {
      console.error('Error stopping voice input:', error);
    }
  };

  const processCommand = async (command: string) => {
    try {
      setIsProcessing(true);
      setError(null);
      
      const model = getGeminiModel(genAI);

      // Check if user is authenticated first
      const auth = getAuth();
      const directUser = auth?.currentUser;
      const isAuthenticated = !!(currentUser?.uid || directUser?.uid);
      
      // Fast local parse: attempt a quick parse locally to avoid waiting on Gemini
      // But ONLY use it as-is if user is NOT authenticated; otherwise fall through to AI for full processing
      if (!isAuthenticated) {
        try {
          const localParsed = localTaskService.parseTaskFromText(command);
          if (localParsed && localParsed.title && localParsed.title.trim().length > 0) {
            const addedLocal = await localTaskService.addTask(localParsed as any);
            setAssistantResponse(`Task saved locally: "${addedLocal.title}"`);
            await stopListening();
            setIsProcessing(false);
            return;
          }
        } catch (e) {
          console.warn('Local parse for unauthenticated user failed', e);
        }
      }
      // If authenticated, skip the fast parse and go directly to AI + Firebase for accurate processing
      
      // First check if this is a task completion command
      const completionPatterns = [
        /i (just )?(went|did|completed|finished|watered) (.+)/i,
        /i have (just )?(gone|done|completed|finished|watered) (.+)/i,
        /i'm done with (.+)/i,
        /i finished (.+)/i,
        /i (just )?watered (.+)/i,
        /i have (just )?watered (.+)/i
      ];

      for (const pattern of completionPatterns) {
        const match = command.match(pattern);
        if (match) {
          const taskDescription = match[3] || match[2] || match[1];
          
          // Split the description by common conjunctions and phrases to handle multiple tasks
          // Handle "both X and Y", "X and Y", "X, Y", "X & Y" patterns
          let taskDescriptions: string[] = [];
          
          // Check for "both X and Y" pattern first
          const bothPattern = /both (.+?) and (.+)/i;
          const bothMatch = taskDescription.match(bothPattern);
          if (bothMatch) {
            taskDescriptions = [bothMatch[1].trim(), bothMatch[2].trim()];
          } else {
            // Split by common conjunctions
            taskDescriptions = taskDescription.split(/\s+(?:and|&|,)\s+/);
          }
          
          const completedTasks: Task[] = [];
          
          // Check each task description
          for (const desc of taskDescriptions) {
            const trimmedDesc = desc.trim();
            if (!trimmedDesc) continue;
            
            // Find matching task using improved fuzzy matching
            const matchingTask = tasks.find(task => {
              const taskWords = task.title.toLowerCase().split(/\s+/);
              const descriptionWords = trimmedDesc.toLowerCase().split(/\s+/);
              
              // Check if the task description contains key words from the task title
              const hasKeyWords = descriptionWords.some(word => 
                taskWords.some(taskWord => 
                  taskWord.includes(word) || word.includes(taskWord)
                )
              );

              // Check if the task title contains key words from the description
              const hasTitleWords = taskWords.some(word =>
                descriptionWords.some(descWord =>
                  word.includes(descWord) || descWord.includes(word)
                )
              );

              return hasKeyWords || hasTitleWords;
            });
            
            if (matchingTask && !completedTasks.find(t => t.id === matchingTask.id)) {
              completedTasks.push(matchingTask);
            }
          }
          
          if (completedTasks.length > 0) {
            // Mark all matching tasks as completed using TaskService
            for (const completedTask of completedTasks) {
              await taskService.toggleTaskStatus(completedTask.id);
            }
            
            // Refresh tasks to show the updated status
            await refreshTasks();
            
            if (completedTasks.length === 1) {
              setAssistantResponse(`Great! I've marked "${completedTasks[0].title}" as completed.`);
            } else {
              const taskTitles = completedTasks.map(task => `"${task.title}"`).join(' and ');
              setAssistantResponse(`Great! I've marked ${taskTitles} as completed.`);
            }
            
            await stopListening();
            return;
          }
        }
      }
      
      const prompt = `You are a task management assistant. Your job is to understand voice commands and convert them into tasks.
      
      First, check if this command is about completing an existing task. If it is, return null.
      
      If it's a new task, correct any speech recognition errors in the command. Common errors include:
      - "adidas" should be "add a task"
      - "tassk" should be "task"
      - "add a" might be misheard as "adidas", "adidas", "adidas"
      - "task" might be misheard as "tax", "tusk", "tusk"
      - "water" might be misheard as "what are", "water", "water"
      - "plants" might be misheard as "plans", "plants", "plants"
      
      Original command: "${command}"
      
      If this is a new task, extract the following information in JSON format. Return ONLY the JSON object without any markdown formatting or backticks:
      {
        "title": "task title (the complete task description)",
        "priority": "high/medium/low",
        "category": "category name",
        "dueDate": "YYYY-MM-DD",
        "dueTime": "HH:MM"
      }
      
      If this is a task completion command, return null.
      
      Important rules for task title:
      1. Include the complete task description
      2. If the command starts with "add a task" or similar, remove that prefix
      3. Keep all details about what needs to be done
      4. For watering tasks, use consistent wording like "water the plants" or "water the garden"
      
      Category Rules:
      - Use "farming" for any tasks related to:
        * Plants, gardening, crops
        * Farming equipment
        * Watering plants
        * Agricultural activities
        * Farm maintenance
        * Harvesting
        * Soil work
      
      - Use "personal" for tasks like:
        * Personal appointments
        * Family matters
        * Health-related tasks
        * Personal errands
        * Social activities
      
      - Use "general" for:
        * Work-related tasks
        * Shopping (unless it's farming equipment)
        * Administrative tasks
        * General maintenance
        * Default category when unsure
      
      If any information is not specified, use these defaults:
      - priority: medium
      - category: general
      - dueDate: today's date
      - dueTime: current time + 1 hour
      
      Example commands and their corrections:
      - "adidas water the plants" -> category: "farming", title: "water the plants"
      - "add a tassk with high priority to water the plants" -> category: "farming", title: "water the plants", priority: "high"
      - "buy farming equipment" -> category: "farming", title: "buy farming equipment"
      - "schedule doctor appointment" -> category: "personal", title: "schedule doctor appointment"
      - "buy groceries" -> category: "general", title: "buy groceries"
      - "call mom" -> category: "personal", title: "call mom"
      
      Example completion commands (should return null):
      - "I just went to the market"
      - "I have completed watering the plants"
      - "I'm done with the shopping"`;

      const result = await model?.generateContent(prompt);
      const response = await result?.response;
      const text = response?.text() || '';
      
      // If the response is "null" or empty, it's a completion command
      if (text.trim().toLowerCase() === 'null' || !text.trim()) {
        setAssistantResponse("I understand you've completed a task. If it wasn't marked as complete, please try again with more specific details.");
        await stopListening();
        return;
      }
      
      // Clean up the response to ensure it's valid JSON
      const cleanJson = text
        .replace(/```json\s*/g, '')
        .replace(/```\s*$/g, '')
        .replace(/⁠  json/g, '')
        .replace(/  ⁠/g, '')
        .trim();
      
      try {
        // Parse the JSON response
        const taskData = JSON.parse(cleanJson);
        
        // Check if a similar task already exists - improved similarity detection
        const existingTask = tasks.find(task => {
          const taskWords = task.title.toLowerCase().split(/\s+/).filter((word: string) => word.length > 2);
          const newTaskWords = taskData.title.toLowerCase().split(/\s+/).filter((word: string) => word.length > 2);
          
          // Calculate word overlap
          const commonWords = taskWords.filter((word: string) => 
            newTaskWords.some((newWord: string) => 
              word === newWord || 
              (word.length > 3 && newWord.length > 3 && (word.includes(newWord) || newWord.includes(word)))
            )
          );
          
          // Calculate similarity percentage
          const totalWords = Math.max(taskWords.length, newTaskWords.length);
          const similarityPercentage = commonWords.length / totalWords;
          
          // Consider tasks similar only if they have high word overlap (more than 60% similar words)
          // AND the tasks are actually about the same activity
          const isSimilar = similarityPercentage > 0.6 && 
                           (taskWords.length > 1 && newTaskWords.length > 1) &&
                           commonWords.length >= 2;
          
          return isSimilar;
        });
        
        if (existingTask) {
          setAssistantResponse(`A similar task "${existingTask.title}" already exists.`);
          await stopListening();
          return;
        }
        
        // Add the new task using TaskService
        console.log('TasksScreen: Chatbot task data from AI:', taskData);
        
        // Check if user is authenticated
        console.log('TasksScreen: Current user from state:', currentUser?.uid);
        
        // Also check directly from Firebase auth to make sure
        const auth = getAuth();
        const directUser = auth.currentUser;
        console.log('TasksScreen: Direct user from auth:', directUser?.uid);
        
        if (!currentUser && !directUser) {
          console.error('TasksScreen: No authenticated user found in either state or auth');
          setError('Please log in to add tasks.');
          return;
        }
        
        // Use the full command for parsing to get proper date handling
        const newTaskData = taskService.parseTaskFromText(command);
        newTaskData.priority = taskData.priority || newTaskData.priority;
        newTaskData.category = taskData.category || newTaskData.category;
        // Use the date from parseTaskFromText (which handles date keywords) instead of AI's date
        // newTaskData.dueDate is already set correctly by parseTaskFromText
        newTaskData.dueTime = taskData.dueTime || newTaskData.dueTime;
        
        console.log('TasksScreen: Final task data for Firebase:', newTaskData);
        
        try {
          console.log('TasksScreen.processCommand: Attempting to add task to Firebase...', {
            userId: currentUser?.uid || directUser?.uid,
            taskTitle: newTaskData.title,
            taskData: newTaskData,
            timestamp: new Date().toISOString()
          });
          
          const addedTask = await taskService.addTask(newTaskData);
          console.log('TasksScreen.processCommand: Task added response from service:', {
            taskId: addedTask.id,
            taskTitle: addedTask.title,
            taskUserId: addedTask.userId,
            timestamp: new Date().toISOString()
          });
          
          // Verify the task was actually added by fetching tasks again
          const verificationTasks = await taskService.getTasks();
          console.log('TasksScreen.processCommand: Verification - fetched tasks:', {
            totalTasks: verificationTasks.length,
            taskIds: verificationTasks.map(t => t.id),
            taskTitles: verificationTasks.map(t => t.title),
            timestamp: new Date().toISOString()
          });
          
          const foundTask = verificationTasks.find(t => t.id === addedTask.id);
          console.log('TasksScreen.processCommand: Verification - task found in list:', !!foundTask, {
            taskId: addedTask.id,
            timestamp: new Date().toISOString()
          });
          
          if (!foundTask) {
            console.error('TasksScreen.processCommand: Task was not found in Firebase after adding!', {
              expectedId: addedTask.id,
              taskReturnedUserId: addedTask.userId,
              timestamp: new Date().toISOString()
            });
            setError('Task was not saved to database. Please try again.');
            return;
          }
          
          // Refresh tasks to show the newly added task
          console.log('TasksScreen.processCommand: Refreshing task list after successful add...');
          await refreshTasks();
          console.log('TasksScreen.processCommand: Task refresh complete');
        } catch (addError) {
          console.error('TasksScreen.processCommand: Error adding task to Firebase:', {
            error: addError,
            errorMessage: (addError as any)?.message,
            taskData: newTaskData,
            userId: currentUser?.uid || directUser?.uid,
            timestamp: new Date().toISOString()
          });
          setError('Failed to add task to database. Please try again.');
          return;
        }
        
        // Generate a response for the user
        const responsePrompt = `Generate a brief confirmation message for adding a task with the following details:
        - Title: ${taskData.title}
        - Priority: ${taskData.priority}
        - Category: ${taskData.category}
        - Due: ${taskData.dueDate} at ${taskData.dueTime}
        
        Keep the response friendly and concise.`;
        
        const responseResult = await model?.generateContent(responsePrompt);
        let responseText = await responseResult?.response.text() || '';
        
        // Strip markdown symbols and special characters before speaking
        responseText = responseText
          .replace(/[*_#`~\[\](){}]/g, '') // Remove markdown
          .replace(/[!?]/g, '.') // Replace punctuation with periods
          .trim();
        
        setAssistantResponse(responseText);
        
        // Speak the response (on web, skip TTS to avoid symbol reading)
        if (responseText && Platform.OS !== 'web') {
          Speech.speak(responseText, {
            language: 'en',
            pitch: 1.0,
            rate: 0.9,
          });
        }
        
        // Reset transcript
        setCurrentTranscript('');
        setTranscript('');
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError);
        console.log('Raw response:', text);
        console.log('Cleaned JSON:', cleanJson);
        setError('Error processing command. Please try again.');
      }
      
    } catch (err) {
      console.error('Error processing command:', err);
      setError('Error processing command. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const addTask = async () => {
    if (!newTask.trim()) return;

    console.log('TasksScreen: Adding task:', newTask);

    try {
      setIsProcessing(true);
      setError(null);

      const taskData = taskService.parseTaskFromText(newTask);
      
      const addedTask = await taskService.addTask(taskData);
      
      // Refresh tasks to show the newly added task
      await refreshTasks();
      
      setNewTask('');
    } catch (error) {
      console.error('Error adding task:', error);
      setError('Failed to add task. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleTaskStatus = async (taskId: string) => {
    try {
      await taskService.toggleTaskStatus(taskId);
      // Refresh tasks to show the updated status
      await refreshTasks();
    } catch (error) {
      console.error('Error toggling task status:', error);
      setError('Failed to update task. Please try again.');
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await taskService.deleteTask(taskId);
      // Refresh tasks to show the deletion
      await refreshTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      setError('Failed to delete task. Please try again.');
    }
  };

  const toggleListening = async () => {
    try {
      if (isListening) {
        await stopListening();
      } else {
        setLastSpeechTime(Date.now());
        await voiceService.startListening();
        setIsListening(true);
      }
    } catch (error) {
      console.error('Error handling mic press:', error);
      Alert.alert('Error', 'Failed to handle voice input');
      setIsListening(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#e53935';
      case 'medium':
        return '#fb8c00';
      case 'low':
        return '#43a047';
      default:
        return '#757575';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'farming':
        return 'leaf';
      case 'personal':
        return 'user';
      case 'general':
        return 'briefcase';
      default:
        return 'check-square-o';
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.background.light }]}>
      {/* Header */}
      <StyledHeader 
        title="My Tasks"
        subtitle="FARM OPERATIONS"
        rightActions={
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={refreshTasks}
            >
              <MaterialIcons
                name="history"
                size={20}
                color={Colors.text.secondary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setSelectedStatus(selectedStatus === 'ongoing' ? 'completed' : 'ongoing')}
            >
              <MaterialIcons
                name="tune"
                size={20}
                color={Colors.text.secondary}
              />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Voice Command Card */}
        <PrimaryCard>
          <View style={styles.voiceCardContent}>
            <View style={styles.voiceInfo}>
              <View style={styles.voiceIconContainer}>
                <MaterialIcons name="mic" size={24} color={Colors.white} />
              </View>
              <View>
                <Text style={styles.voiceTitle}>Voice Command</Text>
                <Text style={styles.voiceSubtitle}>
                  {isListening ? currentTranscript || 'Listening...' : '"Add task: Check irrigation..."'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={toggleListening}
              style={[styles.voiceButton, isListening && styles.voiceButtonActive]}
              activeOpacity={0.7}
            >
              {isListening ? (
                <View style={styles.voiceWaveform}>
                  <View style={[styles.waveBars, { height: '40%' }]} />
                  <View style={[styles.waveBars, { height: '70%' }]} />
                  <View style={[styles.waveBars, { height: '40%' }]} />
                </View>
              ) : (
                <MaterialIcons name="mic" size={20} color={Colors.white} />
              )}
            </TouchableOpacity>
          </View>
        </PrimaryCard>

        {/* Add Task Input */}
        <View style={styles.addTaskSection}>
          <View style={styles.addTaskContainer}>
            <MaterialIcons name="add" size={20} color={Colors.text.tertiary} />
            <TextInput
              style={styles.addTaskInput}
              placeholder="Add a new task..."
              placeholderTextColor={Colors.text.tertiary}
              value={newTask}
              onChangeText={setNewTask}
              onSubmitEditing={addTask}
            />
            <TouchableOpacity onPress={addTask} disabled={!newTask.trim()}>
              <Text style={[styles.createButton, !newTask.trim() && { opacity: 0.5 }]}>CREATE</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Status Filters */}
        <View style={styles.statusFilters}>
          <TouchableOpacity
            style={[styles.statusFilter, selectedStatus === 'ongoing' && styles.statusFilterActive]}
            onPress={() => setSelectedStatus('ongoing')}
          >
            <Text style={[styles.statusFilterText, selectedStatus === 'ongoing' && styles.statusFilterTextActive]}>
              Ongoing ({ongoingTasks.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statusFilter, selectedStatus === 'completed' && styles.statusFilterActive]}
            onPress={() => setSelectedStatus('completed')}
          >
            <Text style={[styles.statusFilterText, selectedStatus === 'completed' && styles.statusFilterTextActive]}>
              Done ({completedTasks.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tasks List */}
        <View style={styles.tasksContainer}>
          {selectedStatus === 'ongoing' && ongoingTasks.length === 0 ? (
            <EmptyState title="No active tasks" subtitle="Your farming schedule is clear. Add a new task to begin." />
          ) : selectedStatus === 'completed' && completedTasks.length === 0 ? (
            <EmptyState title="No completed tasks" subtitle="You haven't completed any tasks yet." />
          ) : (
            <>
              {selectedStatus === 'ongoing' && ongoingTasks.length > 0 && (
                <TaskGroup title="High Priority" tasks={ongoingTasks.filter(t => t.priority === 'high')} onToggle={toggleTaskStatus} onDelete={deleteTask} />
              )}
              {selectedStatus === 'ongoing' && ongoingTasks.filter(t => t.priority === 'medium').length > 0 && (
                <TaskGroup title="Medium Priority" tasks={ongoingTasks.filter(t => t.priority === 'medium')} onToggle={toggleTaskStatus} onDelete={deleteTask} />
              )}
              {selectedStatus === 'ongoing' && ongoingTasks.filter(t => t.priority === 'low').length > 0 && (
                <TaskGroup title="Low Priority" tasks={ongoingTasks.filter(t => t.priority === 'low')} onToggle={toggleTaskStatus} onDelete={deleteTask} />
              )}

              {selectedStatus === 'completed' && completedTasks.length > 0 && (
                completedTasks.map(task => (
                  <TaskItem key={task.id} task={task} onToggle={toggleTaskStatus} onDelete={deleteTask} />
                ))
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Clear All Confirmation Modal */}
      {showClearConfirm && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Clear All Tasks</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete all tasks? This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <StyledButton
                title="Cancel"
                onPress={() => setShowClearConfirm(false)}
                variant="outline"
              />
              <StyledButton
                title="Clear All"
                onPress={async () => {
                  try {
                    await taskService.clearAllTasks();
                    await refreshTasks();
                    setShowClearConfirm(false);
                  } catch (error) {
                    console.error('Error clearing tasks:', error);
                    setError('Failed to clear tasks. Please try again.');
                    setShowClearConfirm(false);
                  }
                }}
                variant="primary"
              />
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// Helper Components
function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.emptyState}>
      <MaterialIcons name="inbox" size={56} color={Colors.slate[300]} />
      <Heading2 style={styles.emptyTitle}>{title}</Heading2>
      <BodyText style={styles.emptySubtitle}>{subtitle}</BodyText>
    </View>
  );
}

interface TaskGroupProps {
  title: string;
  tasks: Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

function TaskGroup({ title, tasks, onToggle, onDelete }: TaskGroupProps) {
  if (tasks.length === 0) return null;

  return (
    <View style={styles.taskGroup}>
      <View style={styles.groupHeader}>
        <Heading2>{title}</Heading2>
        <Text style={styles.taskCount}>{tasks.length}</Text>
      </View>
      {tasks.map(task => (
        <TaskItem key={task.id} task={task} onToggle={onToggle} onDelete={onDelete} />
      ))}
    </View>
  );
}

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  const taskCardStyle = task.completed ? [styles.taskCard, { opacity: 0.6 }] : styles.taskCard;
  
  return (
    <StyledCard style={taskCardStyle as any} onPress={() => onToggle(task.id)}>
      <View style={styles.taskCardContent}>
        <TouchableOpacity
          style={[styles.checkbox, { borderColor: Colors.primary }]}
          onPress={() => onToggle(task.id)}
          activeOpacity={0.7}
        >
          {task.completed && (
            <MaterialIcons name="check" size={16} color={Colors.primary} />
          )}
        </TouchableOpacity>

        <View style={styles.taskInfo}>
          <Text style={[styles.taskTitle, task.completed && { textDecorationLine: 'line-through' }]}>
            {task.title}
          </Text>
          <View style={styles.taskMeta}>
            <MaterialIcons name="schedule" size={14} color={Colors.text.tertiary} />
            <Text style={styles.taskDate}>{task.dueDate} at {task.dueTime}</Text>
            {task.category !== 'general' && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{task.category.toUpperCase()}</Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity onPress={() => onDelete(task.id)} style={styles.deleteButton}>
          <MaterialIcons name="close" size={20} color={Colors.error} />
        </TouchableOpacity>
      </View>
    </StyledCard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.light,
  },

  scrollContent: {
    paddingBottom: Spacing[8],
  },

  headerActions: {
    flexDirection: 'row',
    gap: Spacing[2],
    marginBottom: Spacing[1],
  },

  actionButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.default,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.slate[200],
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },

  // Voice Card
  voiceCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  voiceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[4],
    flex: 1,
  },

  voiceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.default,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  voiceTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: '600',
    color: Colors.white,
    marginBottom: Spacing[1],
  },

  voiceSubtitle: {
    fontSize: Typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
  },

  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.default,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  voiceButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },

  voiceWaveform: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing[1],
    height: 20,
  },

  waveBars: {
    width: 2,
    backgroundColor: Colors.white,
    borderRadius: 1,
  },

  // Add Task Section
  addTaskSection: {
    marginHorizontal: Spacing[4],
    marginTop: Spacing[4],
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[4],
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.default,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },

  addTaskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },

  addTaskInput: {
    flex: 1,
    fontSize: Typography.sizes.base,
    color: Colors.text.primary,
    paddingVertical: Spacing[2],
  },

  createButton: {
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
    color: Colors.primary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Status Filters
  statusFilters: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[4],
    gap: Spacing[2],
  },

  statusFilter: {
    flex: 1,
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[3],
    borderRadius: BorderRadius.default,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusFilterActive: {
    backgroundColor: Colors.primary,
  },

  statusFilterText: {
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'center',
  },

  statusFilterTextActive: {
    color: Colors.white,
  },

  // Tasks Container
  tasksContainer: {
    paddingHorizontal: Spacing[4],
  },

  // Empty State
  emptyState: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing[8],
    alignItems: 'center',
    marginTop: Spacing[6],
    borderWidth: 1,
    borderColor: Colors.border,
  },

  emptyTitle: {
    marginTop: Spacing[4],
  },

  emptySubtitle: {
    marginTop: Spacing[2],
    textAlign: 'center',
    color: Colors.text.secondary,
  },

  // Task Group
  taskGroup: {
    marginVertical: Spacing[4],
  },

  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[3],
  },

  taskCount: {
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
    color: Colors.text.secondary,
    backgroundColor: Colors.slate[100],
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.full,
  },

  // Task Card
  taskCard: {
    marginHorizontal: 0,
    marginVertical: Spacing[2],
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },

  taskCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },

  taskInfo: {
    flex: 1,
  },

  taskTitle: {
    fontSize: Typography.sizes.base,
    fontWeight: '600',
    color: Colors.text.primary,
    marginBottom: Spacing[2],
  },

  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },

  taskDate: {
    fontSize: Typography.sizes.xs,
    color: Colors.text.tertiary,
  },

  categoryBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: BorderRadius.full,
    marginLeft: Spacing[2],
  },

  categoryBadgeText: {
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
    color: Colors.white,
  },

  deleteButton: {
    padding: Spacing[2],
  },

  // Modal
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    backgroundColor: Colors.white,
    padding: Spacing[6],
    borderRadius: BorderRadius.lg,
    width: '85%',
    alignItems: 'center',
    ...Shadows.lg,
  },

  modalTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: '700',
    color: Colors.text.primary,
    marginBottom: Spacing[2],
  },

  modalMessage: {
    fontSize: Typography.sizes.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing[6],
    lineHeight: Typography.sizes.base * 1.5,
  },

  modalButtons: {
    flexDirection: 'row',
    gap: Spacing[3],
    width: '100%',
  },
});