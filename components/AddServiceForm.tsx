// components/AddServiceForm.tsx
import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, ScrollView, Alert, Image, TouchableOpacity, Text } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { MaterialIcons } from '@expo/vector-icons';

const SERVICE_TYPES = [
  'Tractor',
  'Harvester',
  'Irrigation Pump',
  'Plough',
  'Seed Drill',
  'Sprayer',
  'Cultivator',
  'Rotavator',
  'Trailer',
  'Other Equipment'
];

const AddServiceForm = ({ onClose, onSuccess }) => {
  const [service, setService] = useState({
    type: SERVICE_TYPES[0],
    title: '',
    description: '',
    dailyRate: '',
    location: '',
    contact: '',
    available: true,
    images: []
  });
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photos to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) {
      setService(prev => ({
        ...prev,
        images: [...prev.images, result.uri]
      }));
    }
  };

  const uploadImage = async (uri) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const filename = uri.substring(uri.lastIndexOf('/') + 1);
    const storageRef = ref(storage, `services/${Date.now()}_${filename}`);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  };

  const handleSubmit = async () => {
    if (!service.title || !service.description || !service.dailyRate || !service.location) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (service.images.length === 0) {
      Alert.alert('Error', 'Please add at least one image');
      return;
    }

    setUploading(true);
    try {
      // Upload images first
      const imageUrls = await Promise.all(
        service.images.map(uri => uploadImage(uri))
      );

      // Save service data to Firestore
      const serviceData = {
        ...service,
        userId: auth.currentUser?.uid,
        images: imageUrls,
        dailyRate: parseFloat(service.dailyRate),
        createdAt: serverTimestamp(),
        rating: 0,
        reviews: 0
      };

      await addDoc(collection(db, 'services'), serviceData);
      Alert.alert('Success', 'Service listed successfully!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error adding service:', error);
      Alert.alert('Error', 'Failed to list service. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    const newImages = [...service.images];
    newImages.splice(index, 1);
    setService(prev => ({ ...prev, images: newImages }));
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>Equipment Details</Text>
      
      <Text style={styles.label}>Equipment Type *</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={service.type}
          onValueChange={(value) => setService({...service, type: value})}>
          {SERVICE_TYPES.map((type) => (
            <Picker.Item key={type} label={type} value={type} />
          ))}
        </Picker>
      </View>
      
      <Text style={styles.label}>Title *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., John's Tractor Rental"
        value={service.title}
        onChangeText={(text) => setService({...service, title: text})}
      />
      
      <Text style={styles.label}>Description *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Describe your equipment, its condition, features, etc."
        value={service.description}
        onChangeText={(text) => setService({...service, description: text})}
        multiline
        numberOfLines={4}
      />
      
      <Text style={styles.label}>Daily Rate (₹) *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., 1500"
        value={service.dailyRate}
        onChangeText={(text) => setService({...service, dailyRate: text})}
        keyboardType="numeric"
      />
      
      <Text style={styles.label}>Location (City/Village) *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., Pune, Maharashtra"
        value={service.location}
        onChangeText={(text) => setService({...service, location: text})}
      />
      
      <Text style={styles.label}>Contact Number *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g., 9876543210"
        value={service.contact}
        onChangeText={(text) => setService({...service, contact: text})}
        keyboardType="phone-pad"
      />
      
      <Text style={styles.sectionTitle}>Add Photos *</Text>
      <Text style={styles.note}>Add at least one photo of your equipment</Text>
      
      <ScrollView horizontal style={styles.imageContainer}>
        {service.images.map((uri, index) => (
          <View key={index} style={styles.imageWrapper}>
            <Image source={{ uri }} style={styles.image} />
            <TouchableOpacity 
              style={styles.removeImageButton}
              onPress={() => removeImage(index)}
            >
              <MaterialIcons name="close" size={16} color="white" />
            </TouchableOpacity>
          </View>
        ))}
        {service.images.length < 5 && (
          <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
            <MaterialIcons name="add-a-photo" size={32} color="#666" />
          </TouchableOpacity>
        )}
      </ScrollView>
      
      <View style={styles.buttonContainer}>
        <Button 
          title="Cancel" 
          onPress={onClose} 
          color="#999" 
          disabled={uploading}
        />
        <Button 
          title={uploading ? "Publishing..." : "Publish Listing"} 
          onPress={handleSubmit} 
          disabled={uploading}
          color="#2E7D32"
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
  },
  label: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
    marginTop: 8,
  },
  note: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    marginBottom: 12,
    overflow: 'hidden',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    marginBottom: 12,
    borderRadius: 6,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  imageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageButton: {
    width: 120,
    height: 120,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 30,
  },
});

export default AddServiceForm;