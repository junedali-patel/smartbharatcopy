import { doc, collection, addDoc, updateDoc, deleteDoc, getDocs, getDoc, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db, auth } from './firebase';
import NotificationService from './notificationService';

// Define Task interface
export interface Task {
  id: string;
  userId: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  category: 'farming' | 'personal' | 'general';
  dueDate: string;
  dueTime: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

class FirebaseTaskService {
  private static instance: FirebaseTaskService;
  private listeners: ((tasks: Task[]) => void)[] = [];
  private unsubscribe: (() => void) | null = null;

  private constructor() {}

  public static getInstance(): FirebaseTaskService {
    if (!FirebaseTaskService.instance) {
      FirebaseTaskService.instance = new FirebaseTaskService();
    }
    return FirebaseTaskService.instance;
  }

  // Get current user ID
  private getCurrentUserId(): string | null {
    return auth.currentUser?.uid || null;
  }

  // Add listener for task updates
  public addListener(callback: (tasks: Task[]) => void) {
    console.log('FirebaseTaskService: Adding listener, total listeners:', this.listeners.length + 1);
    this.listeners.push(callback);
    this.setupRealtimeListener();
  }

  // Remove listener
  public removeListener(callback: (tasks: Task[]) => void) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
    if (this.listeners.length === 0 && this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  // Notify all listeners
  private notifyListeners(tasks: Task[]) {
    console.log('FirebaseTaskService: Notifying', this.listeners.length, 'listeners with', tasks.length, 'tasks');
    this.listeners.forEach(listener => listener(tasks));
  }

  // Setup real-time listener for tasks
  private setupRealtimeListener() {
    const userId = this.getCurrentUserId();
    if (!userId) {
      console.error('No user logged in');
      return;
    }

    console.log('FirebaseTaskService: Setting up real-time listener for user:', userId);

    // Unsubscribe from previous listener
    if (this.unsubscribe) {
      this.unsubscribe();
    }

    const tasksRef = collection(db, 'tasks');
    const q = query(
      tasksRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    this.unsubscribe = onSnapshot(q, (snapshot) => {
      const tasks: Task[] = [];
      snapshot.forEach((doc) => {
        tasks.push({ id: doc.id, ...doc.data() } as Task);
      });
      console.log('FirebaseTaskService: Received snapshot with', tasks.length, 'tasks');
      this.notifyListeners(tasks);
    }, (error) => {
      console.error('Error listening to tasks:', error);
    });
  }

  // Add a new task
  public async addTask(taskData: Partial<Task>): Promise<Task> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    console.log('FirebaseTaskService: Adding task with data:', taskData);
    console.log('FirebaseTaskService: Current date:', new Date().toISOString().split('T')[0]);

    const task: Omit<Task, 'id'> = {
      userId,
      title: taskData.title || '',
      priority: taskData.priority || 'medium',
      category: taskData.category || 'general',
      dueDate: taskData.dueDate || new Date().toISOString().split('T')[0],
      dueTime: taskData.dueTime || new Date(Date.now() + 3600000).toTimeString().split(' ')[0].substring(0, 5),
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('FirebaseTaskService: Final task object:', task);

    const docRef = await addDoc(collection(db, 'tasks'), task);
    const createdTask = { id: docRef.id, ...task };
    
    console.log('FirebaseTaskService: Added task with ID:', docRef.id);

    // Schedule notification for the new task
    try {
      const notificationService = NotificationService.getInstance();
      await notificationService.scheduleTaskNotification(createdTask);
      console.log('FirebaseTaskService: Scheduled notification for task:', createdTask.title);
    } catch (error) {
      console.error('FirebaseTaskService: Error scheduling notification:', error);
    }

    return createdTask;
  }

  // Update task status
  public async toggleTaskStatus(taskId: string): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const taskRef = doc(db, 'tasks', taskId);
    const taskDoc = await getDoc(taskRef);
    
    if (!taskDoc.exists()) {
      throw new Error('Task not found');
    }

    const currentTask = taskDoc.data() as Task;
    if (currentTask.userId !== userId) {
      throw new Error('Access denied');
    }

    await updateDoc(taskRef, {
      completed: !currentTask.completed,
      updatedAt: new Date().toISOString()
    });
  }

  // Delete task
  public async deleteTask(taskId: string): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Verify task belongs to user
    const taskRef = doc(db, 'tasks', taskId);
    const taskDoc = await getDoc(taskRef);
    
    if (!taskDoc.exists()) {
      throw new Error('Task not found');
    }

    const currentTask = taskDoc.data() as Task;
    if (currentTask.userId !== userId) {
      throw new Error('Access denied');
    }

    await deleteDoc(taskRef);

    // Cancel notification for the deleted task
    try {
      const notificationService = NotificationService.getInstance();
      await notificationService.cancelTaskNotification(taskId);
      console.log('FirebaseTaskService: Cancelled notification for deleted task:', taskId);
    } catch (error) {
      console.error('FirebaseTaskService: Error cancelling notification:', error);
    }
  }

