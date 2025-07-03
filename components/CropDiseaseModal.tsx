import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

interface CropDiseaseModalProps {
  visible: boolean;
  onClose: () => void;
}

// Mock function to simulate ML model prediction
const simulatePrediction = async (imageUri: string) => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        disease: 'Tomato - Late Blight',
        confidence: 0.92,
      });
    }, 2000);
  });
};

// Mock function to simulate Gemini report generation
const generateGeminiReport = async (disease: string) => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({
        precaution: 'Remove and destroy infected plants. Avoid overhead watering, especially late in the day. Ensure good air circulation around plants.',
        fertilizer: 'Apply a balanced fertilizer with lower nitrogen and higher potassium and phosphorus. Cal-Mag supplement can also be beneficial.',
        care: 'Monitor plants regularly for signs of disease. Use copper-based fungicides as a preventive measure before the disease appears.',
      });
    }, 2000);
  });
};

export default function CropDiseaseModal({ visible, onClose }: CropDiseaseModalProps) {
  const [image, setImage] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleImagePicker = async (useCamera: boolean) => {
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
  };

  const handlePrediction = async (imageUri: string) => {
    setIsLoading(true);
    const predResult: any = await simulatePrediction(imageUri);
    setPrediction(predResult);

    const reportResult = await generateGeminiReport(predResult.disease);
    setReport(reportResult);
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
                        <Text style={styles.sectionTitle}>Precaution</Text>
                        <Text style={styles.detailText}>{report.precaution}</Text>
                      </View>

                      <View style={styles.detailSection}>
                        <Text style={styles.sectionTitle}>Fertilizer Recommendation</Text>
                        <Text style={styles.detailText}>{report.fertilizer}</Text>
                      </View>

                      <View style={styles.detailSection}>
                        <Text style={styles.sectionTitle}>Care Instructions</Text>
                        <Text style={styles.detailText}>{report.care}</Text>
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
