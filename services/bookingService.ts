import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { getAuth } from '../config/firebase';

export interface Booking {
  id: string;
  equipmentId: string;
  equipmentName: string;
  renterId: string;
  renterName: string;
  renterPhone: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  startDate: Date;
  endDate: Date;
  totalAmount: number;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

class BookingService {
  private db = getFirestore();
  private bookingsCollection = collection(this.db, 'bookings');

  /**
   * Get all bookings for the current user (as renter)
   */
  async getUserBookings(): Promise<Booking[]> {
    try {
      const auth = getAuth();
      const currentUser = auth?.currentUser;

      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const q = query(
        this.bookingsCollection,
        where('renterId', '==', currentUser.uid)
      );

      const querySnapshot = await getDocs(q);
      const bookings: Booking[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        bookings.push({
          id: doc.id,
          equipmentId: data.equipmentId,
          equipmentName: data.equipmentName,
          renterId: data.renterId,
          renterName: data.renterName,
          renterPhone: data.renterPhone,
          ownerId: data.ownerId,
          ownerName: data.ownerName,
          ownerPhone: data.ownerPhone,
          startDate: this.convertTimestamp(data.startDate),
          endDate: this.convertTimestamp(data.endDate),
          totalAmount: data.totalAmount,
          status: data.status,
          createdAt: this.convertTimestamp(data.createdAt),
          updatedAt: this.convertTimestamp(data.updatedAt),
        });
      });

      return bookings;
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      throw error;
    }
  }

  /**
   * Get booking requests for equipment owned by the current user
   */
  async getBookingRequestsForOwner(ownerId: string): Promise<any[]> {
    try {
      const q = query(
        this.bookingsCollection,
        where('ownerId', '==', ownerId),
        where('status', '==', 'pending')
      );

      const querySnapshot = await getDocs(q);
      const requests: any[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        requests.push({
          id: doc.id,
          equipmentId: data.equipmentId,
          equipmentName: data.equipmentName,
          renterName: data.renterName,
          renterPhone: data.renterPhone,
          startDate: this.convertTimestamp(data.startDate),
          endDate: this.convertTimestamp(data.endDate),
          days: this.calculateDays(this.convertTimestamp(data.startDate), this.convertTimestamp(data.endDate)),
          totalAmount: data.totalAmount,
          status: data.status,
        });
      });

      return requests;
    } catch (error) {
      console.error('Error fetching booking requests for owner:', error);
      return [];
    }
  }

  /**
   * Get all bookings for equipment owned by the current user
   */
  async getOwnerBookings(): Promise<Booking[]> {
    try {
      const auth = getAuth();
      const currentUser = auth?.currentUser;

      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const q = query(
        this.bookingsCollection,
        where('ownerId', '==', currentUser.uid)
      );

      const querySnapshot = await getDocs(q);
      const bookings: Booking[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        bookings.push({
          id: doc.id,
          equipmentId: data.equipmentId,
          equipmentName: data.equipmentName,
          renterId: data.renterId,
          renterName: data.renterName,
          renterPhone: data.renterPhone,
          ownerId: data.ownerId,
          ownerName: data.ownerName,
          ownerPhone: data.ownerPhone,
          startDate: this.convertTimestamp(data.startDate),
          endDate: this.convertTimestamp(data.endDate),
          totalAmount: data.totalAmount,
          status: data.status,
          createdAt: this.convertTimestamp(data.createdAt),
          updatedAt: this.convertTimestamp(data.updatedAt),
        });
      });

      return bookings;
    } catch (error) {
      console.error('Error fetching owner bookings:', error);
      throw error;
    }
  }

  /**
   * Create a new booking
   */
  async createBooking(bookingData: {
    equipmentId: string;
    equipmentName: string;
    ownerId: string;
    ownerName: string;
    ownerPhone: string;
    renterName: string;
    renterPhone: string;
    startDate: Date;
    endDate: Date;
    totalAmount: number;
  }): Promise<Booking> {
    try {
      const auth = getAuth();
      const currentUser = auth?.currentUser;

      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      const now = new Date();
      const bookingRef = await addDoc(this.bookingsCollection, {
        equipmentId: bookingData.equipmentId,
        equipmentName: bookingData.equipmentName,
        renterId: currentUser.uid,
        renterName: bookingData.renterName,
        renterPhone: bookingData.renterPhone,
        ownerId: bookingData.ownerId,
        ownerName: bookingData.ownerName,
        ownerPhone: bookingData.ownerPhone,
        startDate: Timestamp.fromDate(bookingData.startDate),
        endDate: Timestamp.fromDate(bookingData.endDate),
        totalAmount: bookingData.totalAmount,
        status: 'pending',
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      });

      return {
        id: bookingRef.id,
        ...bookingData,
        status: 'pending',
        renterId: currentUser.uid,
        createdAt: now,
        updatedAt: now,
      };
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  }

  /**
   * Update booking status
   */
  async updateBookingStatus(
    bookingId: string,
    status: 'accepted' | 'rejected' | 'completed' | 'cancelled'
  ): Promise<void> {
    try {
      const bookingDocRef = doc(this.db, 'bookings', bookingId);
      await updateDoc(bookingDocRef, {
        status,
        updatedAt: Timestamp.fromDate(new Date()),
      });
    } catch (error) {
      console.error('Error updating booking status:', error);
      throw error;
    }
  }

  /**
   * Get a specific booking by ID
   */
  async getBooking(bookingId: string): Promise<Booking | null> {
    try {
      const bookingDocRef = doc(this.db, 'bookings', bookingId);
      const docSnap = await getDocs(query(this.bookingsCollection, where('id', '==', bookingId)));

      if (docSnap.empty) {
        return null;
      }

      const data = docSnap.docs[0].data();
      return {
        id: bookingId,
        equipmentId: data.equipmentId,
        equipmentName: data.equipmentName,
        renterId: data.renterId,
        renterName: data.renterName,
        renterPhone: data.renterPhone,
        ownerId: data.ownerId,
        ownerName: data.ownerName,
        ownerPhone: data.ownerPhone,
        startDate: this.convertTimestamp(data.startDate),
        endDate: this.convertTimestamp(data.endDate),
        totalAmount: data.totalAmount,
        status: data.status,
        createdAt: this.convertTimestamp(data.createdAt),
        updatedAt: this.convertTimestamp(data.updatedAt),
      };
    } catch (error) {
      console.error('Error fetching booking:', error);
      throw error;
    }
  }

  /**
   * Helper method to safely convert Firestore Timestamp to Date
   */
  private convertTimestamp(timestamp: any): Date {
    if (!timestamp) {
      return new Date();
    }
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    if (timestamp instanceof Date) {
      return timestamp;
    }
    return new Date();
  }

  /**
   * Helper method to calculate days between two dates
   */
  private calculateDays(startDate: Date, endDate: Date): number {
    const timeDifference = endDate.getTime() - startDate.getTime();
    return Math.ceil(timeDifference / (1000 * 3600 * 24));
  }
}

export default new BookingService();
