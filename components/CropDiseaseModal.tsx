import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert, Platform, Linking } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { BACKEND_BASE_URL } from '../constants/config';

// Hugging Face Inference API URLs for plant disease detection
const HF_API_URL = 'https://api-inference.huggingface.co/models/linkanjarad/mobilenet_v2_1.0_224-plant-disease-identification';
const HF_API_URL_FALLBACK = 'https://api-inference.huggingface.co/models/PlantNet/plantnet-300k';

interface CropDiseaseModalProps {
  visible: boolean;
  onClose: () => void;
}

// Function to convert image to base64
const imageToBase64 = async (imageUri: string): Promise<string> => {
  if (Platform.OS === 'web') {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img') as HTMLImageElement;
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const base64 = canvas.toDataURL('image/jpeg');
          resolve(base64.split(',')[1]); // Remove data:image/jpeg;base64, prefix
        } else {
          reject(new Error('Could not create canvas context'));
        }
      };
      img.onerror = reject;
      img.src = imageUri;
    });
  } else {
    // For native platforms
    try {
      if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
        // Remote URL - fetch and convert to base64
        const response = await fetch(imageUri);
        const arrayBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        // Convert to base64
        const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        let binary = '';
        for (let i = 0; i < uint8Array.length; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        // Manual base64 encoding for native
        let result = '';
        let i = 0;
        while (i < binary.length) {
          const a = binary.charCodeAt(i++);
          const b = i < binary.length ? binary.charCodeAt(i++) : 0;
          const c = i < binary.length ? binary.charCodeAt(i++) : 0;
          const bitmap = (a << 16) | (b << 8) | c;
          result += base64Chars.charAt((bitmap >> 18) & 63);
          result += base64Chars.charAt((bitmap >> 12) & 63);
          result += i - 2 < binary.length ? base64Chars.charAt((bitmap >> 6) & 63) : '=';
          result += i - 1 < binary.length ? base64Chars.charAt(bitmap & 63) : '=';
        }
        return result;
      } else {
        // Local file path
        return await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      }
    } catch (error: any) {
      throw new Error(`Failed to process image: ${error.message}`);
    }
  }
};

