import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Colors, BorderRadius } from '../constants/newDesignSystem';
import { Heading1, Heading2, BodyText } from './StyledComponents';
import { Equipment } from '../services/equipmentService';
import bookingService from '../services/bookingService';
import userService from '../services/userService';
import { getAuth, functions as getFunctions } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';

interface OwnerDetails {
  name: string;
  phone: string;
  rating: number;
}

interface BookingModalProps {
  visible: boolean;
  equipment: Equipment | null;
  ownerDetails: OwnerDetails | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BookingModal({
  visible,
  equipment,
  ownerDetails,
  onClose,
  onSuccess,
}: BookingModalProps) {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [renterName, setRenterName] = useState<string>('User');
  const auth = getAuth();
  const currentUser = auth?.currentUser;

  useEffect(() => {
    if (visible && currentUser) {
      // Fetch user profile to get display name
      const fetchUserProfile = async () => {
        try {
          const userService = require('../services/userService').default;
          const profile = await userService.getInstance().getUserProfile();
          if (profile?.displayName) {
            setRenterName(profile.displayName);
          } else if (currentUser.displayName) {
            setRenterName(currentUser.displayName);
          } else {
            setRenterName(currentUser.email?.split('@')[0] || 'User');
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setRenterName(currentUser.displayName || currentUser.email?.split('@')[0] || 'User');
        }
      };
      fetchUserProfile();
    }
  }, [visible, currentUser]);

  const handleDateSelect = (date: Date, isStart: boolean) => {
    if (isStart) {
      setStartDate(date);
      if (endDate && date >= endDate) {
        setEndDate(null);
      }
    } else {
      if (startDate && date <= startDate) {
        Alert.alert('Invalid Date', 'End date must be after start date');
        return;
      }
      setEndDate(date);
    }
  };

  const calculateTotal = () => {
    if (!startDate || !endDate || !equipment) return 0;
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    return days * equipment.dailyRate;
  };

  const handleCallOwner = () => {
    if (ownerDetails?.phone) {
      Linking.openURL(`tel:${ownerDetails.phone}`);
    } else {
      Alert.alert('Contact', 'Phone number not available');
    }
  };

  const handleBooking = async () => {
    if (!startDate || !endDate || !equipment || !currentUser || !ownerDetails) {
      Alert.alert('Invalid Booking', 'Please select both start and end dates');
      return;
    }

    setLoading(true);
    try {
      const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const totalAmount = days * equipment.dailyRate;

      const booking = await bookingService.createBooking({
        equipmentId: equipment.id,
        equipmentName: equipment.name,
        ownerId: equipment.userId,
        ownerName: ownerDetails.name,
        ownerPhone: ownerDetails.phone,
        renterName: renterName,
        renterPhone: currentUser.phoneNumber || 'Not provided',
        startDate,
        endDate,
        totalAmount,
      });

      // Send notification to owner
      try {
        const functionsInstance = getFunctions();
        if (functionsInstance) {
          const sendBookingNotification = httpsCallable(functionsInstance, 'sendBookingNotification');
          await sendBookingNotification({
            ownerId: equipment.userId,
            renterName: renterName,
            equipmentName: equipment.name,
            bookingId: booking.id,
          });
          console.log('Notification sent to owner');
        }
      } catch (notificationError) {
        console.warn('Failed to send notification:', notificationError);
        // Don't fail the booking even if notification fails
      }

      Alert.alert('Success', 'Booking request sent! The owner will review it soon.');
      onSuccess();
      onClose();
      setStartDate(null);
      setEndDate(null);
    } catch (error) {
      console.error('Booking error:', error);
      Alert.alert('Error', 'Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!equipment || !ownerDetails || !visible) return null;

  const days = startDate && endDate
    ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const total = calculateTotal();

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <BlurView intensity={90} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' }}>
        <View
          style={{
            backgroundColor: Colors.background.light,
            borderTopLeftRadius: BorderRadius.lg,
            borderTopRightRadius: BorderRadius.lg,
            maxHeight: '90%',
          }}
        >
          {/* Header */}
          <View style={styles.header}>
            <Heading2 style={{ color: Colors.text.primary }}>Book Equipment</Heading2>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={24} color={Colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Equipment Info */}
            <View style={styles.equipmentInfo}>
              <View style={styles.equipmentIcon}>
                <MaterialIcons name="agriculture" size={40} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Heading2 style={{ color: Colors.text.primary }}>{equipment.name}</Heading2>
                <BodyText style={{ color: Colors.text.secondary, marginTop: 4 }}>
                  ₹{equipment.dailyRate.toLocaleString()} per day
                </BodyText>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <MaterialIcons name="location-on" size={14} color={Colors.text.tertiary} />
                  <BodyText style={{ color: Colors.text.tertiary, fontSize: 12 }}>
                    {equipment.city}, {equipment.state}
                  </BodyText>
                </View>
              </View>
            </View>

            {/* Owner Details */}
            <View style={styles.section}>
              <BodyText style={{ fontWeight: '600', marginBottom: 12, color: Colors.text.primary }}>
                OWNER DETAILS
              </BodyText>
              <View style={styles.ownerCard}>
                <View style={styles.ownerIcon}>
                  <MaterialIcons name="person" size={32} color={Colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Heading2 style={{ color: Colors.text.primary }}>{ownerDetails.name}</Heading2>
                  {ownerDetails.rating > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4 }}>
                      <MaterialIcons name="star" size={14} color="#fbbf24" />
                      <Text style={{ color: Colors.text.primary, fontSize: 12, fontWeight: '600' }}>
                        {ownerDetails.rating.toFixed(1)} rating
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity style={styles.callBtn} onPress={handleCallOwner}>
                  <MaterialIcons name="call" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Date Selection */}
            <View style={styles.section}>
              <BodyText style={{ fontWeight: '600', marginBottom: 12, color: Colors.text.primary }}>
                SELECT DATES
              </BodyText>

              <View style={styles.dateInputContainer}>
                <TouchableOpacity
                  style={[styles.dateInput, startDate && styles.dateInputActive]}
                  onPress={() => {
                    const today = new Date();
                    handleDateSelect(today, true);
                  }}
                >
                  <MaterialIcons name="calendar-today" size={20} color={Colors.primary} />
                  <Text style={styles.dateText}>
                    {startDate ? startDate.toLocaleDateString() : 'Start Date'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.dateArrow}>
                  <MaterialIcons name="arrow-forward" size={18} color={Colors.text.tertiary} />
                </View>

                <TouchableOpacity
                  style={[styles.dateInput, endDate && styles.dateInputActive]}
                  onPress={() => {
                    if (startDate) {
                      const tomorrow = new Date();
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      handleDateSelect(tomorrow, false);
                    }
                  }}
                  disabled={!startDate}
                >
                  <MaterialIcons name="calendar-today" size={20} color={Colors.primary} />
                  <Text style={styles.dateText}>
                    {endDate ? endDate.toLocaleDateString() : 'End Date'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Booking Summary */}
            {startDate && endDate && (
              <View style={styles.section}>
                <BodyText style={{ fontWeight: '600', marginBottom: 12, color: Colors.text.primary }}>
                  BOOKING SUMMARY
                </BodyText>

                <View style={styles.summaryItem}>
                  <BodyText style={{ color: Colors.text.secondary }}>Daily Rate</BodyText>
                  <Text style={styles.summaryValue}>₹{equipment.dailyRate.toLocaleString()}</Text>
                </View>

                <View style={styles.summaryItem}>
                  <BodyText style={{ color: Colors.text.secondary }}>Number of Days</BodyText>
                  <Text style={styles.summaryValue}>{days}</Text>
                </View>

                <View style={[styles.summaryItem, styles.totalItem]}>
                  <BodyText style={{ fontWeight: '600', color: Colors.text.primary }}>Total Amount</BodyText>
                  <Text style={[styles.summaryValue, { color: Colors.primary, fontWeight: '700' }]}>
                    ₹{total.toLocaleString()}
                  </Text>
                </View>
              </View>
            )}

            {/* Terms */}
            <View style={styles.section}>
              <View style={styles.termItem}>
                <MaterialIcons name="check-circle" size={18} color="#22c55e" />
                <BodyText style={{ color: Colors.text.secondary, marginLeft: 8, flex: 1 }}>
                  Free cancellation up to 24 hours before booking
                </BodyText>
              </View>

              <View style={styles.termItem}>
                <MaterialIcons name="check-circle" size={18} color="#22c55e" />
                <BodyText style={{ color: Colors.text.secondary, marginLeft: 8, flex: 1 }}>
                  Insurance and damage waiver included
                </BodyText>
              </View>

              <View style={styles.termItem}>
                <MaterialIcons name="check-circle" size={18} color="#22c55e" />
                <BodyText style={{ color: Colors.text.secondary, marginLeft: 8, flex: 1 }}>
                  Free delivery and pickup within 10km
                </BodyText>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.bookingBtn,
                (!startDate || !endDate || loading) && styles.bookingBtnDisabled,
              ]}
              onPress={handleBooking}
              disabled={!startDate || !endDate || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="check-circle" size={18} color="#fff" />
                  <Text style={styles.bookingBtnText}>Confirm Booking</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    paddingHorizontal: 16,
  },
  equipmentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    backgroundColor: `${Colors.primary}10`,
    borderRadius: BorderRadius.default,
    paddingHorizontal: 12,
    marginVertical: 12,
  },
  equipmentIcon: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.default,
    backgroundColor: `${Colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: `${Colors.primary}10`,
    borderRadius: BorderRadius.default,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
  },
  ownerIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: `${Colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginVertical: 16,
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.default,
  },
  dateInputActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}10`,
  },
  dateText: {
    fontSize: 14,
    color: Colors.text.primary,
    fontWeight: '500',
  },
  dateArrow: {
    paddingVertical: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  totalItem: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  termItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.default,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text.primary,
  },
  bookingBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 12,
    borderRadius: BorderRadius.default,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookingBtnDisabled: {
    opacity: 0.5,
  },
  bookingBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
