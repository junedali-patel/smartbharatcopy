import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as Speech from 'expo-speech';
import * as Notifications from 'expo-notifications';
import React, { useEffect, useState, useMemo } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColor } from '../../hooks/useThemeColor';
import VoiceService from '../../services/VoiceService';
import { GEMINI_API_KEY, isGeminiAvailable } from '../../constants/config';
import FirebaseTaskService, { Task } from '../../services/firebaseTaskService';
import NotificationService from '../../services/notificationService';
import UserService from '../../services/userService';
import { auth } from '../../services/firebase';

// Initialize Gemini API
const genAI = isGeminiAvailable() ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
});

export default function TasksScreen() {
  
  // Use white background for all layouts
  const backgroundColor = '#ffffff';
  const cardBackground = '#ffffff';
  const textColor = useThemeColor({ light: '#333333', dark: '#333333' }, 'text');
  const accentColor = useThemeColor({ light: '#2E7D32', dark: '#2E7D32' }, 'tint');
  const borderColor = '#e0e0e0';

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

  const [selectedCategory, setSelectedCategory] = useState<'all' | 'farming' | 'personal' | 'general'>('all');
  const categories: ('all' | 'farming' | 'personal' | 'general')[] = ['all', 'farming', 'personal', 'general'];
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Initialize FirebaseTaskService
  const taskService = useMemo(() => FirebaseTaskService.getInstance(), []);

  useEffect(() => {
    console.log('TasksScreen: Component mounted, setting up task listener');
    
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
      
      const model = genAI?.getGenerativeModel({ model: "gemini-1.5-flash" });
      
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
        const currentUser = auth.currentUser;
        console.log('TasksScreen: Current user:', currentUser?.uid);
        
        if (!currentUser) {
          console.error('TasksScreen: No authenticated user found');
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
          console.log('TasksScreen: Attempting to add task to Firebase...');
          const addedTask = await taskService.addTask(newTaskData);
          console.log('TasksScreen: Chatbot task added to Firebase:', addedTask);
          
          // Verify the task was actually added by fetching tasks again
          const verificationTasks = await taskService.getTasks();
          console.log('TasksScreen: Verification - total tasks in Firebase:', verificationTasks.length);
          const foundTask = verificationTasks.find(t => t.id === addedTask.id);
          console.log('TasksScreen: Verification - task found in Firebase:', !!foundTask);
          
          if (!foundTask) {
            console.error('TasksScreen: Task was not found in Firebase after adding!');
            setError('Task was not saved to database. Please try again.');
            return;
          }
          
          // Refresh tasks to show the newly added task
          await refreshTasks();
        } catch (addError) {
          console.error('TasksScreen: Error adding chatbot task to Firebase:', addError);
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
        const responseText = await responseResult?.response.text() || '';
        
        setAssistantResponse(responseText);
        
        // Speak the response
        if (Platform.OS !== 'web' && responseText) {
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
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <Text style={[styles.headerTitle, { color: textColor }]}>Tasks</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={[styles.refreshButton, { backgroundColor: accentColor }]}
            onPress={refreshTasks}
          >
            <FontAwesome name="refresh" size={16} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.clearAllButton, { backgroundColor: '#dc3545' }]}
            onPress={() => {
              console.log('TasksScreen: Clear All button pressed');
              console.log('TasksScreen: Showing custom confirmation dialog...');
              setShowClearConfirm(true);
            }}
          >
            <Text style={styles.clearAllButtonText}>Clear All</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.testNotificationButton, { backgroundColor: '#007bff' }]}
            onPress={async () => {
              console.log('TasksScreen: Test notification button pressed');
              try {
                const notificationService = NotificationService.getInstance();
                await notificationService.showLocalNotification(
                  'Test Notification',
                  'This is a test notification from Smart Bharat!',
                  { test: true }
                );
                console.log('TasksScreen: Test notification sent');
              } catch (error) {
                console.error('TasksScreen: Error sending test notification:', error);
              }
            }}
          >
            <Text style={styles.testNotificationButtonText}>Test Notification</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Voice Assistant Section */}
      <View style={[styles.voiceSection, { borderBottomColor: borderColor }]}>
        <View style={styles.voiceHeader}>
          <Text style={[styles.voiceTitle, { color: textColor }]}>Voice Assistant</Text>
          <TouchableOpacity 
            style={[styles.micButton, isListening && styles.micButtonActive]} 
            onPress={toggleListening}
          >
            <FontAwesome name={isListening ? "microphone" : "microphone-slash"} size={20} color={isListening ? "#fff" : accentColor} />
          </TouchableOpacity>
        </View>
        
        {isListening ? (
          <View style={styles.recordingContainer}>
            <ActivityIndicator size="small" color={accentColor} />
            <Text style={[styles.recordingText, { color: textColor }]}>Listening...</Text>
          </View>
        ) : null}
        
        {currentTranscript ? (
          <View style={[styles.transcriptContainer, { borderColor }]}>
            <Text style={[styles.transcriptLabel, { color: textColor }]}>You said:</Text>
            <Text style={[styles.transcriptText, { color: textColor }]}>{currentTranscript}</Text>
          </View>
        ) : null}
        
        {isProcessing ? (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="small" color={accentColor} />
            <Text style={[styles.processingText, { color: textColor }]}>Processing your request...</Text>
          </View>
        ) : null}
        
        {assistantResponse ? (
          <View style={[styles.responseContainer, { borderColor }]}>
            <Text style={[styles.responseLabel, { color: textColor }]}>Assistant:</Text>
            <Text style={[styles.responseText, { color: textColor }]}>{assistantResponse}</Text>
          </View>
        ) : null}
        
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </View>

      {/* Manual Task Input */}
      <View style={[styles.inputContainer, { borderBottomColor: borderColor }]}>
        <TextInput
          style={[styles.input, { color: textColor, borderColor }]}
          placeholder="Add a new task..."
          placeholderTextColor="#999"
          value={newTask}
          onChangeText={setNewTask}
          onSubmitEditing={addTask}
        />
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: accentColor }]} 
          onPress={addTask}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <FontAwesome name="plus" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {/* Tasks List */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterTitle}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.filterButton,
                selectedCategory === category && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedCategory === category && styles.filterButtonTextActive,
                ]}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {filteredTasks.length === 0 && completedTasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome name="tasks" size={48} color="#ced4da" />
            <Text style={styles.emptyText}>No Tasks Yet</Text>
            <Text style={styles.emptySubtext}>
              Add a new task using the input below or the voice assistant.
            </Text>
          </View>
        ) : (
          <>
            {Object.entries(groupedTasks).map(([priority, tasks]) =>
              tasks.length > 0 ? (
                <View key={priority} style={styles.prioritySection}>
                  <Text style={styles.priorityTitle}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)} Priority
                  </Text>
                  {tasks.map(task => (
                    <View key={task.id} style={styles.taskCard}>
                      <TouchableOpacity
                        style={styles.checkboxContainer}
                        onPress={() => toggleTaskStatus(task.id)}
                      >
                        <FontAwesome
                          name={task.completed ? 'check-square-o' : 'square-o'}
                          size={20}
                          color={task.completed ? '#2E7D32' : '#6c757d'}
                        />
                      </TouchableOpacity>

                      <View style={styles.taskContent}>
                        <Text style={[styles.taskTitle, task.completed && styles.completedTask]}>
                          {task.title}
                        </Text>
                        <View style={styles.taskDetails}>
                          <View style={styles.taskDetail}>
                            <FontAwesome
                              name="tag"
                              size={12}
                              color={getPriorityColor(task.priority)}
                            />
                            <Text style={styles.taskDetailText}>{task.priority}</Text>
                          </View>
                          <View style={styles.taskDetail}>
                            <FontAwesome name={getCategoryIcon(task.category) as any} size={12} color="#6c757d" />
                            <Text style={styles.taskDetailText}>{task.category}</Text>
                          </View>
                          <View style={styles.taskDetail}>
                            <FontAwesome name="calendar" size={12} color="#6c757d" />
                            <Text style={styles.taskDetailText}>{task.dueDate}</Text>
                          </View>
                          <View style={styles.taskDetail}>
                            <FontAwesome name="clock-o" size={12} color="#6c757d" />
                            <Text style={styles.taskDetailText}>{task.dueTime}</Text>
                          </View>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => deleteTask(task.id)}
                      >
                        <FontAwesome name="trash" size={16} color="#dc3545" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : null
            )}

            {/* Completed Tasks Section */}
            {completedTasks.length > 0 && (
              <View style={styles.completedSection}>
                <Text style={styles.completedTitle}>Completed Tasks</Text>
                {completedTasks.map(task => (
                  <View key={task.id} style={[styles.taskCard, styles.completedTaskCard]}>
                    <TouchableOpacity
                      style={styles.checkboxContainer}
                      onPress={() => toggleTaskStatus(task.id)}
                    >
                      <FontAwesome
                        name="check-square-o"
                        size={20}
                        color="#2E7D32"
                      />
                    </TouchableOpacity>

                    <View style={styles.taskContent}>
                      <Text style={[styles.taskTitle, styles.completedTask]}>
                        {task.title}
                      </Text>
                      <View style={styles.taskDetails}>
                        <View style={styles.taskDetail}>
                          <FontAwesome
                            name="tag"
                            size={12}
                            color={getPriorityColor(task.priority)}
                          />
                          <Text style={styles.taskDetailText}>{task.priority}</Text>
                        </View>
                        <View style={styles.taskDetail}>
                          <FontAwesome name={getCategoryIcon(task.category) as any} size={12} color="#6c757d" />
                          <Text style={styles.taskDetailText}>{task.category}</Text>
                        </View>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deleteTask(task.id)}
                    >
                      <FontAwesome name="trash" size={16} color="#dc3545" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Custom Clear All Confirmation Modal */}
      {showClearConfirm && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Clear All Tasks</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to delete all tasks? This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  console.log('TasksScreen: Cancel pressed in custom modal');
                  setShowClearConfirm(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.clearButton]}
                onPress={async () => {
                  console.log('TasksScreen: Clear All option pressed in custom modal');
                  try {
                    console.log('TasksScreen: Starting clear all tasks...');
                    await taskService.clearAllTasks();
                    console.log('TasksScreen: Clear all tasks completed');
                    await refreshTasks(); // Refresh the task list after clearing
                    console.log('TasksScreen: Tasks refreshed after clearing');
                    setShowClearConfirm(false);
                  } catch (error) {
                    console.error('Error clearing tasks:', error);
                    setError('Failed to clear tasks. Please try again.');
                    setShowClearConfirm(false);
                  }
                }}
              >
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  testButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clearAllButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  testNotificationButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  testNotificationButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 14,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    color: '#6c757d',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  checkboxContainer: {
    marginRight: 12,
    justifyContent: 'center',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  completedTask: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  taskDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  taskDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 4,
  },
  taskDetailText: {
    fontSize: 11,
    marginLeft: 4,
    color: '#6c757d',
  },
  deleteButton: {
    padding: 4,
    marginLeft: 8,
  },
  filterContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#fff',
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  filterScrollView: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: '#e9ecef',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#2E7D32',
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  prioritySection: {
    marginBottom: 16,
  },
  priorityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#ffebee',
    marginBottom: 12,
  },
  errorText: {
    color: '#e53935',
    fontSize: 12,
  },
  completedSection: {
    marginBottom: 16,
  },
  completedTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  completedTaskCard: {
    backgroundColor: '#f8f9fa',
  },
  voiceSection: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  voiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  voiceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 12,
  },
  micButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e9ecef',
  },
  micButtonActive: {
    backgroundColor: '#2E7D32',
  },
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  recordingText: {
    fontSize: 14,
    marginLeft: 8,
  },
  transcriptContainer: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    marginBottom: 12,
  },
  transcriptLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  transcriptText: {
    fontSize: 12,
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  processingText: {
    fontSize: 14,
    marginLeft: 8,
  },
  responseContainer: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    marginBottom: 12,
  },
  responseLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  responseText: {
    fontSize: 12,
  },
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
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 14,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    padding: 12,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  clearButton: {
    backgroundColor: '#dc3545',
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});