// Function to predict disease using local FastAPI backend (PyTorch + transformers)
// On native: image is a URI string
// On web: image is a File object from an <input type="file">
const predictDiseaseFromHF = async (image: any): Promise<{ disease: string; confidence: number }> => {
  try {
    const formData = new FormData();

    if (Platform.OS === 'web') {
      // Web: append the actual File object
      formData.append('file', image);
    } else {
      // Native: append React Native file descriptor
      formData.append('file', {
        uri: image as string,
        name: 'crop.jpg',
        type: 'image/jpeg',
      } as any);
    }

    const response = await fetch(`${BACKEND_BASE_URL}/predict`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Backend error (${response.status}): ${errorText.substring(0, 200)}`
      );
    }

    const json = await response.json();
    const diseaseLabel = json.disease_label || 'Unknown Disease';
    const confidencePct = typeof json.confidence === 'number' ? json.confidence : 0;

    return {
      disease: diseaseLabel,
      confidence: confidencePct / 100,
    };
  } catch (error: any) {
    throw new Error(`Disease detection failed: ${error.message || 'Service unavailable'}`);
  }
};

// Cache for Gemini responses to prevent duplicate API calls
const geminiCache = new Map<string, any>();
let lastGeminiRequestTime = 0;
const GEMINI_REQUEST_DELAY = 2000; // 2 second delay between requests to respect rate limits

// Gemini AI info fetch with caching and rate limiting
const getGeminiDiseaseInfo = async (diseaseLabel: string) => {
  // Check cache first
  if (geminiCache.has(diseaseLabel)) {
    console.log('Using cached Gemini response for:', diseaseLabel);
    return geminiCache.get(diseaseLabel);
  }

  // Implement rate limiting - wait before making request
  const timeSinceLastRequest = Date.now() - lastGeminiRequestTime;
  if (timeSinceLastRequest < GEMINI_REQUEST_DELAY) {
    await new Promise(resolve => setTimeout(resolve, GEMINI_REQUEST_DELAY - timeSinceLastRequest));
  }

  const apiKey = 'AIzaSyDGzlWAvbh75mP5wS0M8OIM4bZQoWt2h8s';
  const prompt = `Write a detailed, structured response about the plant disease "${diseaseLabel}" in this format:

ABOUT:
[Provide a comprehensive description]

CAUSE:
[Explain causes, transmission, conditions]

SOLUTION:
[Provide treatment and prevention, include at least 2 relevant links]`;

  // Try gemini-pro first, fallback to gemini-1.5-pro if needed
  let modelName = 'gemini-pro';
  let response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  // If gemini-pro fails, try gemini-1.5-pro
  if (!response.ok && response.status === 404) {
    modelName = 'gemini-1.5-pro';
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );
  }

  // Record request time for rate limiting
  lastGeminiRequestTime = Date.now();

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error('Gemini API error: ' + errorText);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No information found.';

  const aboutMatch = text.match(/ABOUT:\s*(.*?)(?=\nCAUSE:|$)/s);
  const causeMatch = text.match(/CAUSE:\s*(.*?)(?=\nSOLUTION:|$)/s);
  const solutionMatch = text.match(/SOLUTION:\s*(.*?)(?=\n|$)/s);

  let solution = solutionMatch ? solutionMatch[1].trim() : 'Information not available.';

  // Fallback links
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const links = solution.match(linkRegex);
  if (!links || links.length < 2) {
    const diseaseName = diseaseLabel.toLowerCase();
    let fallbackLinks = '';
    if (diseaseName.includes('strawberry')) fallbackLinks = ' [Strawberry Guide](https://extension.umn.edu/fruit/growing-strawberries-home-garden) [Plant Care](https://www.almanac.com/plant/strawberries)';
    else if (diseaseName.includes('tomato')) fallbackLinks = ' [Tomato Guide](https://extension.umn.edu/vegetables/growing-tomatoes) [Plant Care](https://www.almanac.com/plant/tomatoes)';
    else fallbackLinks = ' [Plant Disease Guide](https://extension.umn.edu/plant-diseases) [Agricultural Research](https://www.researchgate.net/topic/Plant-Diseases)';
    solution += fallbackLinks;
  }

  solution = solution.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match: string, linkText: string, linkUrl: string) => {
    return linkUrl && linkUrl.trim().startsWith('http') ? match : linkText;
  });

  const result = {
    about: aboutMatch ? aboutMatch[1].trim() : 'Information not available.',
    cause: causeMatch ? causeMatch[1].trim() : 'Information not available.',
    solution,
  };

  // Cache the result for future requests
  geminiCache.set(diseaseLabel, result);

  return result;
};

// Component to render clickable links
const LinkText = ({ text }: { text: string }) => {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(<Text key={`text-${lastIndex}`} style={styles.detailText}>{text.slice(lastIndex, match.index)}</Text>);
    if (match.length >= 3) {
      parts.push(
        <Text
          key={`link-${match.index}`}
          style={[styles.detailText, styles.linkText]}
          onPress={() => match && Linking.openURL(match[2])}
        >
          {match[1]}
        </Text>
      );
      lastIndex = match.index + match[0].length;
    }
  }
  if (lastIndex < text.length) parts.push(<Text key={`text-${lastIndex}`} style={styles.detailText}>{text.slice(lastIndex)}</Text>);
  return <Text>{parts}</Text>;
};

export default function CropDiseaseModal({ visible, onClose }: CropDiseaseModalProps) {
  const [image, setImage] = useState<string | null>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [report, setReport] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleImagePicker = async (useCamera: boolean) => {
    if (Platform.OS === 'web') {
      const fileInput = document.getElementById('fileInput') as HTMLInputElement;
      fileInput?.click();
    } else {
      const { status } = useCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return Alert.alert('Permission Denied', 'Camera/Library access required.');
      const result = useCamera
        ? await ImagePicker.launchCameraAsync({ quality: 1 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      if (!result.canceled) {
        setImage(result.assets[0].uri);
        setPrediction(null);
        setReport(null);
        handlePrediction(result.assets[0].uri);
      }
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setImage(imageUrl);
      setPrediction(null);
      setReport(null);
      // For web, send the File object to the backend (preview uses the blob URL)
      handlePrediction(file);
    }
  };

  const handlePrediction = async (image: any) => {
    setIsLoading(true);
    try {
      // Always try to get disease prediction from Hugging Face
      const predResult = await predictDiseaseFromHF(image);
      setPrediction(predResult);
      
      // Try to get detailed info from Gemini, but don't fail if it doesn't work
      try {
        const reportResult = await getGeminiDiseaseInfo(predResult.disease);
        setReport(reportResult);
      } catch (geminiError: any) {
        console.warn('Gemini info fetch failed, using fallback:', geminiError);
        // Set fallback report so disease still shows
        setReport({
          about: `Information about ${predResult.disease}. This disease was detected in the plant image.`,
          cause: 'Causes may include environmental factors, pathogens, or nutrient deficiencies.',
          solution: `For treatment and prevention of ${predResult.disease}, consult with agricultural experts. [Plant Disease Guide](https://extension.umn.edu/plant-diseases) [Agricultural Research](https://www.researchgate.net/topic/Plant-Diseases)`,
        });
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Prediction failed. Please try again.');
      setPrediction(null);
      setReport(null);
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
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={resetModal}>
      {Platform.OS === 'web' && <input id="fileInput" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelect} />}
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Crop Disease Prediction</Text>
            <TouchableOpacity onPress={resetModal}><FontAwesome name="close" size={24} color="#333" /></TouchableOpacity>
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
                <Image source={{ uri: image }} style={styles.uploadedImage} resizeMode="contain" />
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2E7D32" />
                    <Text style={styles.loadingText}>Analyzing Image...</Text>
                  </View>
                ) : (
                  prediction && (
                    <View>
                      <View style={styles.predictionBox}>
                        <Text style={styles.predictionText}>Prediction: <Text style={styles.predictionValue}>{prediction.disease}</Text></Text>
                        <Text style={styles.predictionText}>Confidence: <Text style={styles.predictionValue}>{(prediction.confidence * 100).toFixed(0)}%</Text></Text>
                      </View>
                      {report ? (
                        <>
                          <View style={styles.detailSection}><Text style={styles.sectionTitle}>About the Disease</Text><Text style={styles.detailText}>{report.about}</Text></View>
                          <View style={styles.detailSection}><Text style={styles.sectionTitle}>Cause</Text><Text style={styles.detailText}>{report.cause}</Text></View>
                          <View style={styles.detailSection}><Text style={styles.sectionTitle}>Solution</Text><LinkText text={report.solution} /></View>
                        </>
                      ) : (
                        <View style={styles.detailSection}>
                          <Text style={styles.detailText}>Detailed information is being loaded...</Text>
                        </View>
                      )}
                    </View>
                  )
                )}
                <TouchableOpacity style={styles.tryAnotherButton} onPress={() => setImage(null)}><Text style={styles.buttonText}>Try Another Image</Text></TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// Styles remain unchanged
