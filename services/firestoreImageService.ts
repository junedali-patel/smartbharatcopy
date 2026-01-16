import { db, auth, getDbInstance, getAuthInstance } from './firebaseConfig';
import { collection, addDoc, deleteDoc, doc, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';

interface StoredImage {
  id: string;
  userId: string;
  base64: string;
  mimeType: string;
  filename: string;
  uploadedAt: number;
  metadata?: {
    width?: number;
    height?: number;
    context?: string; // 'profile', 'service', 'disease-detection', etc.
  };
}

class FirestoreImageService {
  private static instance: FirestoreImageService;
  private collectionName = 'images';
  private MAX_BASE64_SIZE = 500 * 1024; // 500KB max per image (Firestore doc limit is 1MB)
  private MAX_DIMENSION = 400; // Max width/height in pixels for aggressive compression

  private constructor() {}

  static getInstance(): FirestoreImageService {
    if (!FirestoreImageService.instance) {
      FirestoreImageService.instance = new FirestoreImageService();
    }
    return FirestoreImageService.instance;
  }

  // Helper to get database instance with error handling
  private getDb() {
    const dbInstance = getDbInstance();
    if (!dbInstance) {
      throw new Error('Firebase Database not initialized');
    }
    return dbInstance;
  }

  // Helper to get auth instance
  private getAuth() {
    const authInstance = getAuthInstance();
    if (!authInstance) {
      throw new Error('Firebase Auth not initialized');
    }
    return authInstance;
  }

  /**
   * Store an image as base64 in Firestore with compression
   * @param base64 - Base64 encoded image string (raw or with data URI prefix)
   * @param mimeType - MIME type (e.g., 'image/jpeg')
   * @param context - Context of the image (e.g., 'profile', 'service')
   * @returns Promise with image ID
   */
  async uploadImage(
    base64: string,
    mimeType: string = 'image/jpeg',
    context: string = 'general'
  ): Promise<string> {
    try {
      const authInstance = this.getAuth();
      if (!authInstance.currentUser) {
        throw new Error('User not authenticated');
      }

      // Remove data:image/...;base64, prefix if present
      let cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;

      // Compress image if it's too large
      if (cleanBase64.length > this.MAX_BASE64_SIZE) {
        console.log(`Image size ${cleanBase64.length} bytes exceeds limit, compressing...`);
        cleanBase64 = await this.compressImageBase64(cleanBase64);
      }

      // Check final size
      if (cleanBase64.length > this.MAX_BASE64_SIZE) {
        throw new Error(`Image too large even after compression (${cleanBase64.length} bytes). Please use a smaller image.`);
      }

      const imageId = uuidv4();
      const imageRef = collection(this.getDb(), this.collectionName);

      const imageData: StoredImage = {
        id: imageId,
        userId: authInstance.currentUser.uid,
        base64: cleanBase64,
        mimeType,
        filename: `${imageId}.${this.getExtensionFromMimeType(mimeType)}`,
        uploadedAt: Date.now(),
        metadata: {
          context,
        },
      };

      await addDoc(imageRef, imageData);
      console.log('Image stored successfully:', imageId);
      return imageId;
    } catch (error) {
      console.error('Error storing image:', error);
      throw error;
    }
  }

  /**using Expo FileSystem
   */
  private async compressImageBase64(base64: string): Promise<string> {
    try {
      let compressedBase64 = base64;
      let currentQuality = 0.3; // Start very aggressive: 30%
      let iteration = 0;
      const maxIterations = 3;

      while (compressedBase64.length > this.MAX_BASE64_SIZE && iteration < maxIterations) {
        iteration++;
        console.log(`Compression pass ${iteration}: ${compressedBase64.length} bytes, quality: ${currentQuality}`);
        
        const dataUri = `data:image/jpeg;base64,${compressedBase64}`;
        const result = await ImageManipulator.manipulateAsync(dataUri, [
          { resize: { width: this.MAX_DIMENSION, height: this.MAX_DIMENSION } }
        ], { compress: currentQuality } as any);

        // Use Expo FileSystem to read the file as base64
        try {
          compressedBase64 = await FileSystem.readAsStringAsync(result.uri, {
            encoding: 'base64' as any,
          });
        } catch (fsError) {
          // Fallback: if FileSystem doesn't work, try fetch+blob
          const response = await fetch(result.uri);
          const blob = await response.blob();
          compressedBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const data = reader.result as string;
              const base64String = data.split(',')[1] || data;
              resolve(base64String);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }

        currentQuality = Math.max(0.15, currentQuality - 0.1); // Reduce quality further
      }

      console.log(`Final compressed size: ${compressedBase64.length} bytes`);
      return compressedBase64;
    } catch (error) {
      console.error('Compression failed, using original:', error);
      return base64;
    }
  }

  /**
   * Retrieve an image by ID
   * @param imageId - Image document ID
   * @returns Promise with base64 string
   */
  async getImage(imageId: string): Promise<string | null> {
    try {
      const imageRef = collection(this.getDb(), this.collectionName);
      const q = query(imageRef, where('id', '==', imageId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const imageDoc = querySnapshot.docs[0];
        const imageData = imageDoc.data() as StoredImage;
        return `data:${imageData.mimeType};base64,${imageData.base64}`;
      }
      return null;
    } catch (error) {
      console.error('Error retrieving image:', error);
      return null;
    }
  }

  /**
   * Delete an image by ID
   * @param imageId - Image document ID
   */
  async deleteImage(imageId: string): Promise<void> {
    try {
      const imageRef = collection(this.getDb(), this.collectionName);
      const q = query(imageRef, where('id', '==', imageId));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docId = querySnapshot.docs[0].id;
        await deleteDoc(doc(this.getDb(), this.collectionName, docId));
        console.log('Image deleted successfully:', imageId);
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  }

  /**
   * Get all images for current user
   */
  async getUserImages(): Promise<StoredImage[]> {
    try {
      const authInstance = this.getAuth();
      if (!authInstance.currentUser) {
        return [];
      }

      const imageRef = collection(this.getDb(), this.collectionName);
      const q = query(imageRef, where('userId', '==', authInstance.currentUser.uid));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        docId: doc.id,
      } as StoredImage & { docId: string }));
    } catch (error) {
      console.error('Error fetching user images:', error);
      return [];
    }
  }

  /**
   * Get images by context (e.g., 'profile', 'service')
   */
  async getImagesByContext(context: string): Promise<StoredImage[]> {
    try {
      const authInstance = this.getAuth();
      if (!authInstance.currentUser) {
        return [];
      }

      const imageRef = collection(this.getDb(), this.collectionName);
      const q = query(
        imageRef,
        where('userId', '==', authInstance.currentUser.uid),
        where('metadata.context', '==', context)
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => doc.data() as StoredImage);
    } catch (error) {
      console.error('Error fetching context images:', error);
      return [];
    }
  }

  /**
   * Convert MIME type to file extension
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const extensions: { [key: string]: string } = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
    };
    return extensions[mimeType] || 'jpg';
  }

  /**
   * Convert Data URI to base64
   */
  static dataUriToBase64(dataUri: string): string {
    return dataUri.includes(',') ? dataUri.split(',')[1] : dataUri;
  }

  /**
   * Create data URI from base64
   */
  static base64ToDataUri(base64: string, mimeType: string = 'image/jpeg'): string {
    return `data:${mimeType};base64,${base64}`;
  }
}

export default FirestoreImageService;
