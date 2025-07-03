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

// Initialize Gemini API
const genAI = isGeminiAvailable() ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Define Task interface
interface Task {
  id: number;
  title: string;
  priority: 'high' | 'medium' | 'low';
  category: 'farming' | 'personal' | 'general';
  dueDate: string;
  dueTime: string;
  completed: boolean;
}

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
      setCurrentTranscript(text);
      setLastSpeechTime(Date.now());
      processCommand(text);
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
      // Clean up
      if (isListening) {
        voiceService.stopListening();
      }
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
          // Find matching task using improved fuzzy matching
          const matchingTask = tasks.find(task => {
            const taskWords = task.title.toLowerCase().split(/\s+/);
            const descriptionWords = taskDescription.toLowerCase().split(/\s+/);
            
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
          
          if (matchingTask) {
            // Mark task as completed
            setTasks(tasks.map(task => 
              task.id === matchingTask.id ? { ...task, completed: true } : task
            ));
            
            setAssistantResponse(`Great! I've marked "${matchingTask.title}" as completed.`);
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
        
        // Check if a similar task already exists
        const existingTask = tasks.find(task => {
          const taskWords = task.title.toLowerCase().split(/\s+/);
          const newTaskWords = taskData.title.toLowerCase().split(/\s+/);
          
          return taskWords.some((word: string) => 
            newTaskWords.some((newWord: string) => 
              word.includes(newWord) || newWord.includes(word)
            )
          );
        });
        
        if (existingTask) {
          setAssistantResponse(`A similar task "${existingTask.title}" already exists.`);
          await stopListening();
          return;
        }
        
        // Add the new task
        const newTask: Task = {
          ...taskData,
          id: Date.now(),
          completed: false
        };
        
        setTasks(prevTasks => [...prevTasks, newTask]);
        
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

  const addTask = () => {
    if (newTask.trim()) {
      const task: Task = {
        id: Date.now(),
        title: newTask,
        priority: 'medium',
        category: 'general',
        dueDate: new Date().toISOString().split('T')[0],
        dueTime: new Date(Date.now() + 3600000).toTimeString().split(' ')[0].substring(0, 5),
        completed: false
      };
      setTasks([...tasks, task]);
      setNewTask('');
    }
  };

  const toggleTaskStatus = (taskId: number) => {
    setTasks(tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    ));
  };

  const deleteTask = (taskId: number) => {
    setTasks(tasks.filter(task => task.id !== taskId));
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
        >
          <FontAwesome name="plus" size={20} color="#fff" />
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
                        <FontAwesome name="trash" size={18} color="#e53935" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : null
            )}

            {completedTasks.length > 0 && (
              <View style={styles.prioritySection}>
                <Text style={styles.priorityTitle}>Completed</Text>
                {completedTasks.map(task => (
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
                      <FontAwesome name="trash" size={18} color="#e53935" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  voiceSection: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  voiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  voiceTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  micButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButtonActive: {
    backgroundColor: '#2E7D32',
  },
  recordingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginBottom: 12,
  },
  recordingText: {
    marginLeft: 8,
    fontSize: 12,
  },
  transcriptContainer: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  transcriptLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  transcriptText: {
    fontSize: 14,
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  processingText: {
    marginLeft: 8,
    fontSize: 12,
  },
  responseContainer: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  responseLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  responseText: {
    fontSize: 14,
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
});