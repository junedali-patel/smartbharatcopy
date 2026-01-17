import React, { useState, useEffect } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, ScrollView, Image, Pressable, Dimensions, Linking, Alert, TextInput, SafeAreaView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { collection, getDocs, addDoc, serverTimestamp, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { getDb, getAuth } from '../config/firebase';
import AddServiceForm from './AddServiceForm';
import { useAuth } from '../contexts/AuthContext';
// Theme colors
const colors = {
  background: '#FFFFFF',
  cardBackground: '#FFFFFF',
  border: '#E0E0E0',
  text: '#333333',
  textSecondary: '#666666',
  primary: '#2E7D32',
  shadow: 'rgba(0, 0, 0, 0.1)'
};

// Types
type ServiceProvider = {
  id: string;
  name: string;
  contact: string;
  rating: number;
  price: string;
  location: string;
  available: boolean;
  image?: string;
  userId: string;
};

type ServiceItem = {
  id: string;
  name: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  description: string;
  providers: ServiceProvider[];
};

interface FarmerServicesModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function FarmerServicesModal({ visible, onClose }: FarmerServicesModalProps) {
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [tab, setTab] = useState<'all' | 'listings' | 'bookings' | 'providerBookings'>('all');
  const [myListings, setMyListings] = useState<ServiceItem[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [editListing, setEditListing] = useState<any | null>(null);
  const [providerBookings, setProviderBookings] = useState<any[]>([]);
  const [reviewModal, setReviewModal] = useState<{ booking: any, visible: boolean } | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [providerReviews, setProviderReviews] = useState<{ [providerId: string]: any[] }>({});
  const [providerAvgRatings, setProviderAvgRatings] = useState<{ [providerId: string]: number }>({});
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'netbanking'>('cash');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  const [confirmBooking, setConfirmBooking] = useState<ServiceProvider | null>(null);
  const [bookedProviderIds, setBookedProviderIds] = useState<string[]>([]);
  const user = getAuth()?.currentUser ?? null;
  
  const backgroundColor = colors.background;
  const textColor = colors.text;
  const tintColor = colors.primary;
  const iconColor = colors.text;
  const cardBackground = colors.cardBackground;

  // Detect if this is being used as a full page (visible always, onClose is a no-op)
  const isFullPage = visible && typeof onClose === 'function' && onClose.toString().includes('noop');

  const fetchServices = () => {
    setLoading(true);
    const grouped: { [type: string]: ServiceItem } = {};
    getDocs(collection(getDb(), 'services')).then(snapshot => {
      snapshot.forEach(doc => {
        const data = doc.data();
        const type = data.type || 'Other';
        if (!grouped[type]) {
          grouped[type] = {
            id: type,
            name: type,
            icon: 'agriculture',
            description: '',
            providers: [],
          };
        }
        grouped[type].providers.push({
          id: doc.id,
          name: data.title,
          contact: data.contact,
          rating: data.rating || 0,
          price: `₹${data.dailyRate}/day`,
          location: data.location,
          available: data.available,
          image: data.images?.[0],
          userId: data.userId,
        });
      });
      setServices(Object.values(grouped));
      setLoading(false);
    });
  };

  const fetchMyListings = () => {
    if (!user) return;
    setLoading(true);
    getDocs(collection(getDb(), 'services')).then(snapshot => {
      const grouped: { [type: string]: ServiceItem } = {};
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.userId === user.uid) {
          const type = data.type || 'Other';
          if (!grouped[type]) {
            grouped[type] = {
              id: type,
              name: type,
              icon: 'agriculture',
              description: '',
              providers: [],
            };
          }
          grouped[type].providers.push({
            id: doc.id,
            name: data.title,
            contact: data.contact,
            rating: data.rating || 0,
            price: `₹${data.dailyRate}/day`,
            location: data.location,
            available: data.available,
            image: data.images?.[0],
            userId: data.userId,
          });
        }
      });
      setMyListings(Object.values(grouped));
      setLoading(false);
    });
  };

  const fetchMyBookings = () => {
    if (!user) return;
    setLoading(true);
    getDocs(collection(getDb(), 'bookings')).then(snapshot => {
      const bookings: any[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.renterId === user.uid) {
          bookings.push({ id: doc.id, ...data });
        }
      });
      setMyBookings(bookings);
      setLoading(false);
    });
  };

  const fetchProviderBookings = () => {
    if (!user) return;
    setLoading(true);
    getDocs(collection(getDb(), 'bookings')).then(snapshot => {
      const bookings: any[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.providerId === user.uid) {
          bookings.push({ id: doc.id, ...data });
        }
      });
      setProviderBookings(bookings);
      setLoading(false);
    });
  };

  const fetchProviderReviews = async (providerId: string) => {
    const snapshot = await getDocs(collection(getDb(), 'reviews'));
    const reviews = snapshot.docs.filter(doc => doc.data().providerId === providerId).map(doc => doc.data());
    setProviderReviews(prev => ({ ...prev, [providerId]: reviews }));
    if (reviews.length > 0) {
      const avg = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;
      setProviderAvgRatings(prev => ({ ...prev, [providerId]: avg }));
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewModal) return;
    try {
      await addDoc(collection(getDb(), 'reviews'), {
        bookingId: reviewModal.booking.id,
        providerId: reviewModal.booking.providerId,
        renterId: user?.uid,
        rating: reviewRating,
        comment: reviewText,
        createdAt: new Date(),
      });
      setReviewModal(null);
      setReviewText('');
      setReviewRating(5);
      fetchProviderReviews(reviewModal.booking.providerId);
      setFeedback({ type: 'success', message: 'Thank you! Your review has been submitted.' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (error) {
      setFeedback({ type: 'error', message: 'Failed to submit review.' });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleUpdateBookingStatus = async (booking: any, status: string) => {
    try {
      await updateDoc(doc(getDb(), 'bookings', booking.id), { status });
      fetchProviderBookings();
      setFeedback({ type: 'success', message: `Booking marked as ${status}.` });
      setTimeout(() => setFeedback(null), 3000);
    } catch (error) {
      setFeedback({ type: 'error', message: 'Failed to update booking status.' });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  useEffect(() => {
    if (!visible) return;
    fetchServices();
    if (user) {
      fetchMyListings();
      fetchMyBookings();
      fetchProviderBookings();
    }
  }, [visible, user]);

  const handleServiceSelect = (service: ServiceItem) => {
    setSelectedService(service);
    setSelectedProvider(null);
  };

  const handleProviderSelect = (provider: ServiceProvider) => {
    setSelectedProvider(provider);
  };

  const handleBack = () => {
    if (selectedProvider) {
      setSelectedProvider(null);
    } else if (selectedService) {
      setSelectedService(null);
    } else {
      onClose();
    }
  };

  const handleBook = async (provider: ServiceProvider) => {
    try {
      const user = getAuth()?.currentUser;
      if (!user || !getDb()) {
        setFeedback({ type: 'error', message: 'Login required. Please log in to book a service.' });
        setTimeout(() => setFeedback(null), 3000);
        return;
      }
      await addDoc(collection(getDb(), 'bookings'), {
        serviceId: selectedService?.id,
        providerId: provider.id,
        providerName: provider.name,
        renterId: user.uid,
        renterName: user.displayName || user.email,
        bookedAt: serverTimestamp(),
        status: 'pending',
        paymentMethod,
        paid: false,
      });
      setBookedProviderIds(prev => [...prev, provider.id]);
      setFeedback({ type: 'success', message: 'Booking Requested. Your booking request has been sent to the provider.' });
      setTimeout(() => setFeedback(null), 3000);
      fetchMyBookings();
    } catch (error) {
      setFeedback({ type: 'error', message: 'Failed to book service. Please try again.' });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleDeleteListing = async (provider: ServiceProvider) => {
    try {
      Alert.alert('Delete Listing', 'Are you sure you want to delete this listing?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteDoc(doc(db, 'services', provider.id));
          fetchMyListings();
          fetchServices();
          setFeedback({ type: 'success', message: 'Listing deleted successfully.' });
          setTimeout(() => setFeedback(null), 3000);
        }}
      ]);
    } catch (error) {
      setFeedback({ type: 'error', message: 'Failed to delete listing.' });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleCancelBooking = async (booking: any) => {
    try {
      await updateDoc(doc(db, 'bookings', booking.id), { status: 'cancelled' });
      fetchMyBookings();
      setFeedback({ type: 'success', message: 'Your booking has been cancelled.' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (error) {
      setFeedback({ type: 'error', message: 'Failed to cancel booking.' });
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const renderServiceItem = (service: ServiceItem) => (
    <TouchableOpacity 
      key={service.id}
      onPress={() => handleServiceSelect(service)}
    >
      <View 
        style={[
          styles.serviceItem, 
          { 
            backgroundColor: cardBackground,
            borderColor: tintColor,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2,
            boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.1)',
          }
        ]}
      >
        <View style={[styles.serviceIconContainer, { backgroundColor: `${tintColor}20` }]}>
          <MaterialIcons name={service.icon} size={24} color={tintColor} />
        </View>
        <View style={styles.serviceInfo}>
          <Text style={[styles.serviceName, { color: textColor }]}>{service.name}</Text>
          <Text style={[styles.serviceDescription, { color: textColor, opacity: 0.7 }]}>
            {service.description}
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={textColor} />
      </View>
    </TouchableOpacity>
  );

  const renderProviderItem = (provider: ServiceProvider) => (
    <TouchableOpacity 
      key={provider.id}
      onPress={() => handleProviderSelect(provider)}
    >
      <View style={[styles.providerItem, { backgroundColor: cardBackground }]}>
        <View style={styles.providerImage}>
          <MaterialIcons name="store" size={40} color={tintColor} />
        </View>
        <View style={styles.providerInfo}>
          <Text style={[styles.providerName, { color: textColor }]}>{provider.name}</Text>
          <View style={styles.ratingContainer}>
            <MaterialIcons name="star" size={16} color="#FFD700" />
            <Text style={[styles.ratingText, { color: textColor }]}>{provider.rating}</Text>
          </View>
          <Text style={[styles.providerDetail, { color: textColor }]}>{provider.price}</Text>
          <Text style={[styles.providerLocation, { color: textColor, opacity: 0.7 }]}>
            <MaterialIcons name="location-on" size={14} color={tintColor} /> {provider.location}
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={textColor} />
      </View>
    </TouchableOpacity>
  );

  const renderProviderDetail = (provider: ServiceProvider) => {
    // Find if this provider is already booked by the user
    const isBooked = myBookings.some(b => b.providerId === provider.id && b.status !== 'cancelled');
    const reviews = providerReviews[provider.id] || [];
    const avgRating = providerAvgRatings[provider.id];
    const isOwnListing = !!user && provider.userId === user.uid;
    return (
      <View style={styles.providerDetailContainer}>
        <View style={styles.profileHeader}>
          <View style={[styles.profileImage, { backgroundColor: `${tintColor}20` }]}> 
            <MaterialIcons name="store" size={60} color={tintColor} />
          </View>
          <Text style={[styles.providerName, { color: textColor, fontSize: 22, marginTop: 10 }]}> {provider.name} </Text>
          <View style={styles.ratingContainer}>
            <MaterialIcons name="star" size={20} color="#FFD700" />
            <Text style={[styles.ratingText, { color: textColor, fontSize: 16 }]}> {avgRating ? avgRating.toFixed(1) : 'N/A'} ({reviews.length} reviews) </Text>
          </View>
        </View>

        <View style={styles.detailSection}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Service Details</Text>
          <View style={styles.detailRow}>
            <MaterialIcons name="attach-money" size={20} color={tintColor} />
            <Text style={[styles.detailText, { color: textColor }]}>
              <Text style={{ fontWeight: 'bold' }}>Price:</Text> {provider.price}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialIcons name="location-on" size={20} color={tintColor} />
            <Text style={[styles.detailText, { color: textColor }]}>
              <Text style={{ fontWeight: 'bold' }}>Location:</Text> {provider.location}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
            <Text style={[styles.detailText, { color: textColor }]}>
              {provider.available ? 'Available Now' : 'Currently Unavailable'}
            </Text>
          </View>
        </View>

        <View style={styles.contactSection}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Contact Information</Text>
          <TouchableOpacity style={[styles.contactButton, { backgroundColor: tintColor }]} onPress={() => Linking.openURL(`tel:${provider.contact}`)}>
            <MaterialIcons name="phone" size={20} color="white" />
            <Text style={styles.contactButtonText}>Call {provider.contact}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.contactButton, { backgroundColor: '#34B7F1', marginTop: 10 }]} onPress={() => {
            const message = `Hello, I'm interested in your ${selectedService?.name} service.`;
            const url = `https://wa.me/${provider.contact.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
            Linking.openURL(url);
          }}>
            <MaterialIcons name="chat" size={20} color="white" />
            <Text style={styles.contactButtonText}>Chat on WhatsApp</Text>
          </TouchableOpacity>
          {/* Payment Method Selection */}
          <View style={{ marginTop: 16 }}>
            <Text style={{ fontWeight: 'bold' }}>Select Payment Method:</Text>
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              {['cash', 'upi', 'netbanking'].map(method => (
                <TouchableOpacity
                  key={method}
                  style={[styles.paymentButton, paymentMethod === method && styles.paymentButtonActive]}
                  onPress={() => setPaymentMethod(method as any)}
                  disabled={isBooked || isOwnListing}
                >
                  <Text style={{ color: paymentMethod === method ? '#fff' : '#333' }}>{method.toUpperCase()}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {/* Book/Booked Button */}
          <TouchableOpacity 
            style={[styles.bookButton, { backgroundColor: isBooked || isOwnListing ? '#aaa' : tintColor }]} 
            onPress={() => !isBooked && !isOwnListing && setConfirmBooking(provider)}
            disabled={isBooked || isOwnListing}
          >
            <MaterialIcons name="event-available" size={20} color="white" />
            <Text style={styles.contactButtonText}>{isOwnListing ? 'Your Listing' : isBooked ? 'Booked' : 'Book'}</Text>
          </TouchableOpacity>
          {isOwnListing && (
            <Text style={{ color: '#D32F2F', marginTop: 8, fontWeight: 'bold', textAlign: 'center' }}>You cannot book your own listing.</Text>
          )}
          {/* Confirm Booking Modal */}
          {confirmBooking && confirmBooking.id === provider.id && (
            <Modal visible transparent animationType="fade">
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 24, width: 320, alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>Confirm Booking</Text>
                  <Text style={{ fontSize: 16, marginBottom: 24 }}>Are you sure you want to book this provider?</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                    <TouchableOpacity 
                      style={{ flex: 1, marginRight: 8, backgroundColor: '#eee', padding: 12, borderRadius: 8, alignItems: 'center' }}
                      onPress={() => setConfirmBooking(null)}
                    >
                      <Text style={{ color: '#333', fontWeight: 'bold' }}>No</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={{ flex: 1, marginLeft: 8, backgroundColor: tintColor, padding: 12, borderRadius: 8, alignItems: 'center' }}
                      onPress={async () => {
                        setConfirmBooking(null);
                        await handleBook(provider);
                      }}
                    >
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>Yes</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          )}
          <View style={{ marginTop: 16 }}>
            <Text style={{ fontWeight: 'bold' }}>Average Rating: {avgRating ? avgRating.toFixed(1) : 'N/A'}</Text>
            <ScrollView style={{ maxHeight: 80 }}>
              {reviews.map((r, idx) => (
                <View key={idx} style={{ marginTop: 4 }}>
                  <Text style={{ fontWeight: 'bold' }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</Text>
                  <Text>{r.comment}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </View>
    );
  };

  const renderContent = () => {
    if (selectedProvider) {
      return renderProviderDetail(selectedProvider);
    }
    
    if (selectedService) {
      return (
        <>
          <View style={styles.serviceHeader}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color={tintColor} />
              <Text style={[styles.backButtonText, { color: tintColor }]}>Back</Text>
            </TouchableOpacity>
            <Text style={[styles.sectionTitle, { color: textColor, marginLeft: 10 }]}>
              {selectedService.name}
            </Text>
          </View>
          <ScrollView style={styles.providersList}>
            {selectedService.providers.map(renderProviderItem)}
          </ScrollView>
        </>
      );
    }

    return (
      <ScrollView style={styles.servicesList}>
        {services.map(renderServiceItem)}
      </ScrollView>
    );
  };

  const getHeaderTitle = () => {
    if (selectedProvider) return selectedProvider.name;
    if (selectedService) return selectedService.name;
    return 'Farm Services & Rentals';
  };

  if (false) { /* never use modal for main content */ }
  // Always render as full page
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f6fa' }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ minHeight: Dimensions.get('window').height, flexGrow: 1 }}>
        <View style={{ padding: 0, flex: 1 }}>
          {/* Feedback Banner */}
          {feedback && (
            <View style={{
              backgroundColor: feedback.type === 'success' ? '#E8F5E9' : feedback.type === 'error' ? '#FFEBEE' : '#E3F2FD',
              borderColor: feedback.type === 'success' ? '#388E3C' : feedback.type === 'error' ? '#D32F2F' : '#1976D2',
              borderWidth: 1,
              padding: 12,
              margin: 16,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              zIndex: 100,
            }}>
              <Text style={{ color: feedback.type === 'success' ? '#388E3C' : feedback.type === 'error' ? '#D32F2F' : '#1976D2', fontWeight: 'bold', flex: 1 }}>{feedback.message}</Text>
              <TouchableOpacity onPress={() => setFeedback(null)} style={{ marginLeft: 12 }}>
                <MaterialIcons name="close" size={20} color="#888" />
              </TouchableOpacity>
            </View>
          )}
          {/* Header */}
          <View style={{ 
            paddingTop: 24, 
            paddingBottom: 16, 
            paddingHorizontal: 16,
            backgroundColor: '#fff', 
            borderBottomWidth: 1, 
            borderColor: '#eee', 
            elevation: 2,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              {/* Only show header back button if not on main tab */}
              {(selectedService || selectedProvider) ? (
                <TouchableOpacity 
                  onPress={handleBack} 
                  style={{ 
                    padding: 8, 
                    borderRadius: 8, 
                    backgroundColor: '#f0f0f0',
                    marginRight: 12
                  }}
                >
                  <MaterialIcons name="arrow-back" size={24} color="#388E3C" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  onPress={onClose} 
                  style={{ 
                    padding: 8, 
                    borderRadius: 8, 
                    backgroundColor: '#f0f0f0',
                    marginRight: 12
                  }}
                >
                  <MaterialIcons name="arrow-back" size={24} color="#388E3C" />
                </TouchableOpacity>
              )}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#388E3C', letterSpacing: 0.5 }}>Rent Tools & Services</Text>
                <Text style={{ color: '#666', marginTop: 4, fontSize: 14 }}>Find, book, or offer farm equipment and services</Text>
              </View>
              <View style={{ width: 40 }} />
            </View>
          </View>
          
          {/* Sticky Tab Bar */}
          <View style={{ 
            backgroundColor: '#fff', 
            borderBottomWidth: 1, 
            borderColor: '#eee',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
            boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
          }}> 
            <View style={[styles.tabBar, { paddingHorizontal: 16 }]}>
              <TouchableOpacity 
                style={[
                  styles.tab, 
                  tab === 'all' && styles.tabActive,
                  { paddingVertical: 16, paddingHorizontal: 12 }
                ]} 
                onPress={() => setTab('all')}
              >
                <Text style={[styles.tabText, tab === 'all' && { color: '#388E3C' }]}>All Services</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.tab, 
                  tab === 'listings' && styles.tabActive,
                  { paddingVertical: 16, paddingHorizontal: 12 }
                ]} 
                onPress={() => setTab('listings')}
              >
                <Text style={[styles.tabText, tab === 'listings' && { color: '#388E3C' }]}>My Listings</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.tab, 
                  tab === 'bookings' && styles.tabActive,
                  { paddingVertical: 16, paddingHorizontal: 12 }
                ]} 
                onPress={() => setTab('bookings')}
              >
                <Text style={[styles.tabText, tab === 'bookings' && { color: '#388E3C' }]}>My Bookings</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.tab, 
                  tab === 'providerBookings' && styles.tabActive,
                  { paddingVertical: 16, paddingHorizontal: 12 }
                ]} 
                onPress={() => setTab('providerBookings')}
              >
                <Text style={[styles.tabText, tab === 'providerBookings' && { color: '#388E3C' }]}>Provider Bookings</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Add Listing Button */}
          {!selectedService && !selectedProvider && (
            <View style={{ paddingHorizontal: 16, paddingVertical: 16 }}>
              <TouchableOpacity 
                style={{ 
                  backgroundColor: '#388E3C', 
                  borderColor: '#388E3C', 
                  flexDirection: 'row', 
                  justifyContent: 'center',
                  paddingVertical: 16,
                  borderRadius: 12,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                  boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
                }} 
                onPress={() => setShowAddForm(true)}
              >
                <MaterialIcons name="add-circle" size={24} color="#fff" />
                <Text style={{ color: '#fff', marginLeft: 8, fontWeight: 'bold', fontSize: 16 }}>Add Listing</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* AddServiceForm Modal */}
          {showAddForm && (
            <Modal visible={showAddForm} animationType="slide">
              <AddServiceForm 
                onClose={() => setShowAddForm(false)}
                onSuccess={() => { setShowAddForm(false); fetchServices(); fetchMyListings(); }}
              />
            </Modal>
          )}
          
          {/* Tab Content - use full height, no card */}
          <View style={{ flex: 1, paddingHorizontal: 16 }}>
            {tab === 'all' && renderContent()}
            {tab === 'listings' && (
              <ScrollView style={[styles.servicesList, { paddingTop: 8 }]}>
                {myListings.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                    <MaterialIcons name="inbox" size={64} color="#ccc" />
                    <Text style={{ color: '#666', marginTop: 16, fontSize: 16 }}>No listings yet.</Text>
                    <Text style={{ color: '#999', marginTop: 8, fontSize: 14 }}>Add your first listing to get started</Text>
                  </View>
                ) : myListings.map(service => (
                  <View key={service.id} style={{ marginBottom: 24 }}>
                    <View style={[styles.serviceHeader, { marginBottom: 12 }]}>
                      <Text style={[styles.sectionTitle, { fontSize: 20, color: '#333' }]}>{service.name}</Text>
                    </View>
                    {service.providers.map(provider => (
                      <View key={provider.id} style={[styles.providerItem, { marginBottom: 12, borderRadius: 12 }]}>
                        <View style={styles.providerInfo}>
                          <Text style={[styles.providerName, { fontSize: 18 }]}>{provider.name}</Text>
                          <Text style={[styles.providerDetail, { fontSize: 16, color: '#388E3C', fontWeight: '600' }]}>{provider.price}</Text>
                          <Text style={[styles.providerLocation, { fontSize: 14 }]}>
                            <MaterialIcons name="location-on" size={16} color="#666" /> {provider.location}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <TouchableOpacity 
                            style={[styles.editButton, { padding: 12, marginRight: 8 }]} 
                            onPress={() => setEditListing({ ...provider, type: service.name })}
                          >
                            <MaterialIcons name="edit" size={20} color={colors.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[styles.deleteButton, { padding: 12 }]} 
                            onPress={() => handleDeleteListing(provider)}
                          >
                            <MaterialIcons name="delete" size={20} color="#D32F2F" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                ))}
                {/* Edit Listing Modal */}
                {editListing && (
                  <Modal visible={!!editListing} animationType="slide">
                    <AddServiceForm
                      onClose={() => setEditListing(null)}
                      onSuccess={() => { setEditListing(null); fetchMyListings(); fetchServices(); }}
                      initialData={editListing}
                      isEdit
                    />
                  </Modal>
                )}
              </ScrollView>
            )}
            {tab === 'bookings' && (
              <ScrollView style={[styles.servicesList, { paddingTop: 8 }]}>
                {myBookings.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                    <MaterialIcons name="event-busy" size={64} color="#ccc" />
                    <Text style={{ color: '#666', marginTop: 16, fontSize: 16 }}>No bookings yet.</Text>
                    <Text style={{ color: '#999', marginTop: 8, fontSize: 14 }}>Your bookings will appear here</Text>
                  </View>
                ) : myBookings.map(b => (
                  <View key={b.id} style={[styles.bookingCard, { marginBottom: 16, borderRadius: 12 }]}>
                    <Text style={[styles.bookingTitle, { fontSize: 18, marginBottom: 8 }]}>Service: {b.providerName}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <View style={{ 
                        paddingHorizontal: 8, 
                        paddingVertical: 4, 
                        borderRadius: 12, 
                        backgroundColor: b.status === 'completed' ? '#E8F5E9' : b.status === 'confirmed' ? '#E3F2FD' : '#FFF3E0'
                      }}>
                        <Text style={{ 
                          color: b.status === 'completed' ? '#388E3C' : b.status === 'confirmed' ? '#1976D2' : '#F57C00',
                          fontSize: 12,
                          fontWeight: '600'
                        }}>{b.status.toUpperCase()}</Text>
                      </View>
                    </View>
                    <Text style={{ color: '#666', marginBottom: 4 }}>Payment: {b.paymentMethod?.toUpperCase() || 'N/A'} ({b.paid ? 'Paid' : 'Unpaid'})</Text>
                    <Text style={{ color: '#666', marginBottom: 12 }}>Booked At: {b.bookedAt?.toDate?.().toLocaleString?.() || ''}</Text>
                    {(b.status === 'pending' || b.status === 'confirmed') && (
                      <TouchableOpacity 
                        style={[styles.cancelButton, { paddingVertical: 12, borderRadius: 8 }]} 
                        onPress={() => handleCancelBooking(b)}
                      >
                        <Text style={{ color: '#D32F2F', fontWeight: 'bold' }}>Cancel</Text>
                      </TouchableOpacity>
                    )}
                    {b.status === 'completed' && !b.paid && (
                      <TouchableOpacity 
                        style={[styles.completeButton, { paddingVertical: 12, borderRadius: 8 }]} 
                        onPress={async () => {
                          await updateDoc(doc(db, 'bookings', b.id), { paid: true });
                          fetchMyBookings();
                        }}
                      >
                        <Text style={{ color: '#1976D2', fontWeight: 'bold' }}>Mark as Paid</Text>
                      </TouchableOpacity>
                    )}
                    {b.status === 'completed' && (
                      <TouchableOpacity 
                        style={[styles.reviewButton, { paddingVertical: 12, borderRadius: 8 }]} 
                        onPress={() => setReviewModal({ booking: b, visible: true })}
                      >
                        <Text style={{ color: '#1976D2', fontWeight: 'bold' }}>Leave a Review</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                {/* Review Modal */}
                {reviewModal && (
                  <Modal visible={reviewModal.visible} animationType="slide" transparent>
                    <View style={styles.reviewModalContainer}>
                      <View style={styles.reviewModalContent}>
                        <Text style={styles.sectionTitle}>Rate & Review</Text>
                        <View style={styles.ratingRow}>
                          {[1,2,3,4,5].map(star => (
                            <TouchableOpacity key={star} onPress={() => setReviewRating(star)}>
                              <MaterialIcons name={star <= reviewRating ? 'star' : 'star-border'} size={32} color="#FFD700" />
                            </TouchableOpacity>
                          ))}
                        </View>
                        <TextInput
                          style={styles.input}
                          placeholder="Write your feedback..."
                          value={reviewText}
                          onChangeText={setReviewText}
                          multiline
                        />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
                          <TouchableOpacity onPress={() => setReviewModal(null)} style={styles.cancelButton}>
                            <Text>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={handleSubmitReview} style={styles.completeButton}>
                            <Text style={{ color: '#1976D2', fontWeight: 'bold' }}>Submit</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </Modal>
                )}
              </ScrollView>
            )}
            {tab === 'providerBookings' && (
              <ScrollView style={[styles.servicesList, { paddingTop: 8 }]}>
                {providerBookings.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                    <MaterialIcons name="people" size={64} color="#ccc" />
                    <Text style={{ color: '#666', marginTop: 16, fontSize: 16 }}>No bookings yet.</Text>
                    <Text style={{ color: '#999', marginTop: 8, fontSize: 14 }}>Bookings from renters will appear here</Text>
                  </View>
                ) : providerBookings.map(b => (
                  <View key={b.id} style={[styles.bookingCard, { marginBottom: 16, borderRadius: 12 }]}>
                    <Text style={[styles.bookingTitle, { fontSize: 18, marginBottom: 8 }]}>Renter: {b.renterName}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <View style={{ 
                        paddingHorizontal: 8, 
                        paddingVertical: 4, 
                        borderRadius: 12, 
                        backgroundColor: b.status === 'completed' ? '#E8F5E9' : b.status === 'confirmed' ? '#E3F2FD' : '#FFF3E0'
                      }}>
                        <Text style={{ 
                          color: b.status === 'completed' ? '#388E3C' : b.status === 'confirmed' ? '#1976D2' : '#F57C00',
                          fontSize: 12,
                          fontWeight: '600'
                        }}>{b.status.toUpperCase()}</Text>
                      </View>
                    </View>
                    <Text style={{ color: '#666', marginBottom: 4 }}>Payment: {b.paymentMethod?.toUpperCase() || 'N/A'} ({b.paid ? 'Paid' : 'Unpaid'})</Text>
                    <Text style={{ color: '#666', marginBottom: 12 }}>Booked At: {b.bookedAt?.toDate?.().toLocaleString?.() || ''}</Text>
                    {b.status === 'pending' && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <TouchableOpacity 
                          style={[styles.acceptButton, { paddingVertical: 12, borderRadius: 8, flex: 1, marginRight: 8 }]} 
                          onPress={() => handleUpdateBookingStatus(b, 'confirmed')}
                        >
                          <Text style={{ color: '#388E3C', fontWeight: 'bold' }}>Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={[styles.rejectButton, { paddingVertical: 12, borderRadius: 8, flex: 1, marginLeft: 8 }]} 
                          onPress={() => handleUpdateBookingStatus(b, 'rejected')}
                        >
                          <Text style={{ color: '#D32F2F', fontWeight: 'bold' }}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    {b.status === 'confirmed' && (
                      <TouchableOpacity 
                        style={[styles.completeButton, { paddingVertical: 12, borderRadius: 8 }]} 
                        onPress={() => handleUpdateBookingStatus(b, 'completed')}
                      >
                        <Text style={{ color: '#1976D2', fontWeight: 'bold' }}>Mark as Completed</Text>
                      </TouchableOpacity>
                    )}
                    {b.status === 'completed' && !b.paid && (
                      <TouchableOpacity 
                        style={[styles.completeButton, { paddingVertical: 12, borderRadius: 8 }]} 
                        onPress={async () => {
                          await updateDoc(doc(db, 'bookings', b.id), { paid: true });
                          fetchProviderBookings();
                        }}
                      >
                        <Text style={{ color: '#388E3C', fontWeight: 'bold' }}>Mark as Paid</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
    width: '100%',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
    boxShadow: '0px -3px 5px rgba(0, 0, 0, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  closeButton: {
    padding: 5,
    marginLeft: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  },
  backButtonText: {
    marginLeft: 5,
    fontWeight: '600',
  },
  servicesList: {
    marginBottom: 20,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  serviceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: colors.text,
  },
  serviceDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  // Provider List Styles
  providersList: {
    marginBottom: 20,
  },
  providerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  providerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    backgroundColor: 'rgb(255, 255, 255)',
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  providerDetail: {
    fontSize: 14,
    marginBottom: 2,
  },
  providerLocation: {
    fontSize: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
  },
  // Provider Detail Styles
  providerDetailContainer: {
    paddingBottom: 20,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    marginBottom: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailSection: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    marginLeft: 10,
    fontSize: 15,
  },
  contactSection: {
    marginTop: 10,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  contactButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 10,
  },
  // Footer & Buttons
  footer: {
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  requestButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  requestButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderColor: colors.primary,
  },
  tabText: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  bookingCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bookingTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  editButton: {
    marginRight: 10,
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#E3F2FD',
  },
  deleteButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#FFEBEE',
  },
  cancelButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginRight: 5,
  },
  rejectButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginLeft: 5,
  },
  completeButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    alignItems: 'center',
  },
  reviewButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    alignItems: 'center',
  },
  reviewModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  reviewModalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    alignItems: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    marginVertical: 12,
  },
  input: {
    width: '100%',
    height: 100,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
  },
  paymentButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  paymentButtonActive: {
    backgroundColor: '#388E3C',
  },
});