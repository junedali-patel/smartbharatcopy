import AsyncStorage from '@react-native-async-storage/async-storage';

// Define Task interface
export interface Task {
  id: number;
  title: string;
  priority: 'high' | 'medium' | 'low';
  category: 'farming' | 'personal' | 'general';
  dueDate: string;
  dueTime: string;
  completed: boolean;
}

class TaskService {
  private static instance: TaskService;
  private tasks: Task[] = [];
  private listeners: ((tasks: Task[]) => void)[] = [];

  private constructor() {
    this.loadTasks();
  }

  public static getInstance(): TaskService {
    if (!TaskService.instance) {
      TaskService.instance = new TaskService();
    }
    return TaskService.instance;
  }

  // Add listener for task updates
  public addListener(callback: (tasks: Task[]) => void) {
    this.listeners.push(callback);
    // Immediately call with current tasks
    callback(this.tasks);
  }

  // Remove listener
  public removeListener(callback: (tasks: Task[]) => void) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  // Notify all listeners
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.tasks));
  }

  // Load tasks from storage
  private async loadTasks() {
    try {
      const storedTasks = await AsyncStorage.getItem('tasks');
      if (storedTasks) {
        this.tasks = JSON.parse(storedTasks);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  }

  // Save tasks to storage
  private async saveTasks() {
    try {
      await AsyncStorage.setItem('tasks', JSON.stringify(this.tasks));
    } catch (error) {
      console.error('Error saving tasks:', error);
    }
  }

  // Add a new task
  public async addTask(taskData: Partial<Task>): Promise<Task> {
    const task: Task = {
      id: Date.now(),
      title: taskData.title || '',
      priority: taskData.priority || 'medium',
      category: taskData.category || 'general',
      dueDate: taskData.dueDate || new Date().toISOString().split('T')[0],
      dueTime: taskData.dueTime || new Date(Date.now() + 3600000).toTimeString().split(' ')[0].substring(0, 5),
      completed: false
    };

    this.tasks.push(task);
    await this.saveTasks();
    this.notifyListeners();
    return task;
  }

  // Update task status
  public async toggleTaskStatus(taskId: number): Promise<void> {
    this.tasks = this.tasks.map(task => 
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    await this.saveTasks();
    this.notifyListeners();
  }

  // Delete task
  public async deleteTask(taskId: number): Promise<void> {
    this.tasks = this.tasks.filter(task => task.id !== taskId);
    await this.saveTasks();
    this.notifyListeners();
  }

  // Get all tasks
  public getTasks(): Task[] {
    return [...this.tasks];
  }

  // Get tasks by category
  public getTasksByCategory(category: 'all' | 'farming' | 'personal' | 'general'): Task[] {
    if (category === 'all') {
      return this.tasks;
    }
    return this.tasks.filter(task => task.category === category);
  }

  // Get ongoing tasks
  public getOngoingTasks(): Task[] {
    return this.tasks.filter(task => !task.completed);
  }

  // Get completed tasks
  public getCompletedTasks(): Task[] {
    return this.tasks.filter(task => task.completed);
  }

  // Parse task from natural language
  public parseTaskFromText(text: string): Partial<Task> {
    const task: Partial<Task> = {};
    
    // Extract title (remove task-related words)
    let title = text.toLowerCase();
    const taskWords = ['add', 'create', 'new', 'task', 'remind', 'reminder', 'todo', 'to do'];
    taskWords.forEach(word => {
      title = title.replace(new RegExp(`\\b${word}\\b`, 'g'), '').trim();
    });
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
    const dateMatch = text.match(/\b(today|tomorrow|next week|next month)\b/i);
    if (dateMatch) {
      const date = new Date();
      switch (dateMatch[0].toLowerCase()) {
        case 'tomorrow':
          date.setDate(date.getDate() + 1);
          break;
        case 'next week':
          date.setDate(date.getDate() + 7);
          break;
        case 'next month':
          date.setMonth(date.getMonth() + 1);
          break;
      }
      task.dueDate = date.toISOString().split('T')[0];
    }

    return task;
  }
}

export default TaskService; 