  // Update task
  public async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Verify task belongs to user
    const taskRef = doc(db, 'tasks', taskId);
    const taskDoc = await getDoc(taskRef);
    
    if (!taskDoc.exists()) {
      throw new Error('Task not found');
    }

    const currentTask = taskDoc.data() as Task;
    if (currentTask.userId !== userId) {
      throw new Error('Access denied');
    }

    await updateDoc(taskRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
  }

  // Get all tasks for current user
  public async getTasks(): Promise<Task[]> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      return [];
    }

    const tasksRef = collection(db, 'tasks');
    const q = query(
      tasksRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const tasks: Task[] = [];
    snapshot.forEach((doc) => {
      tasks.push({ id: doc.id, ...doc.data() } as Task);
    });

    return tasks;
  }

  // Get tasks by category
  public async getTasksByCategory(category: 'all' | 'farming' | 'personal' | 'general'): Promise<Task[]> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      return [];
    }

    const tasksRef = collection(db, 'tasks');
    let q;

    if (category === 'all') {
      q = query(
        tasksRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        tasksRef,
        where('userId', '==', userId),
        where('category', '==', category),
        orderBy('createdAt', 'desc')
      );
    }

    const snapshot = await getDocs(q);
    const tasks: Task[] = [];
    snapshot.forEach((doc) => {
      tasks.push({ id: doc.id, ...doc.data() } as Task);
    });

    return tasks;
  }

  // Get ongoing tasks
  public async getOngoingTasks(): Promise<Task[]> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      return [];
    }

    const tasksRef = collection(db, 'tasks');
    const q = query(
      tasksRef,
      where('userId', '==', userId),
      where('completed', '==', false),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const tasks: Task[] = [];
    snapshot.forEach((doc) => {
      tasks.push({ id: doc.id, ...doc.data() } as Task);
    });

    return tasks;
  }

  // Get completed tasks
  public async getCompletedTasks(): Promise<Task[]> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      return [];
    }

    const tasksRef = collection(db, 'tasks');
    const q = query(
      tasksRef,
      where('userId', '==', userId),
      where('completed', '==', true),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const tasks: Task[] = [];
    snapshot.forEach((doc) => {
      tasks.push({ id: doc.id, ...doc.data() } as Task);
    });

    return tasks;
  }

  // Parse task from natural language
  public parseTaskFromText(text: string): Partial<Task> {
    const task: Partial<Task> = {};
    
    // Extract title (remove task-related words and date/time words)
    let title = text.toLowerCase();
    const taskWords = ['add', 'create', 'new', 'task', 'remind', 'reminder', 'todo', 'to do'];
    const dateTimeWords = ['today', 'tomorrow', 'day after tomorrow', 'next day', 'next week', 'next month', 'in', 'days', 'weeks', 'months', 'morning','afternoon','evening','night'];
    
    // Remove task-related words
    taskWords.forEach(word => {
      title = title.replace(new RegExp(`\\b${word}\\b`, 'g'), '').trim();
    });
    
    // Remove date/time words
    dateTimeWords.forEach(word => {
      title = title.replace(new RegExp(`\\b${word}\\b`, 'g'), '').trim();
    });
    
    // Remove numbers followed by "days", "weeks", "months"
    title = title.replace(/\b\d+\s+(days?|weeks?|months?)\b/g, '').trim();
    
    // Remove common phrases that don't add meaning to the task
    const removePhrases = [
      /\bme to\b/g,
      /\bme\b/g,
      /\bto\b/g,
      /\bfor me\b/g,
      /\bplease\b/g,
      /\bcan you\b/g,
      /\bwill you\b/g
    ];
    
    removePhrases.forEach(phrase => {
      title = title.replace(phrase, '').trim();
    });
    
    // Clean up extra spaces
    title = title.replace(/\s+/g, ' ').trim();
    
    task.title = title;

    // Detect priority
    if (text.match(/\b(urgent|high|important|critical|asap)\b/i)) {
      task.priority = 'high';
    } else if (text.match(/\b(low|not urgent|whenever)\b/i)) {
      task.priority = 'low';
    } else {
      task.priority = 'medium';
    }

    // Detect category
    const farmingWords = ['farming', 'farm', 'crop', 'field', 'irrigation', 'fertilizer', 'pesticide', 'harvest', 'plant', 'seed'];
    const personalWords = ['personal', 'family', 'home', 'house', 'personal'];
    
    if (farmingWords.some(word => text.toLowerCase().includes(word))) {
      task.category = 'farming';
    } else if (personalWords.some(word => text.toLowerCase().includes(word))) {
      task.category = 'personal';
    } else {
      task.category = 'general';
    }

    // Extract date/time if mentioned
    const dateMatch = text.match(/\b(today|tomorrow|day after tomorrow|next day|next week|next month|in (\d+) days?|in (\d+) weeks?|in (\d+) months?)\b/i);
    if (dateMatch) {
      const date = new Date();
      const matchedText = dateMatch[0].toLowerCase();
      
      if (matchedText === 'tomorrow' || matchedText === 'next day') {
        date.setDate(date.getDate() + 1);
      } else if (matchedText === 'day after tomorrow') {
        date.setDate(date.getDate() + 2);
      } else if (matchedText === 'next week') {
        date.setDate(date.getDate() + 7);
      } else if (matchedText === 'next month') {
        date.setMonth(date.getMonth() + 1);
      } else if (matchedText.match(/in (\d+) days?/i)) {
        const days = parseInt(matchedText.match(/in (\d+) days?/i)?.[1] || '1');
        date.setDate(date.getDate() + days);
      } else if (matchedText.match(/in (\d+) weeks?/i)) {
        const weeks = parseInt(matchedText.match(/in (\d+) weeks?/i)?.[1] || '1');
        date.setDate(date.getDate() + (weeks * 7));
      } else if (matchedText.match(/in (\d+) months?/i)) {
        const months = parseInt(matchedText.match(/in (\d+) months?/i)?.[1] || '1');
        date.setMonth(date.getMonth() + months);
      }
      
      task.dueDate = date.toISOString().split('T')[0];
    } else {
      // Set default date to today if no date is mentioned
      task.dueDate = new Date().toISOString().split('T')[0];
    }

    // Set default dueTime if not provided
    if (!task.dueTime) {
      const now = new Date();
      now.setHours(now.getHours() + 1); // Default to 1 hour from now
      task.dueTime = now.toTimeString().split(' ')[0].substring(0, 5);
    }

    return task;
  }

  // Clear all tasks for current user
  public async clearAllTasks(): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    console.log('FirebaseTaskService: Clearing all tasks for user:', userId);
    
    const tasksRef = collection(db, 'tasks');
    const q = query(tasksRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    
    console.log('FirebaseTaskService: Found', snapshot.docs.length, 'tasks to delete');
    
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    console.log('FirebaseTaskService: All tasks deleted successfully');
  }
}

export default FirebaseTaskService; 