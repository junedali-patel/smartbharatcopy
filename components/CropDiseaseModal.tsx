import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

interface CropDiseaseModalProps {
  visible: boolean;
  onClose: () => void;
}

// Real function to send image to TFLite model API
const predictDiseaseFromAPI = async (imageUri: string) => {
  const formData = new FormData();
  
  // Check if we're on web or mobile
  if (Platform.OS === 'web') {
    // For web, we need to get the actual File object
    // This assumes you have an input element with id="fileInput"
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput && fileInput.files && fileInput.files[0]) {
      formData.append('file', fileInput.files[0]);
    } else {
      throw new Error('No file selected for web platform');
    }
  } else {
    // For React Native (mobile/emulator)
    formData.append('file', {
      uri: imageUri,
      name: 'photo.jpg',
      type: 'image/jpeg',
    } as any);
  }

  const response = await fetch('https://plant-disease-api-587210488178.us-central1.run.app/predict', {
    method: 'POST',
    body: formData,
    // Do NOT set headers here! Let the environment set Content-Type
  });

  if (!response.ok) {
    throw new Error('Failed to get prediction from model API');
  }
  return await response.json(); // { label: 'Disease Name' }
};

// Real function to get info from Gemini AI
const getGeminiDiseaseInfo = async (diseaseLabel: string) => {
  // Use the provided API key directly (for demonstration, but should be secured in production)
  const apiKey = 'AIzaSyDY1gJQkBzMY02PPePwcFSO_9-uBKf0afs';
  const prompt = `Write a short summary about the plant disease "${diseaseLabel}", including its cause, solution, and links to more information.`;

  const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=' + apiKey, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ]
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', errorText);
    throw new Error('Failed to get info from Gemini AI: ' + errorText);
  }
  const data = await response.json();
  // Parse Gemini's response to extract the text
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No information found.';
  return { summary: text };
};

export default function CropDiseaseModal({ visible, onClose }: CropDiseaseModalProps) {
  const [image, setImage] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleImagePicker = async (useCamera: boolean) => {
    if (Platform.OS === 'web') {
      // For web, trigger the hidden file input
      const fileInput = document.getElementById('fileInput') as HTMLInputElement;
      if (fileInput) {
        fileInput.click();
      }
    } else {
      // For React Native (mobile/emulator)
      const { status } = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
        return;
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ quality: 1 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
        setPrediction(null);
        setReport(null);
        handlePrediction(result.assets[0].uri);
      }
    }
  };

  // Handle file selection for web
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setImage(imageUrl);
      setPrediction(null);
      setReport(null);
      handlePrediction(imageUrl);
    }
  };

  const handlePrediction = async (imageUri: string) => {
    setIsLoading(true);
    try {
      const predResult: any = await predictDiseaseFromAPI(imageUri);
      setPrediction({ disease: predResult.label, confidence: 1 }); // API does not return confidence

      const reportResult = await getGeminiDiseaseInfo(predResult.label);
      setReport(reportResult);
    } catch (error) {
      let message = 'Prediction failed.';
      if (typeof error === 'object' && error !== null && 'message' in error) {
        message = (error as any).message;
      }
      Alert.alert('Error', message);
    }
    setIsLoading(false);
  };

  const resetModal = () => {
    setImage(null);
    setPrediction(null);
    setReport(null);
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={resetModal}
    >
      {/* Hidden file input for web */}
      {Platform.OS === 'web' && (
        <input
          id="fileInput"
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
      )}
      
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Crop Disease Prediction</Text>
            <TouchableOpacity onPress={resetModal}>
              <FontAwesome name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView>
            {!image ? (
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerTitle}>Upload a photo of the crop</Text>
                <TouchableOpacity style={styles.pickerButton} onPress={() => handleImagePicker(false)}>
                  <FontAwesome name="photo" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Choose from Library</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.pickerButton} onPress={() => handleImagePicker(true)}>
                  <FontAwesome name="camera" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Take a Photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.resultContainer}>
                <Image source={{ uri: image }} style={styles.uploadedImage} />
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2E7D32" />
                    <Text style={styles.loadingText}>Analyzing Image...</Text>
                  </View>
                ) : (
                  prediction && report && (
                    <View>
                      <View style={styles.predictionBox}>
                        <Text style={styles.predictionText}>Prediction: <Text style={styles.predictionValue}>{prediction.disease}</Text></Text>
                        <Text style={styles.predictionText}>Confidence: <Text style={styles.predictionValue}>{(prediction.confidence * 100).toFixed(0)}%</Text></Text>
                      </View>

                      <View style={styles.detailSection}>
                        <Text style={styles.sectionTitle}>About the Disease</Text>
                        <Text style={styles.detailText}>{report.summary}</Text>
                      </View>
                    </View>
                  )
                )}
                 <TouchableOpacity style={styles.tryAnotherButton} onPress={() => setImage(null)}>
                  <Text style={styles.buttonText}>Try Another Image</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    height: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingBottom: 10,
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  pickerContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
    marginBottom: 20,
  },
  pickerButton: {
    flexDirection: 'row',
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
    width: '80%',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  resultContainer: {
    alignItems: 'center',
  },
  uploadedImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  predictionBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    width: '100%',
  },
  predictionText: {
    fontSize: 16,
    color: '#1B5E20',
  },
  predictionValue: {
    fontWeight: 'bold',
  },
  detailSection: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  tryAnotherButton: {
    backgroundColor: '#FFC107',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
});
