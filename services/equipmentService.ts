import { getDb, getAuth } from '../config/firebase';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

export interface Equipment {
  id: string;
  userId: string;
  name: string;
  description: string;
  category: string; // Tractor, Harvester, Seeder, Sprayer, etc.
  dailyRate: number;
  location: string;
  city: string;
  state: string;
  phone: string;
  imageUrl?: string;
  status: 'Available' | 'Rented' | 'Maintenance';
  rating: number;
  totalBookings: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  specifications?: Record<string, string>; // hp, hours of operation, condition, etc.
}

class EquipmentService {
  private db = getDb();
  private auth = getAuth();

  /**
   * Add new equipment listing
   */
  async addEquipment(equipmentData: Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      if (!this.auth?.currentUser) {
        throw new Error('User not authenticated');
      }

      const equipmentRef = doc(collection(this.db, 'equipment'));
      const equipment: Equipment = {
        ...equipmentData,
        userId: this.auth.currentUser.uid,
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp,
      } as Equipment;

      await setDoc(equipmentRef, equipment);
      return equipmentRef.id;
    } catch (error) {
      console.error('Error adding equipment:', error);
      throw error;
    }
  }

  /**
   * Get all available equipment listings
   */
  async getAllEquipment(): Promise<Equipment[]> {
    try {
      const equipmentSnapshot = await getDocs(collection(this.db, 'equipment'));
      const equipmentList: Equipment[] = [];

      equipmentSnapshot.forEach((doc) => {
        equipmentList.push({
          id: doc.id,
          ...doc.data(),
        } as Equipment);
      });

      return equipmentList;
    } catch (error) {
      console.error('Error fetching equipment:', error);
      throw error;
    }
  }

  /**
   * Get equipment by category
   */
  async getEquipmentByCategory(category: string): Promise<Equipment[]> {
    try {
      const q = query(collection(this.db, 'equipment'), where('category', '==', category));
      const equipmentSnapshot = await getDocs(q);
      const equipmentList: Equipment[] = [];

      equipmentSnapshot.forEach((doc) => {
        equipmentList.push({
          id: doc.id,
          ...doc.data(),
        } as Equipment);
      });

      return equipmentList;
    } catch (error) {
      console.error('Error fetching equipment by category:', error);
      throw error;
    }
  }

  /**
   * Get equipment by location
   */
  async getEquipmentByLocation(city: string): Promise<Equipment[]> {
    try {
      const q = query(collection(this.db, 'equipment'), where('city', '==', city));
      const equipmentSnapshot = await getDocs(q);
      const equipmentList: Equipment[] = [];

      equipmentSnapshot.forEach((doc) => {
        equipmentList.push({
          id: doc.id,
          ...doc.data(),
        } as Equipment);
      });

      return equipmentList;
    } catch (error) {
      console.error('Error fetching equipment by location:', error);
      throw error;
    }
  }

  /**
   * Get user's own equipment listings
   */
  async getUserEquipment(): Promise<Equipment[]> {
    try {
      if (!this.auth?.currentUser) {
        throw new Error('User not authenticated');
      }

      const q = query(
        collection(this.db, 'equipment'),
        where('userId', '==', this.auth.currentUser.uid)
      );
      const equipmentSnapshot = await getDocs(q);
      const equipmentList: Equipment[] = [];

      equipmentSnapshot.forEach((doc) => {
        equipmentList.push({
          id: doc.id,
          ...doc.data(),
        } as Equipment);
      });

      return equipmentList;
    } catch (error) {
      console.error('Error fetching user equipment:', error);
      throw error;
    }
  }

  /**
   * Get equipment by status
   */
  async getEquipmentByStatus(status: 'Available' | 'Rented' | 'Maintenance'): Promise<Equipment[]> {
    try {
      const q = query(collection(this.db, 'equipment'), where('status', '==', status));
      const equipmentSnapshot = await getDocs(q);
      const equipmentList: Equipment[] = [];

      equipmentSnapshot.forEach((doc) => {
        equipmentList.push({
          id: doc.id,
          ...doc.data(),
        } as Equipment);
      });

      return equipmentList;
    } catch (error) {
      console.error('Error fetching equipment by status:', error);
      throw error;
    }
  }

  /**
   * Get single equipment details
   */
  async getEquipmentById(equipmentId: string): Promise<Equipment | null> {
    try {
      const equipmentRef = doc(this.db, 'equipment', equipmentId);
      const equipmentSnap = await getDoc(equipmentRef);

      if (equipmentSnap.exists()) {
        return {
          id: equipmentSnap.id,
          ...equipmentSnap.data(),
        } as Equipment;
      }

      return null;
    } catch (error) {
      console.error('Error fetching equipment:', error);
      throw error;
    }
  }

  /**
   * Update equipment details
   */
  async updateEquipment(equipmentId: string, updateData: Partial<Equipment>): Promise<void> {
    try {
      if (!this.auth?.currentUser) {
        throw new Error('User not authenticated');
      }

      const equipmentRef = doc(this.db, 'equipment', equipmentId);
      const equipment = await getDoc(equipmentRef);

      if (!equipment.exists()) {
        throw new Error('Equipment not found');
      }

      if (equipment.data().userId !== this.auth.currentUser.uid) {
        throw new Error('You do not have permission to update this equipment');
      }

      await updateDoc(equipmentRef, {
        ...updateData,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating equipment:', error);
      throw error;
    }
  }

  /**
   * Delete equipment listing
   */
  async deleteEquipment(equipmentId: string): Promise<void> {
    try {
      if (!this.auth?.currentUser) {
        throw new Error('User not authenticated');
      }

      const equipmentRef = doc(this.db, 'equipment', equipmentId);
      const equipment = await getDoc(equipmentRef);

      if (!equipment.exists()) {
        throw new Error('Equipment not found');
      }

      if (equipment.data().userId !== this.auth.currentUser.uid) {
        throw new Error('You do not have permission to delete this equipment');
      }

      await deleteDoc(equipmentRef);
    } catch (error) {
      console.error('Error deleting equipment:', error);
      throw error;
    }
  }

  /**
   * Update equipment status
   */
  async updateEquipmentStatus(equipmentId: string, status: 'Available' | 'Rented' | 'Maintenance'): Promise<void> {
    try {
      await this.updateEquipment(equipmentId, { status });
    } catch (error) {
      console.error('Error updating equipment status:', error);
      throw error;
    }
  }

  /**
   * Update equipment rating
   */
  async updateEquipmentRating(equipmentId: string, rating: number, totalBookings: number): Promise<void> {
    try {
      await this.updateEquipment(equipmentId, { rating, totalBookings });
    } catch (error) {
      console.error('Error updating equipment rating:', error);
      throw error;
    }
  }
}

export default new EquipmentService();
