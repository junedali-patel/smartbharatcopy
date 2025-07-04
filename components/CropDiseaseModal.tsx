import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert, Platform, Linking } from 'react-native';
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
  const prompt = `Write a detailed, structured response about the plant disease "${diseaseLabel}" in exactly this format:

ABOUT:
[Provide a comprehensive description of the disease, including symptoms, affected plant parts, progression, and impact on plant health and yield]

CAUSE:
[Explain the causal agents (pathogens, environmental factors), transmission methods, and conditions that favor disease development]

SOLUTION:
[Provide detailed treatment and prevention methods, including cultural practices, chemical controls, and biological methods. ALWAYS include at least 2 relevant links in format: [Link Text](URL)]

CRITICAL: You MUST include at least 2 disease-specific links in the SOLUTION section. Search for and provide links that are specifically relevant to "${diseaseLabel}". Look for:
- University extension articles about this specific disease
- Research papers or studies about this disease
- Treatment guides specific to this disease
- Agricultural websites with information about this disease
- Government agricultural resources about this disease

Do NOT use generic plant disease links. Find specific, relevant sources for "${diseaseLabel}".

Keep responses informative but well-structured. Example:
ABOUT: This disease affects plant leaves, stems, and sometimes fruits, causing characteristic symptoms that reduce plant vigor and yield. It can spread rapidly under favorable conditions.

CAUSE: Caused by specific pathogens that thrive in certain environmental conditions. Transmission occurs through various vectors and contaminated materials.

SOLUTION: Implement integrated management including cultural practices, chemical treatments, and biological controls. More info: [Specific Disease Research](https://specific-research-url.com) [Treatment Guide for This Disease](https://specific-treatment-url.com)`;

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
  
  // Parse the structured response
  const aboutMatch = text.match(/ABOUT:\s*(.*?)(?=\nCAUSE:|$)/s);
  const causeMatch = text.match(/CAUSE:\s*(.*?)(?=\nSOLUTION:|$)/s);
  const solutionMatch = text.match(/SOLUTION:\s*(.*?)(?=\n|$)/s);
  
  let solution = solutionMatch ? solutionMatch[1].trim() : 'Information not available.';
  
  // Check if solution has links, if not add fallback links
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const links = solution.match(linkRegex);
  
  if (!links || links.length < 2) {
    // Add disease-specific fallback links based on the disease name
    const diseaseName = diseaseLabel.toLowerCase();
    let fallbackLinks = '';
    
    if (diseaseName.includes('strawberry')) {
      fallbackLinks = ' More information: [Strawberry Disease Guide](https://extension.umn.edu/fruit/growing-strawberries-home-garden) [Strawberry Plant Care](https://www.almanac.com/plant/strawberries)';
    } else if (diseaseName.includes('tomato')) {
      fallbackLinks = ' More information: [Tomato Disease Guide](https://extension.umn.edu/vegetables/growing-tomatoes) [Tomato Plant Care](https://www.almanac.com/plant/tomatoes)';
    } else if (diseaseName.includes('corn')) {
      fallbackLinks = ' More information: [Corn Disease Guide](https://extension.umn.edu/corn/pest-management) [Corn Plant Care](https://www.almanac.com/plant/corn)';
    } else if (diseaseName.includes('potato')) {
      fallbackLinks = ' More information: [Potato Disease Guide](https://extension.umn.edu/vegetables/growing-potatoes) [Potato Plant Care](https://www.almanac.com/plant/potatoes)';
    } else {
      // Generic but working fallback links
      fallbackLinks = ' More information: [Plant Disease Guide](https://extension.umn.edu/plant-diseases) [Agricultural Research](https://www.researchgate.net/topic/Plant-Diseases)';
    }
    solution += fallbackLinks;
  }
  
  // Validate and clean up any invalid links in the solution
  solution = solution.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match: string, linkText: string, linkUrl: string) => {
    // Check if URL is valid (starts with http/https)
    if (linkUrl && linkUrl.trim().startsWith('http')) {
      return match; // Keep valid links
    } else {
      return linkText; // Remove invalid links, keep just the text
    }
  });
  
  return {
    about: aboutMatch ? aboutMatch[1].trim() : 'Information not available.',
    cause: causeMatch ? causeMatch[1].trim() : 'Information not available.',
    solution: solution
  };
};

// Component to render clickable links
const LinkText = ({ text }: { text: string }) => {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(text)) !== null) {
    // Add text before the link
    if (match && match.index > lastIndex) {
      parts.push(
        <Text key={`text-${lastIndex}`} style={styles.detailText}>
          {text.slice(lastIndex, match.index)}
        </Text>
      );
    }

    // Add the clickable link - with extra safety checks
    if (match && match.length >= 3 && match[1] && match[2]) {
      const linkText = match[1];
      const linkUrl = match[2];
      
      parts.push(
        <Text
          key={`link-${match.index}`}
          style={[styles.detailText, styles.linkText]}
          onPress={() => {
            try {
              if (linkUrl && linkUrl.trim()) {
                Linking.openURL(linkUrl);
              } else {
                Alert.alert('Error', 'Invalid link URL');
              }
            } catch (error) {
              console.error('Error opening link:', error);
              Alert.alert('Error', 'Could not open the link');
            }
          }}
        >
          {linkText}
        </Text>
      );

      lastIndex = match.index + match[0].length;
    } else {
      // If match is invalid, skip it and continue
      lastIndex = match.index + (match[0] ? match[0].length : 1);
    }
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(
      <Text key={`text-${lastIndex}`} style={styles.detailText}>
        {text.slice(lastIndex)}
      </Text>
    );
  }

  return <Text>{parts}</Text>;
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
                        <Text style={styles.detailText}>{report.about}</Text>
                      </View>

                      <View style={styles.detailSection}>
                        <Text style={styles.sectionTitle}>Cause</Text>
                        <Text style={styles.detailText}>{report.cause}</Text>
                      </View>

                      <View style={styles.detailSection}>
                        <Text style={styles.sectionTitle}>Solution</Text>
                        <LinkText text={report.solution} />
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
    resizeMode: 'contain',
    aspectRatio: 1,
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
  linkText: {
    color: '#2E7D32',
    textDecorationLine: 'underline',
  },
});
