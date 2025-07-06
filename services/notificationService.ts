import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { messaging } from '../config/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { Task } from './firebaseTaskService';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  private static instance: NotificationService;
  private expoPushToken: string | null = null;
  private fcmToken: string | null = null;

  private constructor() {
    this.initializeNotifications();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Initialize notifications
  private async initializeNotifications() {
    try {
      if (Platform.OS === 'web') {
        // Handle web notifications
        if ('Notification' in window) {
          if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
              console.log('Notification permission denied on web');
              return;
            }
          } else if (Notification.permission === 'denied') {
            console.log('Notification permission denied on web');
            return;
          }
        }

        // Get FCM token for web (only in production)
        if (messaging && !__DEV__) {
          try {
            this.fcmToken = await getToken(messaging, {
              vapidKey: 'BMaP-EbD-ZTaaHhROJGaJtpMQ4qcOGddw8btb5Ttz7kaPM3G7RazqQeDoL5OMuCb1M0oKcQUjC8A1owegcn2OHY',
            });
            console.log('FCM Token:', this.fcmToken);
          } catch (error) {
            console.log('FCM token not available in development mode:', error instanceof Error ? error.message : 'Unknown error');
          }
        } else if (messaging && __DEV__) {
          console.log('Skipping FCM token generation in development mode');
        }

        // Set up FCM message listener for web
        this.setupNotificationListeners();
      } else {
        // Handle mobile notifications
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
          console.log('Failed to get push token for push notification!');
          return;
        }

        // Get Expo push token for mobile
        this.expoPushToken = (await Notifications.getExpoPushTokenAsync({
          projectId: 'smartbharat',
        })).data;
        console.log('Expo Push Token:', this.expoPushToken);

        // Set up notification listeners for mobile
        this.setupNotificationListeners();
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  }

  // Set up notification listeners
  private setupNotificationListeners() {
    // Handle notification received while app is running
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Handle notification response (when user taps notification)
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      // Handle navigation or other actions based on notification
    });

    // Handle FCM messages (web)
    if (Platform.OS === 'web' && messaging) {
      onMessage(messaging, (payload) => {
        console.log('Message received:', payload);
        // Show notification even when app is in foreground
        this.showLocalNotification(payload.notification?.title || 'Task Reminder', payload.notification?.body || '');
      });
    }

    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }

  // Schedule a notification for a task (simplified version)
  public async scheduleTaskNotification(task: Task): Promise<void> {
    try {
      const dueDateTime = new Date(`${task.dueDate}T${task.dueTime}`);
      const now = new Date();

      console.log(`NotificationService: Task "${task.title}" due at ${dueDateTime}`);
      console.log(`NotificationService: Current time is ${now}`);
      console.log(`NotificationService: Time difference: ${dueDateTime.getTime() - now.getTime()}ms`);

      // Show immediate notification for newly created tasks
      console.log(`NotificationService: Showing immediate notification for task "${task.title}"`);
      await this.showLocalNotification(
        'Task Created!',
        `${task.title} is scheduled for ${task.dueTime}`,
        { taskId: task.id, taskTitle: task.title }
      );

      // Schedule due notification if task is in the future
      if (dueDateTime > now) {
        console.log(`NotificationService: Scheduling due notification for task "${task.title}" at ${dueDateTime}`);
        
        // Calculate time until due (in milliseconds)
        const timeUntilDue = dueDateTime.getTime() - now.getTime();
        
        // Schedule notification 15 minutes before due time
        const reminderTime = Math.max(timeUntilDue - (15 * 60 * 1000), 0);
        
        if (reminderTime > 0) {
          console.log(`NotificationService: Will show reminder in ${reminderTime}ms (${Math.round(reminderTime/1000/60)} minutes)`);
          
          // Schedule the reminder notification
          setTimeout(async () => {
            console.log(`NotificationService: Showing due reminder for task "${task.title}"`);
            await this.showLocalNotification(
              'Task Due Soon!',
              `${task.title} is due in 15 minutes`,
              { taskId: task.id, taskTitle: task.title, type: 'reminder' }
            );
          }, reminderTime);
        }
        
        // Also schedule notification at exact due time
        setTimeout(async () => {
          console.log(`NotificationService: Showing due notification for task "${task.title}"`);
          await this.showLocalNotification(
            'Task Due Now!',
            `${task.title} is due now`,
            { taskId: task.id, taskTitle: task.title, type: 'due' }
          );
        }, timeUntilDue);
        
      } else {
        console.log(`NotificationService: Task "${task.title}" is already due, showing immediate notification`);
        // Show immediate due notification for past tasks
        await this.showLocalNotification(
          'Task Due!',
          `${task.title} was due at ${task.dueTime}`,
          { taskId: task.id, taskTitle: task.title, type: 'overdue' }
        );
      }
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  }

  // Cancel notification for a task
  public async cancelTaskNotification(taskId: string): Promise<void> {
    try {
      // Get all scheduled notifications
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      // Find and cancel notifications for this task
      for (const notification of scheduledNotifications) {
        if (notification.content.data?.taskId === taskId) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
          console.log(`Cancelled notification for task ${taskId}`);
        }
      }
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  // Show immediate local notification
  public async showLocalNotification(title: string, body: string, data?: any): Promise<void> {
    try {
      console.log('NotificationService: Attempting to show notification');
      console.log('NotificationService: Platform is', Platform.OS);
      
      if (Platform.OS === 'web') {
        console.log('NotificationService: Using web notification API');
        console.log('NotificationService: Notification API available:', 'Notification' in window);
        
        if ('Notification' in window) {
          console.log('NotificationService: Current permission status:', Notification.permission);
          
          if (Notification.permission === 'granted') {
            console.log('NotificationService: Permission granted, showing notification');
            const notification = new Notification(title, {
              body: body,
              tag: 'smartbharat-notification',
              data: data,
              requireInteraction: true, // Keep notification visible until user interacts
              silent: false // Enable sound
            });
            console.log('NotificationService: Notification created successfully');
            
            // Add event listeners to track notification behavior
            notification.onclick = () => {
              console.log('NotificationService: Notification clicked');
              window.focus(); // Bring app to front when notification is clicked
            };
            notification.onshow = () => {
              console.log('NotificationService: Notification shown');
              // Also show an alert for debugging
              if (__DEV__) {
                alert(`Notification shown: ${title}\n${body}`);
              }
            };
            notification.onerror = (error) => {
              console.error('NotificationService: Notification error:', error);
            };
            notification.onclose = () => {
              console.log('NotificationService: Notification closed');
            };
          } else if (Notification.permission === 'default') {
            console.log('NotificationService: Requesting permission');
            const permission = await Notification.requestPermission();
            console.log('NotificationService: Permission result:', permission);
            
            if (permission === 'granted') {
              console.log('NotificationService: Permission granted after request, showing notification');
              const notification = new Notification(title, {
                body: body,
                tag: 'smartbharat-notification',
                data: data,
                requireInteraction: true, // Keep notification visible until user interacts
                silent: false // Enable sound
              });
              console.log('NotificationService: Notification created successfully after permission request');
              
              // Add event listeners to track notification behavior
              notification.onclick = () => {
                console.log('NotificationService: Notification clicked');
                window.focus(); // Bring app to front when notification is clicked
              };
              notification.onshow = () => {
                console.log('NotificationService: Notification shown');
                // Also show an alert for debugging
                if (__DEV__) {
                  alert(`Notification shown: ${title}\n${body}`);
                }
              };
              notification.onerror = (error) => {
                console.error('NotificationService: Notification error:', error);
              };
              notification.onclose = () => {
                console.log('NotificationService: Notification closed');
              };
            } else {
              console.log('NotificationService: Permission denied after request');
            }
          } else {
            console.log('NotificationService: Permission denied, cannot show notification');
          }
        } else {
          console.log('NotificationService: Notification API not available');
        }
      } else {
        console.log('NotificationService: Using mobile notification API');
        // Use expo-notifications for mobile
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data,
            sound: 'default',
          },
          trigger: null, // Show immediately
        });
        console.log('NotificationService: Mobile notification scheduled');
      }
    } catch (error) {
      console.error('NotificationService: Error showing local notification:', error);
    }
  }

  // Get tokens for server registration
  public getTokens() {
    return {
      expoPushToken: this.expoPushToken,
      fcmToken: this.fcmToken,
    };
  }

  // Check if notifications are enabled
  public async checkNotificationPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') {
      return 'Notification' in window && Notification.permission === 'granted';
    } else {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    }
  }

  // Request notification permissions
  public async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
      return false;
    } else {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    }
  }
}

export default NotificationService; 