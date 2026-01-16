import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../constants/newDesignSystem';
import { StyledButton, StyledInput, Heading2, BodyText } from './StyledComponents';
import equipmentService, { Equipment } from '../services/equipmentService';
import { getAuth } from 'firebase/auth';

interface AddEquipmentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (equipment: Equipment) => void;
}

const CATEGORIES = ['Tractor', 'Harvester', 'Sprayer', 'Weeder', 'Seeder', 'Planting', 'Tilling', 'Processing', 'Other'];
const STATES = ['Punjab', 'Haryana', 'Himachal Pradesh', 'Uttarakhand', 'Uttar Pradesh', 'Madhya Pradesh', 'Rajasthan', 'Gujarat', 'Maharashtra', 'Karnataka', 'Andhra Pradesh', 'Telangana', 'Tamil Nadu', 'Odisha', 'West Bengal'];

export default function AddEquipmentModal({ visible, onClose, onSuccess }: AddEquipmentModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Tractor',
    dailyRate: '',
    location: '',
    city: '',
    state: 'Punjab',
    phone: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      // Validation
      if (!formData.name.trim()) {
        Alert.alert('Error', 'Please enter equipment name');
        return;
      }
      if (!formData.dailyRate || isNaN(Number(formData.dailyRate))) {
        Alert.alert('Error', 'Please enter a valid daily rate');
        return;
      }
      if (!formData.phone.trim()) {
        Alert.alert('Error', 'Please enter your phone number');
        return;
      }
      if (!formData.city.trim()) {
        Alert.alert('Error', 'Please enter your city');
        return;
      }

      setLoading(true);

      const auth = getAuth();
      if (!auth.currentUser) {
        Alert.alert('Error', 'Please login to add equipment');
        return;
      }

      // Create equipment object
      const newEquipment: Omit<Equipment, 'id'> = {
        userId: auth.currentUser.uid,
        name: formData.name,
        description: formData.description || `${formData.name} available for rent`,
        category: formData.category,
        dailyRate: Number(formData.dailyRate),
        location: formData.location || formData.city,
        city: formData.city,
        state: formData.state,
        phone: formData.phone,
        imageUrl: 'https://via.placeholder.com/200?text=' + encodeURIComponent(formData.name),
        status: 'Available',
        rating: 0,
        totalBookings: 0,
        specifications: {
          condition: 'Good',
          yearMake: String(new Date().getFullYear()),
        },
        createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any,
        updatedAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as any,
      };

      // Add to Firebase
      const docId = await equipmentService.addEquipment(newEquipment as Equipment);

      // Reset form
      setFormData({
        name: '',
        description: '',
        category: 'Tractor',
        dailyRate: '',
        location: '',
        city: '',
        state: 'Punjab',
        phone: '',
      });

      Alert.alert('Success', 'Equipment listing created!');
      onClose();
      
      // Call onSuccess with the new equipment
      onSuccess({
        ...newEquipment,
        id: docId,
      } as Equipment);
    } catch (error) {
      console.error('Error adding equipment:', error);
      Alert.alert('Error', 'Failed to add equipment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} disabled={loading}>
            <MaterialIcons name="close" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Heading2 style={{ color: Colors.text.primary }}>List Equipment</Heading2>
          <View style={{ width: 24 }} />
        </View>

        {/* Form */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Equipment Name */}
          <View style={styles.formGroup}>
            <BodyText style={styles.label}>Equipment Name *</BodyText>
            <TextInput
              style={styles.input}
              placeholder="e.g., Mahindra 475 Tractor"
              placeholderTextColor={Colors.text.tertiary}
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              editable={!loading}
            />
          </View>

          {/* Description */}
          <View style={styles.formGroup}>
            <BodyText style={styles.label}>Description</BodyText>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your equipment condition, features, etc."
              placeholderTextColor={Colors.text.tertiary}
              value={formData.description}
              onChangeText={(text) => setFormData({ ...formData, description: text })}
              multiline
              numberOfLines={3}
              editable={!loading}
            />
          </View>

          {/* Category */}
          <View style={styles.formGroup}>
            <BodyText style={styles.label}>Category *</BodyText>
            <View style={styles.pickerContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -12 }}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryTag,
                      formData.category === cat && styles.categoryTagActive,
                    ]}
                    onPress={() => setFormData({ ...formData, category: cat })}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.categoryTagText,
                        formData.category === cat && styles.categoryTagTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Daily Rate */}
          <View style={styles.formGroup}>
            <BodyText style={styles.label}>Daily Rate (₹) *</BodyText>
            <TextInput
              style={styles.input}
              placeholder="e.g., 1500"
              placeholderTextColor={Colors.text.tertiary}
              keyboardType="number-pad"
              value={formData.dailyRate}
              onChangeText={(text) => setFormData({ ...formData, dailyRate: text })}
              editable={!loading}
            />
          </View>

          {/* Location */}
          <View style={styles.formGroup}>
            <BodyText style={styles.label}>Location / Address</BodyText>
            <TextInput
              style={styles.input}
              placeholder="e.g., Sector 14, Chandigarh"
              placeholderTextColor={Colors.text.tertiary}
              value={formData.location}
              onChangeText={(text) => setFormData({ ...formData, location: text })}
              editable={!loading}
            />
          </View>

          {/* City */}
          <View style={styles.formGroup}>
            <BodyText style={styles.label}>City *</BodyText>
            <TextInput
              style={styles.input}
              placeholder="e.g., Chandigarh"
              placeholderTextColor={Colors.text.tertiary}
              value={formData.city}
              onChangeText={(text) => setFormData({ ...formData, city: text })}
              editable={!loading}
            />
          </View>

          {/* State */}
          <View style={styles.formGroup}>
            <BodyText style={styles.label}>State *</BodyText>
            <View style={styles.pickerContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -12 }}>
                {STATES.map((state) => (
                  <TouchableOpacity
                    key={state}
                    style={[
                      styles.stateTag,
                      formData.state === state && styles.stateTagActive,
                    ]}
                    onPress={() => setFormData({ ...formData, state })}
                    disabled={loading}
                  >
                    <Text
                      style={[
                        styles.stateTagText,
                        formData.state === state && styles.stateTagTextActive,
                      ]}
                    >
                      {state}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Phone */}
          <View style={styles.formGroup}>
            <BodyText style={styles.label}>Contact Phone *</BodyText>
            <TextInput
              style={styles.input}
              placeholder="e.g., 9876543210"
              placeholderTextColor={Colors.text.tertiary}
              keyboardType="phone-pad"
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              editable={!loading}
            />
          </View>

          {/* Submit Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.submitBtn, loading && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="check-circle" size={20} color="#fff" />
                  <Text style={styles.submitBtnText}>Publish Listing</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.light,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    color: Colors.text.primary,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.default,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text.primary,
    backgroundColor: Colors.background.light,
  },
  textArea: {
    textAlignVertical: 'top',
    minHeight: 80,
  },
  pickerContainer: {
    marginHorizontal: 12,
  },
  categoryTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
    backgroundColor: Colors.background.light,
  },
  categoryTagActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  categoryTagTextActive: {
    color: '#fff',
  },
  stateTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 6,
    backgroundColor: Colors.background.light,
  },
  stateTagActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  stateTagText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.text.secondary,
  },
  stateTagTextActive: {
    color: '#fff',
  },
  buttonContainer: {
    paddingVertical: 20,
  },
  submitBtn: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
