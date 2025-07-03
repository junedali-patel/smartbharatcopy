import { FontAwesome } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColor } from '../../hooks/useThemeColor';

export default function ExploreScreen() {
  // Use white background for all layouts
  const backgroundColor = '#ffffff';
  const cardBackground = '#ffffff';
  const textColor = useThemeColor({ light: '#333333', dark: '#333333' }, 'text');
  const accentColor = useThemeColor({ light: '#2E7D32', dark: '#2E7D32' }, 'tint');
  const inputBackground = '#f5f5f5';
  const borderColor = '#e0e0e0';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Sample data for explore items with Google links
  const exploreItems = [
    { 
      id: 1, 
      title: 'Government Services', 
      category: 'Services',
      description: 'Access various government services online including document verification, certificates, and more.',
      icon: 'file-text-o',
      rating: 4.5,
      googleLink: 'https://www.india.gov.in/'
    },
    { 
      id: 2, 
      title: 'Digital India Initiatives', 
      category: 'Digital',
      description: 'Explore digital initiatives aimed at transforming India into a digitally empowered society.',
      icon: 'laptop',
      rating: 4.8,
      googleLink: 'https://www.digitalindia.gov.in/'
    },
    { 
      id: 3, 
      title: 'Skill Development Programs', 
      category: 'Education',
      description: 'Find skill development programs and vocational training opportunities across India.',
      icon: 'graduation-cap',
      rating: 4.2,
      googleLink: 'https://www.skillindia.gov.in/'
    },
    { 
      id: 4, 
      title: 'Healthcare Services', 
      category: 'Healthcare',
      description: 'Discover healthcare services, telemedicine options, and health awareness programs.',
      icon: 'hospital-o',
      rating: 4.6,
      googleLink: 'https://www.mohfw.gov.in/'
    },
    { 
      id: 5, 
      title: 'Financial Inclusion', 
      category: 'Finance',
      description: 'Learn about financial inclusion programs, banking services, and digital payment options.',
      icon: 'credit-card',
      rating: 4.3,
      googleLink: 'https://www.pmjdy.gov.in/'
    },
    { 
      id: 6, 
      title: 'Agricultural Resources', 
      category: 'Agriculture',
      description: 'Access agricultural resources, market prices, and farming techniques for better yields.',
      icon: 'leaf',
      rating: 4.4,
      googleLink: 'https://www.agriculture.gov.in/'
    },
  ];

  // Filter options
  const categories = ['All', 'Services', 'Digital', 'Education', 'Healthcare', 'Finance', 'Agriculture'];

  // Filter items based on search query and selected category
  const filteredItems = exploreItems.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAccess = async (item: any) => {
    try {
      const supported = await Linking.canOpenURL(item.googleLink);
      if (supported) {
        await Linking.openURL(item.googleLink);
      } else {
        Alert.alert(
          'Error',
          'Cannot open the link. Please try again later.'
        );
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      Alert.alert(
        'Error',
        'Failed to open the link. Please try again later.'
      );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: textColor }]}>Explore</Text>
        <TouchableOpacity style={styles.filterButton}>
          <FontAwesome name="filter" size={20} color={accentColor} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: inputBackground, borderColor }]}>
        <FontAwesome name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: textColor }]}
          placeholder="Search services, programs..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <FontAwesome name="times-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
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
                  backgroundColor: selectedCategory === category ? accentColor : 'transparent',
                  borderColor: selectedCategory === category ? accentColor : borderColor
                }
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text 
                style={[
                  styles.categoryText, 
                  { color: selectedCategory === category ? '#fff' : textColor }
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Explore Items List */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {filteredItems.map((item) => (
          <View key={item.id} style={[styles.card, { backgroundColor: cardBackground, borderColor }]}>
            <View style={styles.cardHeader}>
              <View style={styles.titleContainer}>
                <View style={[styles.iconContainer, { backgroundColor: accentColor + '20' }]}>
                  <FontAwesome name={item.icon as any} size={24} color={accentColor} />
                </View>
                <Text style={[styles.cardTitle, { color: textColor }]}>{item.title}</Text>
              </View>
              <View style={styles.ratingContainer}>
                <FontAwesome name="star" size={16} color="#FFC107" />
                <Text style={[styles.ratingText, { color: textColor }]}>{item.rating}</Text>
              </View>
            </View>
            
            <Text style={[styles.cardSubtitle, { color: textColor }]}>{item.category}</Text>
            
            <Text style={[styles.description, { color: textColor }]}>{item.description}</Text>
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.cardButton, { backgroundColor: accentColor }]}
                onPress={() => handleAccess(item)}
              >
                <Text style={[styles.cardButtonText, { color: '#fff' }]}>Access</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
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
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  filterButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 16,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
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
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    marginLeft: 4,
    fontWeight: '500',
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
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  cardButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  cardButtonText: {
    fontWeight: '600',
    fontSize: 16,
  },
});