import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ToastAndroid,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../../constants/newDesignSystem';
import { StyledCard, Heading1, Heading2, BodyText } from '../../components/StyledComponents';
import equipmentService, { Equipment } from '../../services/equipmentService';
import AddEquipmentModal from '../../components/AddEquipmentModal';
import BookingModal from '../../components/BookingModal';
import bookingService from '../../services/bookingService';
import { getAuth, getDb } from '../../config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { getCategoryImage, getCategoryIcon } from '../../utils/categoryImages';

export default function RentScreen() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [userBookings, setUserBookings] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'browse' | 'myListings' | 'bookings'>('browse');
  const [myEquipment, setMyEquipment] = useState<Equipment[]>([]);
  const [bookingRequests, setBookingRequests] = useState<any[]>([]);
  const [processingBooking, setProcessingBooking] = useState<string | null>(null);
  const [acceptedBookings, setAcceptedBookings] = useState<any[]>([]);
  const [deletingEquipment, setDeletingEquipment] = useState<string | null>(null);
  const [userCity, setUserCity] = useState<string | null>(null);

  const auth = getAuth();
  const currentUser = auth?.currentUser;

  useEffect(() => {
    fetchEquipment();
    if (!currentUser) return;
    
    // Set up real-time listeners
    const db = getDb();
    const unsubscribers: (() => void)[] = [];

    // Listener for booking requests (pending bookings for this owner)
    try {
      const bookingRequestsQuery = query(
        collection(db, 'bookings'),
        where('ownerId', '==', currentUser.uid),
        where('status', '==', 'pending')
      );
      const unsubBookingRequests = onSnapshot(bookingRequestsQuery, (snapshot) => {
        const requests: any[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          requests.push({
            id: doc.id,
            ...data,
            startDate: data.startDate?.toDate?.() || data.startDate,
            endDate: data.endDate?.toDate?.() || data.endDate,
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
          });
        });
        setBookingRequests(requests);
      });
      unsubscribers.push(unsubBookingRequests);
    } catch (error) {
      console.error('Error setting up booking requests listener:', error);
    }

    // Listener for accepted bookings (active rentals for this owner)
    try {
      const acceptedBookingsQuery = query(
        collection(db, 'bookings'),
        where('ownerId', '==', currentUser.uid),
        where('status', '==', 'accepted')
      );
      const unsubAcceptedBookings = onSnapshot(acceptedBookingsQuery, (snapshot) => {
        const bookings: any[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          bookings.push({
            id: doc.id,
            ...data,
            startDate: data.startDate?.toDate?.() || data.startDate,
            endDate: data.endDate?.toDate?.() || data.endDate,
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
          });
        });
        setAcceptedBookings(bookings);
      });
      unsubscribers.push(unsubAcceptedBookings);
    } catch (error) {
      console.error('Error setting up accepted bookings listener:', error);
    }

    // Listener for user bookings (pending bookings made by current user)
    try {
      const userBookingsQuery = query(
        collection(db, 'bookings'),
        where('renterId', '==', currentUser.uid),
        where('status', '==', 'pending')
      );
      const unsubUserBookings = onSnapshot(userBookingsQuery, (snapshot) => {
        const equipmentIds: string[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          equipmentIds.push(data.equipmentId);
        });
        setUserBookings(equipmentIds);
      });
      unsubscribers.push(unsubUserBookings);
    } catch (error) {
      console.error('Error setting up user bookings listener:', error);
    }

    // Listener for user's own equipment
    try {
      const myEquipmentQuery = query(
        collection(db, 'equipment'),
        where('userId', '==', currentUser.uid)
      );
      const unsubMyEquipment = onSnapshot(myEquipmentQuery, (snapshot) => {
        const userEquipment: Equipment[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          userEquipment.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
          } as Equipment);
        });
        setMyEquipment(userEquipment);
      });
      unsubscribers.push(unsubMyEquipment);
    } catch (error) {
      console.error('Error setting up my equipment listener:', error);
    }

    // Cleanup listeners on unmount
    return () => {
      unsubscribers.forEach(unsub => unsub?.());
    };
  }, [currentUser]);

  // Listener for equipment changes (to update status badges in real-time)
  useEffect(() => {
    const db = getDb();
    try {
      const equipmentQuery = query(collection(db, 'equipment'));
      const unsubEquipment = onSnapshot(equipmentQuery, (snapshot) => {
        const allEquipment: Equipment[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          allEquipment.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
          } as Equipment);
        });
        setEquipment(allEquipment);
      });
      return () => unsubEquipment();
    } catch (error) {
      console.error('Error setting up equipment listener:', error);
    }

    // Fetch user profile for city
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      if (!currentUser) return;
      const userService = require('../../services/userService').default;
      const profile = await userService.getInstance().getUserProfile();
      if (profile?.city) {
        console.log('User city from profile:', profile.city);
        setUserCity(profile.city);
      } else {
        console.log('No city found in user profile:', profile);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchMyEquipment = async () => {
    try {
      if (!currentUser) return;
      const data = await equipmentService.getAllEquipment();
      const userEquipment = data.filter(e => e.userId === currentUser.uid);
      setMyEquipment(userEquipment);
    } catch (error) {
      console.error('Error fetching user equipment:', error);
    }
  };

  const fetchBookingRequests = async () => {
    try {
      if (!currentUser) return;
      const bookings = await bookingService.getBookingRequestsForOwner(currentUser.uid);
      setBookingRequests(bookings);
    } catch (error) {
      console.error('Error fetching booking requests:', error);
    }
  };

  const fetchUserBookings = async () => {
    try {
      if (!currentUser) return;
      const bookings = await bookingService.getUserBookings();
      const requestedEquipmentIds = bookings
        .filter((booking: any) => booking.status === 'pending' && booking.renterId === currentUser.uid)
        .map((booking: any) => booking.equipmentId);
      setUserBookings(requestedEquipmentIds);
    } catch (error) {
      console.error('Error fetching user bookings:', error);
    }
  };

  const fetchAcceptedBookings = async () => {
    try {
      if (!currentUser) return;
      const allBookings = await bookingService.getOwnerBookings();
      const acceptedOnly = allBookings.filter((booking: any) => booking.status === 'accepted');
      setAcceptedBookings(acceptedOnly);
    } catch (error) {
      console.error('Error fetching accepted bookings:', error);
    }
  };

  const hasUserRequested = (equipmentId: string) => {
    return userBookings.includes(equipmentId);
  };

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await equipmentService.getAllEquipment();
      console.log('Equipment fetched:', data.map(e => ({ id: e.id, city: e.city, state: e.state, name: e.name })));
      setEquipment(data.sort((a, b) => {
        // Sort by status: Available first, then Rented, then Maintenance
        const statusOrder = { 'Available': 0, 'Rented': 1, 'Maintenance': 2 };
        return statusOrder[a.status] - statusOrder[b.status];
      }));
    } catch (err) {
      console.error('Error fetching equipment:', err);
      setError('Failed to load equipment. Please try again.');
      Alert.alert('Error', 'Failed to load equipment listings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchEquipment();
  };

  const showNotification = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('Notification', message);
    }
  };

  const calculateTotalEarnings = () => {
    return acceptedBookings.reduce((total: number, booking: any) => {
      if (!booking.equipment || !booking.startDate || !booking.endDate) return total;
      const days = Math.ceil((new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) / (1000 * 60 * 60 * 24));
      const equipmentItem = myEquipment.find(e => e.id === booking.equipmentId);
      const rate = equipmentItem?.dailyRate || 0;
      return total + (days * rate);
    }, 0);
  };

  const handleAcceptBooking = async (bookingId: string, equipmentId: string) => {
    if (processingBooking === bookingId) return;
    
    try {
      setProcessingBooking(bookingId);
      await bookingService.updateBookingStatus(bookingId, 'accepted');
      showNotification('Booking accepted! Service is now booked.');
      
      await fetchEquipment();
      await fetchBookingRequests();
      await fetchAcceptedBookings();
    } catch (error) {
      console.error('Error accepting booking:', error);
      showNotification('Failed to accept booking. Please try again.');
    } finally {
      setProcessingBooking(null);
    }
  };

  const handleDeclineBooking = async (bookingId: string) => {
    if (processingBooking === bookingId) return;
    
    try {
      setProcessingBooking(bookingId);
      await bookingService.updateBookingStatus(bookingId, 'rejected');
      showNotification('Booking declined.');
      
      await fetchBookingRequests();
    } catch (error) {
      console.error('Error declining booking:', error);
      showNotification('Failed to decline booking. Please try again.');
    } finally {
      setProcessingBooking(null);
    }
  };

  const getEquipmentBookingStatus = (equipmentId: string) => {
    return bookingRequests.find(
      (req) => req.equipmentId === equipmentId && req.status === 'pending'
    );
  };

  // Filter equipment by user's city for browse mode
  const filteredEquipment = userCity 
    ? equipment.filter(item => {
        // Normalize city names for comparison (case-insensitive, trim whitespace)
        const userCityNormalized = userCity.toLowerCase().trim();
        const itemCityNormalized = (item.city || '').toLowerCase().trim();
        const itemStateNormalized = (item.state || '').toLowerCase().trim();
        
        console.log(`Comparing: userCity="${userCityNormalized}" with item.city="${itemCityNormalized}" and item.state="${itemStateNormalized}"`);
        
        // Match by city or state field (but NOT if state is from a different city's state)
        const cityMatch = itemCityNormalized === userCityNormalized;
        const stateMatch = itemStateNormalized === userCityNormalized;
        
        return cityMatch || stateMatch;
      })
    : equipment;

  const handleDeleteEquipment = async (equipmentId: string) => {
    try {
      console.log('Deleting:', equipmentId);
      
      // Call delete API
      await equipmentService.deleteEquipment(equipmentId);
      console.log('✅ Deleted from Firestore');
      
      // Remove from myEquipment
      setMyEquipment(prev => prev.filter(e => e.id !== equipmentId));
      
      // Remove from equipment
      setEquipment(prev => prev.filter(e => e.id !== equipmentId));
      
      console.log('✅ Removed from UI');
    } catch (error: any) {
      console.error('Error:', error?.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available':
        return { bg: '#22c55e', text: 'Available' };
      case 'Rented':
        return { bg: '#3b82f6', text: 'Rented' };
      case 'Maintenance':
        return { bg: '#f59e0b', text: 'Maintenance' };
      default:
        return { bg: '#6b7280', text: status };
    }
  };

  const totalEarnings = equipment.reduce((sum, item) => sum + item.dailyRate, 0);
  const activeBookings = equipment.filter(e => e.status === 'Rented').length;
  const availableEquipment = equipment.filter(e => e.status === 'Available').length;

  const handleBookEquipment = (equipment: Equipment) => {
    if (!currentUser) {
      Alert.alert('Login Required', 'Please log in to book equipment', [
        { text: 'Cancel', onPress: () => {} },
        { text: 'Go to Login', onPress: () => router.push('/auth/login') },
      ]);
      return;
    }
    setSelectedEquipment(equipment);
    setShowBookingModal(true);
  };

  const handleBookingSuccess = () => {
    showNotification('Booking sent! Waiting for owner approval.');
    fetchEquipment();
    fetchUserBookings();
    fetchBookingRequests();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: Colors.background.light }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <BodyText style={{ marginTop: 16, color: Colors.text.primary }}>Loading equipment...</BodyText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.background.light }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Heading2 style={{ color: Colors.text.primary }}>Equipment Rental</Heading2>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.addBtn}
              onPress={() => setShowAddModal(true)}
            >
              <MaterialIcons name="add" size={24} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* View Mode Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, viewMode === 'browse' && styles.tabActive]}
            onPress={() => setViewMode('browse')}
          >
            <MaterialIcons name="shopping-cart" size={18} color={viewMode === 'browse' ? Colors.primary : Colors.text.secondary} />
            <Text style={[styles.tabText, viewMode === 'browse' && styles.tabTextActive]}>Browse</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, viewMode === 'myListings' && styles.tabActive]}
            onPress={() => setViewMode('myListings')}
          >
            <MaterialIcons name="list" size={18} color={viewMode === 'myListings' ? Colors.primary : Colors.text.secondary} />
            <Text style={[styles.tabText, viewMode === 'myListings' && styles.tabTextActive]}>My Listings</Text>
            {bookingRequests.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{bookingRequests.length}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, viewMode === 'bookings' && styles.tabActive]}
            onPress={() => setViewMode('bookings')}
          >
            <MaterialIcons name="event-note" size={18} color={viewMode === 'bookings' ? Colors.primary : Colors.text.secondary} />
            <Text style={[styles.tabText, viewMode === 'bookings' && styles.tabTextActive]}>Bookings</Text>
            {acceptedBookings.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{acceptedBookings.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Browse Mode Content */}
        {viewMode === 'browse' && (
          <>
            {/* Stats Card */}
            <View style={[styles.statsCard]}>
              <View style={styles.statsTop}>
                <View>
                  <BodyText style={styles.statsLabel}>Available Items</BodyText>
                  <Heading1 style={{ color: '#fff', marginTop: 4 }}>{availableEquipment.toString()}</Heading1>
                </View>
                <View style={styles.statsIcon}>
                  <MaterialIcons name="agriculture" size={32} color="#fff" />
                </View>
              </View>

              <View style={styles.statsDivider} />

              <View style={styles.statsBottom}>
                <View style={styles.statItem}>
                  <BodyText style={styles.statsSmallLabel}>Active Rentals</BodyText>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 4 }}>{activeBookings}</Text>
                </View>
                <View style={styles.statsVerticalDivider} />
                <View style={styles.statItem}>
                  <BodyText style={styles.statsSmallLabel}>Total Items</BodyText>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 4 }}>{equipment.length}</Text>
                </View>
              </View>
            </View>

            {/* Equipment List */}
            <View style={styles.listHeader}>
              <Heading2 style={{ color: Colors.text.primary }}>All Equipment</Heading2>
              <BodyText style={{ color: Colors.text.tertiary }}>({filteredEquipment.length})</BodyText>
              {filteredEquipment.length > 0 && (
                <TouchableOpacity onPress={handleRefresh} style={{ marginLeft: 'auto' }}>
                  <MaterialIcons name="refresh" size={24} color={Colors.primary} />
                </TouchableOpacity>
              )}
            </View>

        {filteredEquipment.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="agriculture" size={48} color={Colors.text.tertiary} />
            <BodyText style={{ marginTop: 12, color: Colors.text.secondary }}>
              No equipment available in your city
            </BodyText>
            <BodyText style={{ marginTop: 4, color: Colors.text.tertiary, fontSize: 12 }}>
              Check back soon for new listings
            </BodyText>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {filteredEquipment.map((item) => {
              const statusColor = getStatusColor(item.status);
              return (
                <StyledCard
                  key={item.id}
                  style={styles.equipmentCard}
                  onPress={() => {
                    Alert.alert('Equipment Details', `${item.name}\n₹${item.dailyRate}/day\n${item.location}`, [
                      { text: 'Close', onPress: () => {} },
                      { text: 'Contact', onPress: () => Alert.alert('Contact', `Call: ${item.phone}`) },
                    ]);
                  }}
                >
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {/* Equipment Image Placeholder */}
                    <View style={[styles.equipmentImage, item.status === 'Maintenance' && { opacity: 0.6 }]}>
                      <Image
                        source={getCategoryImage(item.category)}
                        style={[styles.imagePlaceholder, { borderRadius: 8 }]}
                        resizeMode="cover"
                      />
                      <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: statusColor.text }]}>{item.status}</Text>
                      </View>
                    </View>

                    {/* Equipment Details */}
                    <View style={{ flex: 1, justifyContent: 'space-between' }}>
                      <View>
                        <Heading2 style={{ color: Colors.text.primary, marginBottom: 4 }}>
                          {item.name}
                        </Heading2>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                          <MaterialIcons name="location-on" size={14} color={Colors.text.tertiary} />
                          <BodyText style={{ color: Colors.text.secondary, fontSize: 12 }}>
                            {item.city}, {item.state}
                          </BodyText>
                        </View>
                        {item.category && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <MaterialIcons name="category" size={12} color={Colors.text.tertiary} />
                            <BodyText style={{ color: Colors.text.tertiary, fontSize: 11 }}>
                              {item.category}
                            </BodyText>
                          </View>
                        )}
                      </View>

                      {/* Price, Rating and Action */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <View>
                          <BodyText style={{ color: Colors.text.tertiary, fontSize: 11, fontWeight: '600' }}>
                            DAILY RATE
                          </BodyText>
                          <Text style={{ color: Colors.primary, fontSize: 16, fontWeight: 'bold', marginTop: 2 }}>
                            ₹{item.dailyRate.toLocaleString()}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          {item.rating > 0 && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                              <MaterialIcons name="star" size={14} color="#fbbf24" />
                              <Text style={{ color: Colors.text.primary, fontSize: 12, fontWeight: '600' }}>
                                {item.rating.toFixed(1)}
                              </Text>
                            </View>
                          )}
                          <BodyText style={{ color: Colors.text.tertiary, fontSize: 10 }}>
                            {item.totalBookings} bookings
                          </BodyText>
                          {item.status === 'Available' && item.userId !== currentUser?.uid && !hasUserRequested(item.id) && (
                            <TouchableOpacity
                              style={styles.bookBtn}
                              onPress={(e) => {
                                e.stopPropagation();
                                handleBookEquipment(item);
                              }}
                            >
                              <Text style={styles.bookBtnText}>Book Now</Text>
                            </TouchableOpacity>
                          )}
                          {item.status === 'Available' && item.userId !== currentUser?.uid && hasUserRequested(item.id) && (
                            <View style={styles.requestedBadge}>
                              <Text style={styles.requestedBadgeText}>Requested</Text>
                            </View>
                          )}
                          {item.userId === currentUser?.uid && (
                            <View style={styles.ownerBadge}>
                              <Text style={styles.ownerBadgeText}>Your Equipment</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  </View>
                </StyledCard>
              );
            })}
          </View>
        )}
          </>
        )}

        {/* My Listings Mode Content */}
        {viewMode === 'myListings' && (
          <>
            {/* Earnings Card */}
            <View style={[styles.statsCard, { marginBottom: 16 }]}>
              <View style={styles.statsTop}>
                <View>
                  <BodyText style={styles.statsLabel}>Total Earnings</BodyText>
                  <Heading1 style={{ color: '#fff', marginTop: 4 }}>{`₹${calculateTotalEarnings().toLocaleString()}`}</Heading1>
                </View>
                <View style={styles.statsIcon}>
                  <MaterialIcons name="attach-money" size={32} color="#fff" />
                </View>
              </View>

              <View style={styles.statsDivider} />

              <View style={styles.statsBottom}>
                <View style={styles.statItem}>
                  <BodyText style={styles.statsSmallLabel}>Active Bookings</BodyText>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 4 }}>{acceptedBookings.length}</Text>
                </View>
                <View style={styles.statsVerticalDivider} />
                <View style={styles.statItem}>
                  <BodyText style={styles.statsSmallLabel}>My Equipment</BodyText>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 4 }}>{myEquipment.length}</Text>
                </View>
              </View>
            </View>

            <View style={styles.listHeader}>
              <Heading2 style={{ color: Colors.text.primary }}>Your Equipment</Heading2>
              <BodyText style={{ color: Colors.text.tertiary }}>({myEquipment.length})</BodyText>
            </View>

            {myEquipment.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="inventory-2" size={48} color={Colors.text.tertiary} />
                <BodyText style={{ marginTop: 12, color: Colors.text.secondary }}>
                  No equipment listed yet
                </BodyText>
                <TouchableOpacity 
                  style={{ marginTop: 16, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: Colors.primary, borderRadius: BorderRadius.default }}
                  onPress={() => setShowAddModal(true)}
                >
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Add Your First Equipment</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {myEquipment.map((item) => (
                  <StyledCard
                    key={item.id}
                    style={styles.equipmentCard}
                    onPress={() => {
                      Alert.alert('Your Equipment', `${item.name}\n₹${item.dailyRate}/day`, [
                        { text: 'Close', onPress: () => {} },
                        { text: 'Edit', onPress: () => {} },
                      ]);
                    }}
                  >
                    <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', gap: 12, flex: 1 }}>
                        <View style={[styles.equipmentImage, item.status === 'Maintenance' && { opacity: 0.6 }]}>
                          <Image
                            source={getCategoryImage(item.category)}
                            style={[styles.imagePlaceholder, { borderRadius: 8 }]}
                            resizeMode="cover"
                          />
                          {getEquipmentBookingStatus(item.id) ? (
                            <View style={[styles.statusBadge, { backgroundColor: '#eab308' }]}>
                              <Text style={[styles.statusBadgeText, { color: '#ffffff' }]}>Requested</Text>
                            </View>
                          ) : (
                            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status).bg }]}>
                              <Text style={[styles.statusBadgeText, { color: getStatusColor(item.status).text }]}>{item.status}</Text>
                            </View>
                          )}
                        </View>

                        <View style={{ flex: 1, justifyContent: 'space-between' }}>
                          <View>
                            <Heading2 style={{ color: Colors.text.primary, marginBottom: 4 }}>
                              {item.name}
                            </Heading2>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.primary, marginBottom: 4 }}>
                              ₹{item.dailyRate.toLocaleString()}/day
                            </Text>
                            <BodyText style={{ color: Colors.text.secondary, fontSize: 12 }}>
                              {item.city}, {item.state}
                            </BodyText>
                          </View>

                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                            <BodyText style={{ color: Colors.text.tertiary, fontSize: 11 }}>
                              {item.totalBookings} bookings
                            </BodyText>
                            {bookingRequests.filter(br => br.equipmentId === item.id).length > 0 && (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                                <MaterialIcons name="notifications-active" size={14} color="#f59e0b" />
                                <Text style={{ fontSize: 12, fontWeight: '600', color: '#f59e0b' }}>
                                  {bookingRequests.filter(br => br.equipmentId === item.id).length} request(s)
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>

                      <TouchableOpacity 
                        style={[styles.deleteBtn, { opacity: deletingEquipment === item.id ? 0.5 : 1 }]}
                        onPress={() => handleDeleteEquipment(item.id)}
                        disabled={deletingEquipment === item.id}
                      >
                        <MaterialIcons name="delete" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </StyledCard>
                ))}
              </View>
            )}

            {/* Booking Requests Section */}
            {bookingRequests.length > 0 && (
              <>
                <Heading2 style={{ color: Colors.text.primary, marginTop: 20, marginHorizontal: 16, marginBottom: 12 }}>
                  Booking Requests
                </Heading2>
                <View style={{ gap: 12 }}>
                  {bookingRequests.map((request) => (
                    <View key={request.id} style={{ opacity: processingBooking === request.id ? 0.5 : 1 }}>
                      <StyledCard
                        style={styles.equipmentCard}
                      >
                      <View style={{ gap: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View>
                            <BodyText style={{ color: Colors.text.secondary, fontSize: 12 }}>From</BodyText>
                            <Heading2 style={{ color: Colors.text.primary }}>{request.renterName}</Heading2>
                          </View>
                          <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#22c55e' }}>Pending</Text>
                          </View>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 16 }}>
                          <View style={{ flex: 1 }}>
                            <BodyText style={{ color: Colors.text.tertiary, fontSize: 11 }}>Equipment</BodyText>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.text.primary, marginTop: 2 }}>
                              {request.equipmentName}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <BodyText style={{ color: Colors.text.tertiary, fontSize: 11 }}>Duration</BodyText>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.text.primary, marginTop: 2 }}>
                              {request.days} days
                            </Text>
                          </View>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.border }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.primary }}>
                            ₹{request.totalAmount.toLocaleString()}
                          </Text>
                          <View style={styles.bookingActionBtn}>
                            <TouchableOpacity 
                              style={[styles.actionBtn, { backgroundColor: '#ef4444', opacity: processingBooking === request.id ? 0.5 : 1 }]}
                              onPress={() => handleDeclineBooking(request.id)}
                              disabled={processingBooking === request.id}
                            >
                              <MaterialIcons name="close" size={18} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={[styles.actionBtn, { backgroundColor: '#3b82f6', opacity: processingBooking === request.id ? 0.5 : 1 }]}
                              onPress={() => handleAcceptBooking(request.id, request.equipmentId)}
                              disabled={processingBooking === request.id}
                            >
                              <MaterialIcons name="check" size={18} color="#fff" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </StyledCard>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}

        {/* Bookings View */}
        {viewMode === 'bookings' && (
          <>
            <Heading2 style={{ color: Colors.text.primary, marginHorizontal: 16, marginVertical: 16 }}>
              Active Bookings
            </Heading2>
            {acceptedBookings.length === 0 ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="event-busy" size={48} color={Colors.text.tertiary} />
                <BodyText style={{ color: Colors.text.secondary, marginTop: 12, textAlign: 'center' }}>
                  No active bookings yet
                </BodyText>
              </View>
            ) : (
              <View style={{ gap: 12, paddingHorizontal: 16 }}>
                {acceptedBookings.map((booking) => {
                  const startDate = booking.startDate instanceof Date ? booking.startDate : new Date();
                  const endDate = booking.endDate instanceof Date ? booking.endDate : new Date();
                  const daysRemaining = Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  
                  return (
                    <StyledCard key={booking.id} style={styles.equipmentCard}>
                      <View style={{ gap: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View>
                            <BodyText style={{ color: Colors.text.secondary, fontSize: 12 }}>Renter</BodyText>
                            <Heading2 style={{ color: Colors.text.primary }}>{booking.renterName}</Heading2>
                          </View>
                          <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#22c55e' }}>Active</Text>
                          </View>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 16 }}>
                          <View style={{ flex: 1 }}>
                            <BodyText style={{ color: Colors.text.tertiary, fontSize: 11 }}>Equipment</BodyText>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.text.primary, marginTop: 2 }}>
                              {booking.equipmentName}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <BodyText style={{ color: Colors.text.tertiary, fontSize: 11 }}>Days Left</BodyText>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: daysRemaining <= 3 ? '#ef4444' : Colors.text.primary, marginTop: 2 }}>
                              {daysRemaining} days
                            </Text>
                          </View>
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.border }}>
                          <View>
                            <BodyText style={{ color: Colors.text.tertiary, fontSize: 10 }}>Total Amount</BodyText>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.primary, marginTop: 2 }}>
                              ₹{booking.totalAmount.toLocaleString()}
                            </Text>
                          </View>
                          <TouchableOpacity style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.primary }}>
                            <MaterialIcons name="phone" size={18} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </StyledCard>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* FAB - List New Item */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
        <MaterialIcons name="add" size={28} color="#fff" />
        <Text style={styles.fabText}>List Equipment</Text>
      </TouchableOpacity>

      {/* Add Equipment Modal */}
      <AddEquipmentModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={(newEquipment) => {
          setEquipment([newEquipment, ...equipment]);
        }}
      />

      {/* Booking Modal */}
      <BookingModal
        visible={showBookingModal}
        equipment={selectedEquipment}
        ownerDetails={selectedEquipment ? {
          name: 'Equipment Owner',
          phone: selectedEquipment.phone || '+91-9999999999',
          rating: 4.5,
        } : null}
        onClose={() => {
          setShowBookingModal(false);
          setSelectedEquipment(null);
        }}
        onSuccess={handleBookingSuccess}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: { paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  requestedBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  requestedBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  statsCard: {
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
  },
  statsTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statsLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '500' },
  statsIcon: { backgroundColor: 'rgba(255,255,255,0.15)', padding: 8, borderRadius: BorderRadius.default },
  statsDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 12 },
  statsBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: { flex: 1 },
  statsSmallLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  statsVerticalDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 12 },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  equipmentCard: {
    marginHorizontal: 16,
    marginBottom: 0,
  },
  equipmentImage: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.default,
    backgroundColor: Colors.background.light,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusBadgeText: { fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase' },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    boxShadow: `0px 4px 8px ${Colors.primary}4d`,
  },
  fabText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  bookBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  bookBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  ownerBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  ownerBadgeText: {
    color: '#6b7280',
    fontSize: 10,
    fontWeight: '600',
  },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.default,
    backgroundColor: Colors.background.light,
  },
  tabActive: {
    backgroundColor: `${Colors.primary}15`,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  tabBadge: {
    marginLeft: 'auto',
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  bookingActionBtn: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
