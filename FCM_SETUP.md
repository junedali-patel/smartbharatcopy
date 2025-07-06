# Firebase Cloud Messaging (FCM) Setup Guide

This guide explains how to set up Firebase Cloud Messaging for push notifications in your Smart Bharat app.

## Prerequisites

1. Firebase project with Cloud Messaging enabled
2. Expo project with `expo-notifications` installed
3. Firebase Functions deployed

## Current Configuration

Your Firebase project is already configured with:
- **Project ID**: `appa-ad38a`
- **API Key**: `AIzaSyAVJXEaWZytJomJYcthPmg9Lag7nzJ5ths`
- **Messaging Sender ID**: `623892476246`

## Setup Steps

### 1. Firebase Console Configuration

1. Go to your Firebase Console: https://console.firebase.google.com/project/appa-ad38a
2. Navigate to Project Settings > Cloud Messaging
3. Generate a new Web Push certificate (VAPID key)
4. Copy the VAPID key and update it in `services/notificationService.ts`

### 2. Update VAPID Key

In `services/notificationService.ts`, replace the placeholder VAPID key:

```typescript
// Replace with your actual VAPID key from Firebase Console
vapidKey: 'your-actual-vapid-key-from-firebase-console',
```

### 3. Get Expo Project ID

You need to create an Expo project or get your project ID:

1. Run: `npx expo login` (if not already logged in)
2. Run: `npx expo projects:create` to create a new project
3. Or find your existing project ID in Expo Dashboard
4. Update the projectId in `services/notificationService.ts`:

```typescript
projectId: 'your-expo-project-id', // Replace with actual Expo project ID
```

### 4. Deploy Firebase Functions

1. Install Firebase CLI if not already installed:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Deploy functions:
   ```bash
   firebase deploy --only functions
   ```

### 5. Test Notifications

1. Run your app
2. Grant notification permissions when prompted
3. Press the "Test Notification" button in the Tasks screen
4. You should see a notification appear

## How It Works

### Client-Side (App)
- `NotificationService`: Handles local notifications and FCM token management
- `UserService`: Manages user profiles and FCM token registration
- Tasks screen: Initializes notifications and registers tokens

### Server-Side (Firebase Functions)
- `sendTaskNotification`: Sends push notifications to specific users
- `checkDueTasks`: Scheduled function that checks for due tasks (currently disabled)

### Notification Flow
1. User creates a task → Notification is scheduled locally
2. Task due time approaches → Local notification is triggered
3. Server-side function can also send push notifications via FCM

## Troubleshooting

### Common Issues

1. **FCM Service Worker Error in Development**
   - This error is **expected** in development mode
   - FCM requires a service worker file that doesn't exist in Expo dev environment
   - The app automatically skips FCM token generation in development
   - This error will not appear in production builds
   - Local notifications still work perfectly in development

2. **Notifications not appearing on web**
   - Ensure you're using HTTPS (required for production)
   - Check browser notification permissions
   - Verify VAPID key is correct

3. **FCM tokens not generating**
   - Check Firebase config is correct
   - Ensure messaging is initialized properly
   - Verify user is authenticated
   - In development: FCM tokens are intentionally skipped

4. **Local notifications not working**
   - Check notification permissions
   - Ensure expo-notifications is properly configured
   - Test on physical device (not simulator)

### Debug Steps

1. Check console logs for:
   - "Expo Push Token: [token]"
   - "FCM Token: [token]"
   - "Registered FCM tokens: [tokens]"

2. Verify in Firebase Console:
   - User documents have `fcmTokens` array
   - Functions are deployed successfully

## Next Steps

1. **Enable scheduled notifications**: Uncomment and fix the scheduled function in `functions/index.ts`
2. **Add notification actions**: Handle notification taps to navigate to specific tasks
3. **Customize notification content**: Add more details like task priority, category, etc.
4. **Add notification settings**: Allow users to configure notification preferences

## Security Rules

Ensure your Firestore rules allow users to read/write their own data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /tasks/{taskId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
``` 