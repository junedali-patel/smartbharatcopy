import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, ScrollView, Alert, Image, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { db, auth } from '../services/firebaseConfig';
import { collection, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { MaterialIcons } from '@expo/vector-icons';
import FirestoreImageService from '../services/firestoreImageService';

const SERVICE_TYPES = [
  'Tractor', 'Harvester', 'Irrigation Pump', 'Plough', 'Seed Drill', 'Sprayer', 'Cultivator', 'Rotavator', 'Trailer', 'Other Equipment'
];

interface AddServiceFormProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
  isEdit?: boolean;
}

const AddServiceForm = ({ onClose, onSuccess, initialData = null, isEdit = false }: AddServiceFormProps) => {
  const [service, setService] = useState<any>(initialData ? { ...initialData, images: initialData.images || [] } : {
    type: SERVICE_TYPES[0],
    title: '',
    description: '',
    dailyRate: '',
    location: '',
    contact: '',
    available: true,
    images: [] as string[],
  });
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission required', 'Allow access to photos.');

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.3,  // ULTRA aggressive: 30% quality
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      if (asset.base64) {
        // Check base64 size BEFORE adding
        const sizeInMB = (asset.base64.length * 0.75) / (1024 * 1024);
        console.log(`Picked image size: ${sizeInMB.toFixed(2)}MB`);
        
        if (sizeInMB > 0.8) {
          // Image still too large even with picker compression - will need server compression
          Alert.alert('Large Image', `Image is ${sizeInMB.toFixed(2)}MB. Will be further compressed on upload.`);
        }
        
        setService((prev: any) => ({
          ...prev,
          images: [...prev.images, asset.base64],
        }));
      }
    }
  };

  const uploadImagesToFirestore = async (): Promise<string[]> => {
    const imageIds: string[] = [];
    const imageService = FirestoreImageService.getInstance();
    
    for (let i = 0; i < service.images.length; i++) {
      const image = service.images[i];
      
      // Skip if it's already an image ID (UUID, no comma, not base64)
      if (!image.includes(',') && image.length < 100 && !image.startsWith('data:')) {
        console.log(`Image ${i + 1} is already an ID, skipping upload:`, image);
        imageIds.push(image);
        continue;
      }
      
      try {
        console.log(`Uploading image ${i + 1}/${service.images.length}, size: ${(image.length * 0.75 / 1024 / 1024).toFixed(2)}MB`);
        const imageId = await imageService.uploadImage(image, 'image/jpeg', 'service');
        imageIds.push(imageId);
        console.log(`Image ${i + 1} uploaded successfully: ${imageId}`);
      } catch (error: any) {
        console.error(`Failed to upload image ${i + 1}:`, error.message);
        Alert.alert('Upload Error', `Failed to upload image ${i + 1}: ${error.message}`);
        throw error;
      }
    }
    return imageIds;
  };

  const handleSubmit = async () => {
    if (!service.title.trim() || !service.description.trim() || !service.dailyRate.trim() || !service.location.trim()) {
      return Alert.alert('Error', 'Please fill all required fields.');
    }
    if (service.images.length === 0) return Alert.alert('Error', 'Add at least one image.');

    setUploading(true);
    try {
      const imageIds = await uploadImagesToFirestore();
      const serviceData = {
        ...service,
        images: imageIds,
        userId: auth.currentUser?.uid,
        dailyRate: parseFloat(service.dailyRate),
        updatedAt: serverTimestamp(),
      };

      if (isEdit && initialData?.id) {
        await updateDoc(doc(db, 'services', initialData.id), serviceData);
        Alert.alert('Success', 'Listing updated successfully!');
      } else {
        await addDoc(collection(db, 'services'), {
          ...serviceData,
          createdAt: serverTimestamp(),
          rating: 0,
          reviews: 0,
        });
        Alert.alert('Success', 'Service listed successfully!');
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to save service. Try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...service.images];
    newImages.splice(index, 1);
    setService((prev: any) => ({ ...prev, images: newImages }));
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>Equipment Details</Text>

      <Text style={styles.label}>Equipment Type *</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={service.type} onValueChange={(value) => setService({ ...service, type: value })}>
          {SERVICE_TYPES.map((type) => <Picker.Item key={type} label={type} value={type} />)}
        </Picker>
      </View>

      <Text style={styles.label}>Title *</Text>
      <TextInput style={styles.input} placeholder="e.g., John's Tractor Rental" value={service.title} onChangeText={(text) => setService({ ...service, title: text })} />

      <Text style={styles.label}>Description *</Text>
      <TextInput style={[styles.input, styles.textArea]} placeholder="Describe equipment" value={service.description} onChangeText={(text) => setService({ ...service, description: text })} multiline numberOfLines={4} />

      <Text style={styles.label}>Daily Rate (₹) *</Text>
      <TextInput style={styles.input} placeholder="e.g., 1500" value={service.dailyRate} onChangeText={(text) => setService({ ...service, dailyRate: text })} keyboardType="numeric" />

      <Text style={styles.label}>Location *</Text>
      <TextInput style={styles.input} placeholder="City/Village" value={service.location} onChangeText={(text) => setService({ ...service, location: text })} />

      <Text style={styles.label}>Contact Number *</Text>
      <TextInput style={styles.input} placeholder="9876543210" value={service.contact} onChangeText={(text) => setService({ ...service, contact: text })} keyboardType="phone-pad" />

      <Text style={styles.sectionTitle}>Add Photos *</Text>
      <Text style={styles.note}>Add at least one photo of your equipment</Text>

      <ScrollView horizontal style={styles.imageContainer}>
        {service.images.map((uri: string, index: number) => (
          <View key={index} style={styles.imageWrapper}>
            <Image source={{ uri }} style={styles.image} />
            <TouchableOpacity style={styles.removeImageButton} onPress={() => removeImage(index)}>
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
        <Button title="Cancel" onPress={onClose} color="#999" disabled={uploading} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          {uploading ? (
            <View style={{ paddingVertical: 12, alignItems: 'center' }}>
              <ActivityIndicator color="#2E7D32" size="small" />
            </View>
          ) : (
            <Button title={isEdit ? "Update Listing" : "Publish Listing"} onPress={handleSubmit} color="#2E7D32" />
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 8, color: '#333' },
  label: { fontSize: 14, color: '#555', marginBottom: 4, marginTop: 8 },
  note: { fontSize: 12, color: '#666', marginBottom: 8, fontStyle: 'italic' },
  pickerContainer: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, marginBottom: 12, overflow: 'hidden' },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 12, marginBottom: 12, borderRadius: 6, fontSize: 16 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  imageContainer: { flexDirection: 'row', marginBottom: 16 },
  imageWrapper: { position: 'relative', marginRight: 12 },
  image: { width: 120, height: 120, borderRadius: 8, backgroundColor: '#f5f5f5' },
  removeImageButton: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  addImageButton: { width: 120, height: 120, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9f9f9' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, marginBottom: 30 },
});

export default AddServiceForm;
