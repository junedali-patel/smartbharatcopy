import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Modal, Alert, Linking } from 'react-native';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { useThemeColor } from '../../hooks/useThemeColor';
import { SafeAreaView } from 'react-native-safe-area-context';
import schemesData from '../../constants/schemes.json';
import { router, useLocalSearchParams } from 'expo-router';
import { BlurView } from 'expo-blur';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { isGeminiAvailable, getGeminiModel } from '../../constants/config';

// Initialize Gemini API
const GEMINI_API_KEY = 'AIzaSyATFG-N_HT4IFm8SHGLnlAFtH_7fzqB_j0';
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
  
  useEffect(() => {
    console.log('useLocalSearchParams:', { detectedSchemeId, detectedSchemeName, params });
  }, []);
  
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
    console.log('Schemes page useEffect triggered');
    console.log('detectedSchemeId:', detectedSchemeId);
    console.log('schemes.length:', schemes.length);
    
    if (detectedSchemeId && schemes.length > 0) {
      const detectedScheme = schemes.find(scheme => scheme.id === detectedSchemeId);
      console.log('Found scheme:', detectedScheme);
      
      if (detectedScheme) {
        // Immediately open the details modal
        console.log('Opening scheme details for:', detectedScheme.name);
        handleViewDetails(detectedScheme);
      } else {
        // If not found by ID, try searching by name
        const schemeByName = schemes.find(s => 
          s.name.toLowerCase().includes(detectedSchemeName?.toLowerCase() || '')
        );
        if (schemeByName) {
          console.log('Found scheme by name:', schemeByName.name);
          handleViewDetails(schemeByName);
        }
      }
    }
  }, [detectedSchemeId, detectedSchemeName, schemes]);

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
      const model = getGeminiModel(genAI);
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
    console.log('handleViewDetails called with scheme:', scheme.name, 'ID:', scheme.id);
    setSelectedScheme(scheme);
    setIsDetailsModalVisible(true);
    console.log('Modal visible state set to true');

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
      
      console.log('Updated scheme with Gemini data:', updatedScheme);
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
        const model = getGeminiModel(genAI);
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

      {/* Scheme Details Modal - Bottom Sheet */}
      {isDetailsModalVisible && (
        <Modal
          visible={true}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setIsDetailsModalVisible(false)}
        >
          <View style={styles.schemeModalOverlay}>
            <TouchableOpacity 
              style={styles.schemeOverlayBackground}
              onPress={() => setIsDetailsModalVisible(false)}
              activeOpacity={0.5}
            />
            
            <View style={styles.schemeModalContainer}>
          <View style={styles.schemeModalContent}>
            {/* Header */}
            <View style={styles.schemeModalHeader}>
              <View style={styles.schemeHeaderLeft}>
                <View style={[styles.schemeIconContainer, { backgroundColor: `${accentColor}15` }]}>
                  <FontAwesome name="file-text-o" size={24} color={accentColor} />
                </View>
                <View style={styles.schemeHeaderTextContainer}>
                  <Text style={[styles.schemeModalTitle, { color: textColor }]}>Scheme Details</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.schemeCloseButton}
                onPress={() => setIsDetailsModalVisible(false)}
              >
                <MaterialIcons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>

            {/* Details Content */}
            <ScrollView style={styles.schemeModalBody} showsVerticalScrollIndicator={false}>
              {selectedScheme && (
                <>
                  {/* Scheme Title */}
                  <View style={styles.schemeTitleSection}>
                    <Text style={[styles.schemeDetailTitle, { color: textColor }]}>
                      {selectedScheme.name}
                    </Text>
                    <View style={styles.schemeCategoryBadge}>
                      <Text style={styles.schemeCategoryText}>{selectedScheme.category}</Text>
                    </View>
                  </View>

                  {/* Description */}
                  <View style={styles.schemeDetailSection}>
                    <View style={styles.schemeSectionHeader}>
                      <FontAwesome name="info-circle" size={18} color={accentColor} />
                      <Text style={[styles.schemeSectionTitle, { color: textColor }]}>Description</Text>
                    </View>
                    <View style={styles.schemeDetailBox}>
                      <Text style={[styles.schemeDetailText, { color: textColor }]}>
                        {selectedScheme.description}
                      </Text>
                    </View>
                  </View>

                  {/* Eligibility Criteria */}
                  <View style={styles.schemeDetailSection}>
                    <View style={styles.schemeSectionHeader}>
                      <FontAwesome name="check-circle" size={18} color={accentColor} />
                      <Text style={[styles.schemeSectionTitle, { color: textColor }]}>Eligibility</Text>
                    </View>
                    <View style={styles.schemeListContainer}>
                      {selectedScheme.eligibility && selectedScheme.eligibility.length > 0 ? (
                        selectedScheme.eligibility.map((item, index) => (
                          <View key={index} style={styles.schemeListItem}>
                            <View style={[styles.schemeBullet, { backgroundColor: accentColor }]} />
                            <Text style={[styles.schemeListText, { color: textColor }]}>{item}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={[styles.schemeEmptyText, { color: textColor }]}>
                          Loading eligibility criteria...
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Benefits */}
                  <View style={styles.schemeDetailSection}>
                    <View style={styles.schemeSectionHeader}>
                      <FontAwesome name="gift" size={18} color={accentColor} />
                      <Text style={[styles.schemeSectionTitle, { color: textColor }]}>Benefits</Text>
                    </View>
                    <View style={styles.schemeListContainer}>
                      {selectedScheme.benefits && selectedScheme.benefits.length > 0 ? (
                        selectedScheme.benefits.map((item, index) => (
                          <View key={index} style={styles.schemeListItem}>
                            <View style={[styles.schemeBullet, { backgroundColor: accentColor }]} />
                            <Text style={[styles.schemeListText, { color: textColor }]}>{item}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={[styles.schemeEmptyText, { color: textColor }]}>
                          Loading benefits...
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Required Documents */}
                  <View style={styles.schemeDetailSection}>
                    <View style={styles.schemeSectionHeader}>
                      <FontAwesome name="file" size={18} color={accentColor} />
                      <Text style={[styles.schemeSectionTitle, { color: textColor }]}>Required Documents</Text>
                    </View>
                    <View style={styles.schemeListContainer}>
                      {selectedScheme.documents && selectedScheme.documents.length > 0 ? (
                        selectedScheme.documents.map((item, index) => (
                          <View key={index} style={styles.schemeListItem}>
                            <View style={[styles.schemeBullet, { backgroundColor: accentColor }]} />
                            <Text style={[styles.schemeListText, { color: textColor }]}>{item}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={[styles.schemeEmptyText, { color: textColor }]}>
                          Loading documents...
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Apply Button */}
                  <TouchableOpacity 
                    style={[styles.schemeApplyButton, { backgroundColor: accentColor }]}
                    onPress={() => handleApplyNow(selectedScheme)}
                  >
                    <MaterialIcons name="arrow-forward" size={20} color="#fff" />
                    <Text style={styles.schemeApplyButtonText}>Apply Now</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
        </View>
      </Modal>
      )}
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
    justifyContent: 'flex-end',
  },
  modalContent: {
    flex: 1,
    marginTop: 40,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },

  // New Scheme Modal Styles - Bottom Sheet
  schemeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
    alignItems: 'stretch',
  },
  schemeOverlayBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  schemeBlurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  schemeOverlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  schemeModalContainer: {
    width: '100%',
    height: '90%',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  schemeModalContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    overflow: 'hidden',
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  schemeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
    backgroundColor: '#FFFFFF',
  },
  schemeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  schemeHeaderTextContainer: {
    flex: 1,
  },
  schemeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  schemeModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  schemeCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  schemeModalBody: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  schemeTitleSection: {
    marginBottom: 28,
    marginTop: 8,
  },
  schemeDetailTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  schemeCategoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#2E7D3215',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  schemeCategoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2E7D32',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  schemeDetailSection: {
    marginBottom: 28,
  },
  schemeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  schemeSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  schemeDetailBox: {
    backgroundColor: '#F8F9F8',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(46, 106, 79, 0.1)',
  },
  schemeDetailText: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '500',
  },
  schemeListContainer: {
    gap: 10,
  },
  schemeListItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
  },
  schemeBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    minWidth: 6,
  },
  schemeListText: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
    flex: 1,
  },
  schemeEmptyText: {
    fontSize: 14,
    fontStyle: 'italic',
    opacity: 0.6,
    textAlign: 'center',
    paddingVertical: 20,
  },
  schemeApplyButton: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 32,
    gap: 10,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  schemeApplyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  detailTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  detailCategory: {
    fontSize: 15,
    opacity: 0.7,
    marginBottom: 24,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailSection: {
    marginBottom: 28,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  detailText: {
    fontSize: 15,
    lineHeight: 26,
    marginBottom: 10,
    fontWeight: '500',
  },
  applyButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});