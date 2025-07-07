import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import NotificationService from './notificationService';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  fcmTokens: string[];
  createdAt: string;
  updatedAt: string;
  role?: 'farmer' | 'provider';
}

class UserService {
  private static instance: UserService;

  private constructor() {}

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  // Get current user ID
  private getCurrentUserId(): string | null {
    return auth.currentUser?.uid || null;
  }

  // Create or update user profile
  public async createOrUpdateUserProfile(userData: Partial<UserProfile>): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      // Update existing user
      await updateDoc(userRef, {
        ...userData,
        updatedAt: new Date().toISOString(),
      });
    } else {
      // Create new user
      const newUser: UserProfile = {
        uid: userId,
        email: userData.email || auth.currentUser?.email || '',
        displayName: userData.displayName || auth.currentUser?.displayName || '',
        fcmTokens: userData.fcmTokens || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await setDoc(userRef, newUser);
    }
  }

  // Register FCM token for current user
  public async registerFCMToken(): Promise<void> {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const notificationService = NotificationService.getInstance();
      const tokens = notificationService.getTokens();
      
      if (!tokens.expoPushToken && !tokens.fcmToken) {
        console.log('No FCM tokens available');
        return;
      }

      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      let currentTokens: string[] = [];
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        currentTokens = userData.fcmTokens || [];
      }

      // Add new tokens
      const newTokens: string[] = [];
      if (tokens.expoPushToken && !currentTokens.includes(tokens.expoPushToken)) {
        newTokens.push(tokens.expoPushToken);
      }
      if (tokens.fcmToken && !currentTokens.includes(tokens.fcmToken)) {
        newTokens.push(tokens.fcmToken);
      }

      if (newTokens.length > 0) {
        const updatedTokens = [...currentTokens, ...newTokens];
        await this.createOrUpdateUserProfile({ fcmTokens: updatedTokens });
        console.log('Registered FCM tokens:', newTokens);
      }
    } catch (error) {
      console.error('Error registering FCM token:', error);
    }
  }

  // Remove FCM token for current user
  public async removeFCMToken(token: string): Promise<void> {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        const updatedTokens = userData.fcmTokens.filter(t => t !== token);
        
        await updateDoc(userRef, {
          fcmTokens: updatedTokens,
          updatedAt: new Date().toISOString(),
        });
        console.log('Removed FCM token:', token);
      }
    } catch (error) {
      console.error('Error removing FCM token:', error);
    }
  }

  // Get user profile
  public async getUserProfile(): Promise<UserProfile | null> {
    try {
      const userId = this.getCurrentUserId();
      if (!userId) {
        return null;
      }

      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        return userDoc.data() as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  // Update user profile
  public async updateUserProfile(updates: Partial<UserProfile>): Promise<void> {
    try {
      await this.createOrUpdateUserProfile(updates);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }
}

export default UserService; 