const styles = StyleSheet.create({
  modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, height: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e9ecef', paddingBottom: 10, marginBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  pickerContainer: { alignItems: 'center', paddingVertical: 20 },
  pickerTitle: { fontSize: 18, fontWeight: '500', color: '#333', marginBottom: 20 },
  pickerButton: { flexDirection: 'row', backgroundColor: '#2E7D32', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center', marginBottom: 15, width: '80%', justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  resultContainer: { alignItems: 'center' },
  uploadedImage: { width: '100%', height: 200, borderRadius: 10, marginBottom: 20, aspectRatio: 1 },
  loadingContainer: { alignItems: 'center', marginVertical: 40 },
  loadingText: { marginTop: 10, fontSize: 16, color: '#333' },
  predictionBox: { backgroundColor: '#E8F5E9', borderRadius: 8, padding: 15, marginBottom: 20, width: '100%' },
  predictionText: { fontSize: 16, color: '#1B5E20' },
  predictionValue: { fontWeight: 'bold' },
  detailSection: { marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2E7D32', marginBottom: 8 },
  detailText: { fontSize: 14, color: '#333', lineHeight: 20 },
  tryAnotherButton: { backgroundColor: '#FFC107', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  linkText: { color: '#2E7D32', textDecorationLine: 'underline' },
});
