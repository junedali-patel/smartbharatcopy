import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Modal, Alert, Linking } from 'react-native';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { useThemeColor } from '../../hooks/useThemeColor';
import { SafeAreaView } from 'react-native-safe-area-context';
import schemesData from '../../constants/schemes.json';
import { router, useLocalSearchParams } from 'expo-router';
import { BlurView } from 'expo-blur';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_API_KEY, isGeminiAvailable } from '../../constants/config';

// Initialize Gemini API
const genAI = isGeminiAvailable() ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

interface Scheme {
  id: string;
  name: string;
  description: string;
  benefits: string[];
  eligibility: string[];
  documents: string[];
  category: string;
  status: string;
  applyLink: string;
}

export default function SchemesScreen() {
  // Use white background for all layouts
  const backgroundColor = '#ffffff';
  const cardBackground = '#ffffff';
  const textColor = useThemeColor({ light: '#333333', dark: '#333333' }, 'text');
  const accentColor = useThemeColor({ light: '#2E7D32', dark: '#2E7D32' }, 'tint');
  const borderColor = '#e0e0e0';

  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState<string[]>(['All']);
  const [selectedScheme, setSelectedScheme] = useState<Scheme | null>(null);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  
  // Get parameters from navigation
  const params = useLocalSearchParams();
  const detectedSchemeId = params.schemeId as string;
  const detectedSchemeName = params.schemeName as string;
  
  // Ref for scroll view
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    fetchSchemes();
  }, []);

  const fetchSchemes = async () => {
    try {
      setLoading(true);
      const schemesList = schemesData.map(scheme => ({
        id: scheme.id,
        name: scheme.title,
        description: scheme.description,
        benefits: [], // Will be populated by Gemini if needed
        eligibility: scheme.criteria ? [scheme.criteria] : [],
        documents: [], // Will be populated by Gemini if needed
        category: scheme.category,
        status: 'Active',
        applyLink: scheme.applyLink
      } as Scheme));

      // Extract unique categories
      const uniqueCategories = ['All', ...new Set(schemesList.map(scheme => scheme.category))];
      setCategories(uniqueCategories);
      setSchemes(schemesList);
    } catch (error) {
      console.error('Error fetching schemes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSchemes = selectedCategory === 'All' 
    ? schemes 
    : schemes.filter(scheme => scheme.category === selectedCategory);

  // Handle detected scheme from chatbot
  useEffect(() => {
    if (detectedSchemeId && schemes.length > 0) {
      const detectedScheme = schemes.find(scheme => scheme.id === detectedSchemeId);
      if (detectedScheme) {
        // Find the index of the scheme in the filtered list
        const schemeIndex = filteredSchemes.findIndex(scheme => scheme.id === detectedSchemeId);
        if (schemeIndex !== -1) {
          // Scroll to the scheme after a short delay
          setTimeout(() => {
            scrollViewRef.current?.scrollTo({
              y: schemeIndex * 200, // Approximate height of each card
              animated: true
            });
            
            // Auto-open the details modal after scrolling
            setTimeout(() => {
              handleViewDetails(detectedScheme);
            }, 500);
          }, 1000);
        }
      }
    }
  }, [detectedSchemeId, schemes, filteredSchemes]);

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'agriculture':
        return 'leaf';
      case 'healthcare':
        return 'hospital-o';
      case 'education':
        return 'graduation-cap';
      case 'housing':
        return 'home';
      default:
        return 'gift';
    }
  };

  const getGeminiResponse = async (schemeName: string, type: 'eligibility' | 'benefits' | 'documents') => {
    try {
      const model = genAI?.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `You are a government schemes expert. For the Indian government scheme "${schemeName}", provide a detailed list of ${type}. The response should be well-researched and accurate. Return only a JSON array of strings, with each item being detailed and specific. Do not include any markdown formatting or code blocks. Example format: ["Detailed item 1","Detailed item 2","Detailed item 3"]`;
      
      const result = await model?.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          topK: 1,
          topP: 1,
          maxOutputTokens: 2048,
        },
      });
      
      const response = await result?.response;
      let text = response?.text().trim() || '';
      
      // Remove any markdown code block formatting if present
      if (text.startsWith('```')) {
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      }
      
      try {
        const parsedResponse = JSON.parse(text);
        return Array.isArray(parsedResponse) ? parsedResponse : [];
      } catch (error) {
        console.error('Error parsing Gemini response:', error);
        console.error('Raw response:', text);
        
        // Attempt to fix common formatting issues
        try {
          // If the response is a single string, try to wrap it in an array
          if (text.startsWith('"') && text.endsWith('"')) {
            return [JSON.parse(text)];
          }
          
          // If the response is a comma-separated list without brackets
          if (text.includes(',') && !text.includes('[')) {
            const fixedText = `[${text}]`;
            return JSON.parse(fixedText);
          }
          
          return [];
        } catch (e) {
          console.error('Failed to fix response format:', e);
          return [];
        }
      }
    } catch (error) {
      console.error('Error getting Gemini response:', error);
      return [];
    }
  };

  const handleViewDetails = async (scheme: Scheme) => {
    setSelectedScheme(scheme);
    setIsDetailsModalVisible(true);

    // If any required information is missing, fetch it from Gemini
    if (scheme.eligibility.length === 0 || scheme.benefits.length === 0 || scheme.documents.length === 0) {
      const updatedScheme = { ...scheme };
      
      if (scheme.eligibility.length === 0) {
        const eligibilityPrompt = `You are a government schemes expert. For the Indian government scheme "${scheme.name}", provide a comprehensive list of eligibility criteria. Consider all categories of beneficiaries and conditions. Format as JSON array.`;
        updatedScheme.eligibility = await getGeminiResponse(scheme.name, 'eligibility');
      }
      
      if (scheme.benefits.length === 0) {
        const benefitsPrompt = `You are a government schemes expert. For the Indian government scheme "${scheme.name}", provide a detailed list of all benefits and advantages offered to beneficiaries. Include monetary and non-monetary benefits. Format as JSON array.`;
        updatedScheme.benefits = await getGeminiResponse(scheme.name, 'benefits');
      }
      
      if (scheme.documents.length === 0) {
        const documentsPrompt = `You are a government schemes expert. For the Indian government scheme "${scheme.name}", provide a complete list of required documents needed for application. Include all mandatory and optional documents. Format as JSON array.`;
        updatedScheme.documents = await getGeminiResponse(scheme.name, 'documents');
      }
      
      setSelectedScheme(updatedScheme);
    }
  };

  const handleApplyNow = async (scheme: Scheme) => {
    if (scheme.applyLink) {
      try {
        const supported = await Linking.canOpenURL(scheme.applyLink);
        if (supported) {
          await Linking.openURL(scheme.applyLink);
        } else {
          Alert.alert(
            'Error',
            'Cannot open the application link. Please try again later.'
          );
        }
      } catch (error) {
        console.error('Error opening URL:', error);
        Alert.alert(
          'Error',
          'Failed to open the application link. Please try again later.'
        );
      }
    } else {
      // If no apply link is available, try to get it from Gemini
      try {
        const model = genAI?.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `You are a government schemes expert. For the Indian government scheme "${scheme.name}", provide only the official application website URL. Return only the URL without any additional text, quotes, or formatting.`;
        
        const result = await model?.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 1,
            maxOutputTokens: 100,
          },
        });
        
        const response = await result?.response;
        const url = response?.text().trim().replace(/^["'](.+)["']$/, '$1');  // Remove quotes if present
        
        if (url && url.startsWith('http')) {
          const supported = await Linking.canOpenURL(url);
          if (supported) {
            await Linking.openURL(url);
          } else {
            Alert.alert(
              'Error',
              'Cannot open the application link. Please try again later.'
            );
          }
        } else {
          Alert.alert(
            'Not Available',
            'Application link is not available for this scheme.'
          );
        }
      } catch (error) {
        console.error('Error getting application link:', error);
        Alert.alert(
          'Not Available',
          'Application link is not available for this scheme.'
        );
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.headerTitle, { color: textColor }]}>Smart Bharat Schemes</Text>
          <Text style={[styles.headerSubtitle, { color: textColor }]}>
            {loading 
              ? 'Loading schemes...' 
              : selectedCategory === 'All' 
                ? `${schemes.length} government schemes available` 
                : `${filteredSchemes.length} schemes in ${selectedCategory}`
            }
          </Text>
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <FontAwesome name="filter" size={20} color={accentColor} />
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      <View style={styles.categoryWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryContainer}
        >
          {categories.map((category, index) => (
            <TouchableOpacity 
              key={index} 
              style={[
                styles.categoryButton, 
                { 
                  backgroundColor: category === selectedCategory ? accentColor : 'transparent',
                  borderColor: category === selectedCategory ? accentColor : borderColor
                }
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text 
                style={[
                  styles.categoryText, 
                  { color: category === selectedCategory ? '#fff' : textColor }
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Schemes List */}
      <ScrollView 
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={accentColor} />
          </View>
        ) : filteredSchemes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: textColor }]}>No schemes found in this category</Text>
          </View>
        ) : (
          filteredSchemes.map((scheme) => (
            <View 
              key={scheme.id} 
              style={[
                styles.card, 
                { 
                  backgroundColor: cardBackground, 
                  borderColor: scheme.id === detectedSchemeId ? accentColor : borderColor,
                  borderWidth: scheme.id === detectedSchemeId ? 2 : 1
                }
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.titleContainer}>
                  <View style={[styles.iconContainer, { backgroundColor: accentColor + '20' }]}>
                    <FontAwesome name={getCategoryIcon(scheme.category)} size={24} color={accentColor} />
                  </View>
                  <Text style={[styles.cardTitle, { color: textColor }]}>{scheme.name}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: accentColor }]}>
                  <Text style={styles.statusText}>{scheme.status}</Text>
                </View>
              </View>
              
              <Text style={[styles.cardSubtitle, { color: textColor }]}>{scheme.category}</Text>
              
              <Text style={[styles.description, { color: textColor }]}>{scheme.description}</Text>
              
              <View style={styles.buttonContainer}>
                <TouchableOpacity 
                  style={[styles.cardButton, { borderColor: accentColor }]}
                  onPress={() => handleViewDetails(scheme)}
                >
                  <Text style={[styles.cardButtonText, { color: accentColor }]}>View Details</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.cardButton, { borderColor: accentColor }]}
                  onPress={() => handleApplyNow(scheme)}
                >
                  <Text style={[styles.cardButtonText, { color: accentColor }]}>Apply Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Scheme Details Modal */}
      <Modal
        visible={isDetailsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsDetailsModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <BlurView intensity={80} style={[styles.modalContent, { backgroundColor: cardBackground }]}>
            <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
              <Text style={[styles.modalTitle, { color: textColor }]}>Scheme Details</Text>
              <TouchableOpacity onPress={() => setIsDetailsModalVisible(false)}>
                <MaterialIcons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedScheme && (
                <>
                  <Text style={[styles.detailTitle, { color: textColor }]}>{selectedScheme.name}</Text>
                  <Text style={[styles.detailCategory, { color: textColor }]}>{selectedScheme.category}</Text>
                  
                  <View style={styles.detailSection}>
                    <Text style={[styles.detailSectionTitle, { color: textColor }]}>Description</Text>
                    <Text style={[styles.detailText, { color: textColor }]}>{selectedScheme.description}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={[styles.detailSectionTitle, { color: textColor }]}>Eligibility Criteria</Text>
                    {selectedScheme.eligibility.map((item, index) => (
                      <Text key={index} style={[styles.detailText, { color: textColor }]}>• {item}</Text>
                    ))}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={[styles.detailSectionTitle, { color: textColor }]}>Benefits</Text>
                    {selectedScheme.benefits.map((item, index) => (
                      <Text key={index} style={[styles.detailText, { color: textColor }]}>• {item}</Text>
                    ))}
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={[styles.detailSectionTitle, { color: textColor }]}>Required Documents</Text>
                    {selectedScheme.documents.map((item, index) => (
                      <Text key={index} style={[styles.detailText, { color: textColor }]}>• {item}</Text>
                    ))}
                  </View>

                  {selectedScheme.applyLink && (
                    <TouchableOpacity 
                      style={[styles.applyButton, { backgroundColor: accentColor }]}
                      onPress={() => handleApplyNow(selectedScheme)}
                    >
                      <Text style={styles.applyButtonText}>Apply Now</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </ScrollView>
          </BlurView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
  filterButton: {
    padding: 8,
  },
  categoryWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 8,
  },
  categoryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  categoryText: {
    fontWeight: '500',
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  cardSubtitle: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  detailsContainer: {
    marginBottom: 16,
  },
  detailItem: {
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    opacity: 0.8,
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  cardButtonText: {
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    flex: 1,
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  detailCategory: {
    fontSize: 16,
    opacity: 0.8,
    marginBottom: 20,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  applyButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});