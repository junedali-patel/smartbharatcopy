import { onCall } from "firebase-functions/v2/https";
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as admin from "firebase-admin";

// Initialize Firebase Admin
admin.initializeApp();

// Define types for the function parameters
interface GeminiExplainData {
  prediction: string;
}

interface TaskNotificationData {
  taskId: string;
  taskTitle: string;
  dueDate: string;
  dueTime: string;
  userId: string;
}

const genAI = new GoogleGenerativeAI('AIzaSyATFG-N_HT4IFm8SHGLnlAFtH_7fzqB_j0');

// Helper to try multiple models with fallback
const getWorkingModel = (genAI: GoogleGenerativeAI) => {
  const models = ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'];
  for (const modelName of models) {
    try {
      return genAI.getGenerativeModel({ model: modelName });
    } catch (error) {
      continue;
    }
  }
  return genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
};

export const geminiExplain = onCall(async (request) => {
  const { data } = request;
  
  if (!data.prediction) {
    throw new Error("Prediction data is required");
  }

  const prediction = data.prediction;
  const model = getWorkingModel(genAI);

  const prompt = `You are an agricultural expert assistant. A farmer has received a crop prediction: "${prediction}".
    
    Please explain this prediction in simple, farmer-friendly terms. Your response should:
    1. Use clear, non-technical language
    2. Explain why this crop might be suitable
    3. Include basic care instructions
    4. Mention potential challenges
    5. Suggest some best practices
    
    Keep the response concise and easy to understand. Use a mix of Hindi and English if appropriate.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API error:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to generate explanation: ${error.message}`);
    }
    throw new Error("Failed to generate explanation");
  }
});

// Cloud Function to send task notifications
export const sendTaskNotification = onCall(async (request) => {
  const { data, auth } = request;
  
  if (!auth) {
    throw new Error("User must be authenticated");
  }

  if (!data.taskId || !data.taskTitle || !data.userId) {
    throw new Error("Task ID, title, and user ID are required");
  }

  try {
    // Get user's FCM tokens from Firestore
    const userDoc = await admin.firestore().collection('users').doc(data.userId).get();
    if (!userDoc.exists) {
      throw new Error("User not found");
    }

    const userData = userDoc.data();
    const fcmTokens = userData?.fcmTokens || [];

    if (fcmTokens.length === 0) {
      console.log('No FCM tokens found for user:', data.userId);
      return { success: false, message: 'No FCM tokens found' };
    }

    // Prepare notification message
    const message = {
      notification: {
        title: 'Task Due Soon!',
        body: `${data.taskTitle} is due ${data.dueTime}`,
      },
      data: {
        taskId: data.taskId,
        taskTitle: data.taskTitle,
        dueDate: data.dueDate,
        dueTime: data.dueTime,
        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
      },
      android: {
        notification: {
          sound: 'default',
          priority: 'high' as const,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    // Send to all user's devices
    const sendPromises = fcmTokens.map((token: string) =>
      admin.messaging().send({
        ...message,
        token,
      })
    );

    await Promise.all(sendPromises);
    console.log(`Sent notification for task ${data.taskId} to ${fcmTokens.length} devices`);

    return { success: true, message: 'Notification sent successfully' };
  } catch (error) {
    console.error('Error sending task notification:', error);
    throw new Error("Failed to send notification");
  }
});

// Cloud Function to send booking notifications
export const sendBookingNotification = onCall(async (request) => {
  const { data } = request;
  
  if (!data.ownerId || !data.renterName || !data.equipmentName) {
    throw new Error("Owner ID, renter name, and equipment name are required");
  }

  try {
    // Get owner's FCM tokens from Firestore
    const ownerDoc = await admin.firestore().collection('users').doc(data.ownerId).get();
    if (!ownerDoc.exists) {
      console.log('Owner document not found:', data.ownerId);
      return { success: false, message: 'Owner not found' };
    }

    const ownerData = ownerDoc.data();
    const fcmTokens = ownerData?.fcmTokens || [];

    if (fcmTokens.length === 0) {
      console.log('No FCM tokens found for owner:', data.ownerId);
      return { success: false, message: 'No FCM tokens found' };
    }

    // Prepare notification message
    const message = {
      notification: {
        title: 'New Booking Request!',
        body: `${data.renterName} requested to book your ${data.equipmentName}`,
      },
      data: {
        bookingId: data.bookingId || '',
        renterName: data.renterName,
        equipmentName: data.equipmentName,
        type: 'booking_request',
      },
      android: {
        notification: {
          sound: 'default',
          priority: 'high' as const,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            alert: {
              title: 'New Booking Request!',
              body: `${data.renterName} requested to book your ${data.equipmentName}`,
            },
          },
        },
      },
    };

    // Send to all owner's devices
    const sendPromises = fcmTokens.map((token: string) =>
      admin.messaging().send({
        ...message,
        token,
      })
    );

    await Promise.all(sendPromises);
    console.log(`Sent booking notification for equipment ${data.equipmentName} to ${fcmTokens.length} devices`);

    return { success: true, message: 'Notification sent successfully' };
  } catch (error) {
    console.error('Error sending booking notification:', error);
    throw new Error("Failed to send notification");
  }
});