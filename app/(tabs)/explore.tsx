import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Modal } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

interface CropData {
  id: string;
  cropName: string;
  category: 'Vegetable' | 'Fruit' | 'Grain';
  variety: string;
  marketName: string;
  location: string;
  pinCode: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  priceUnit: 'kg' | 'quintal';
  distance: string;
  transportCost: string;
  supplyAddress: string;
}

// Mock Data for Crop Prices with added details
const mockCropData: CropData[] = [
  { id: '1', cropName: 'Tomato', category: 'Vegetable', variety: 'Hybrid', marketName: 'Pune Market', location: 'Pune', pinCode: '411001', minPrice: 25, maxPrice: 35, modalPrice: 30, priceUnit: 'kg', distance: '50 km', transportCost: '₹300', supplyAddress: 'Market Yard, Gate No. 1, Pune, Maharashtra 411037' },
  { id: '2', cropName: 'Onion', category: 'Vegetable', variety: 'Red', marketName: 'Nashik Market', location: 'Nashik', pinCode: '422001', minPrice: 15, maxPrice: 25, modalPrice: 20, priceUnit: 'kg', distance: '200 km', transportCost: '₹1200', supplyAddress: 'Nashik Main Market, Nashik, Maharashtra 422001' },
  { id: '3', cropName: 'Potato', category: 'Vegetable', variety: 'Local', marketName: 'Pune Market', location: 'Pune', pinCode: '411001', minPrice: 10, maxPrice: 18, modalPrice: 15, priceUnit: 'kg', distance: '50 km', transportCost: '₹250', supplyAddress: 'Market Yard, Gate No. 1, Pune, Maharashtra 411037' },
  { id: '4', cropName: 'Apple', category: 'Fruit', variety: 'Shimla', marketName: 'Mumbai Market', location: 'Mumbai', pinCode: '400001', minPrice: 80, maxPrice: 120, modalPrice: 100, priceUnit: 'kg', distance: '150 km', transportCost: '₹900', supplyAddress: 'APMC Market, Vashi, Navi Mumbai, Maharashtra 400703' },
  { id: '5', cropName: 'Mango', category: 'Fruit', variety: 'Alphonso', marketName: 'Ratnagiri Market', location: 'Ratnagiri', pinCode: '415612', minPrice: 200, maxPrice: 400, modalPrice: 300, priceUnit: 'kg', distance: '330 km', transportCost: '₹2000', supplyAddress: 'Ratnagiri APMC, Ratnagiri, Maharashtra 415612' },
  { id: '6', cropName: 'Wheat', category: 'Grain', variety: 'Lokwan', marketName: 'Nagpur Market', location: 'Nagpur', pinCode: '440001', minPrice: 2000, maxPrice: 2500, modalPrice: 2200, priceUnit: 'quintal', distance: '250 km', transportCost: '₹1500', supplyAddress: 'Kalamna Market, Kamptee Road, Nagpur, Maharashtra 440026' },
  { id: '7', cropName: 'Rice', category: 'Grain', variety: 'Basmati', marketName: 'Nagpur Market', location: 'Nagpur', pinCode: '440001', minPrice: 5000, maxPrice: 7000, modalPrice: 6000, priceUnit: 'quintal', distance: '250 km', transportCost: '₹1800', supplyAddress: 'Kalamna Market, Kamptee Road, Nagpur, Maharashtra 440026' },
];

const categories = ['All', 'Vegetable', 'Fruit', 'Grain'];

export default function MarketPriceScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isLoading, setIsLoading] = useState(false);
  const [filteredData, setFilteredData] = useState(mockCropData);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedCrop, setSelectedCrop] = useState<CropData | null>(null);

  const handleSearch = () => {
    setIsLoading(true);
    setTimeout(() => {
      const query = searchQuery.toLowerCase();
      const results = mockCropData.filter(item => 
        item.location.toLowerCase().includes(query) || 
        item.pinCode.includes(query) ||
        item.cropName.toLowerCase().includes(query)
      );
      setFilteredData(results);
      setIsLoading(false);
    }, 1000);
  };

  const categorizedData = useMemo(() => {
    if (selectedCategory === 'All') {
      return filteredData;
    }
    return filteredData.filter(item => item.category === selectedCategory);
  }, [selectedCategory, filteredData]);

  const handleCardPress = (item: CropData) => {
    setSelectedCrop(item);
    setIsModalVisible(true);
  };

  const renderPriceDetails = () => {
    if (!selectedCrop) return null;

    const { modalPrice, priceUnit } = selectedCrop;
    const pricePerKg = priceUnit === 'quintal' ? modalPrice / 100 : modalPrice;
    const pricePerQuintal = priceUnit === 'kg' ? modalPrice * 100 : modalPrice;

    return (
      <View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Price per Kg:</Text>
          <Text style={styles.detailValue}>₹{pricePerKg.toFixed(2)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Price per Quintal:</Text>
          <Text style={styles.detailValue}>₹{pricePerQuintal.toFixed(2)}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Market Prices</Text>
      </View>

      {/* Search bar card */}
      <View style={styles.searchContainer}>
        <View style={styles.searchCard}>
          <FontAwesome name="search" size={16} color="#A0A0A0" style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Search by Crop, Location, Pincode"
            placeholderTextColor="#A0A0A0"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity onPress={handleSearch}>
            <FontAwesome name="microphone" size={18} color="#A0A0A0" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {categories.map(category => (
            <TouchableOpacity
              key={category}
              style={[styles.filterButton, selectedCategory === category && styles.filterButtonActive]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[styles.filterButtonText, selectedCategory === category && styles.filterButtonTextActive]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#2E7D32" style={styles.loader} />
      ) : (
        <ScrollView contentContainerStyle={styles.listContainer}>
          {categorizedData.length > 0 ? (
            categorizedData.map(item => (
              <TouchableOpacity key={item.id} onPress={() => handleCardPress(item)}>
                <View style={styles.card}>
                  <View style={styles.cardRow}>
                    <View style={styles.cardLeft}>
                      <Text style={styles.cropName}>
                        {item.cropName} ({item.variety})
                      </Text>
                      <Text style={styles.marketName}>{item.marketName}, {item.location}</Text>
                    </View>
                    <View style={styles.cardRight}>
                      <Text style={styles.priceRange}>
                        ₹{item.minPrice}-{item.maxPrice}/{item.priceUnit}
                      </Text>
                      <Text style={styles.modalPrice}>
                        ₹{item.modalPrice}/{item.priceUnit}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No results found.</Text>
            </View>
          )}
        </ScrollView>
      )}

      {selectedCrop && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={isModalVisible}
          onRequestClose={() => setIsModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{selectedCrop.cropName} ({selectedCrop.variety})</Text>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                  <FontAwesome name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView>
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Price Details</Text>
                  {renderPriceDetails()}
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Logistics</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Market Location:</Text>
                    <Text style={styles.detailValue}>{selectedCrop.marketName}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Distance:</Text>
                    <Text style={styles.detailValue}>{selectedCrop.distance}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Est. Transport Cost:</Text>
                    <Text style={styles.detailValue}>{selectedCrop.transportCost}</Text>
                  </View>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Supply Address</Text>
                  <Text style={styles.addressText}>{selectedCrop.supplyAddress}</Text>
                </View>
              </ScrollView>
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
    backgroundColor: '#F4F8F3',
  },
  header: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 40,
    fontSize: 14,
  },
  filterContainer: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#e9ecef',
    marginRight: 10,
  },
  filterButtonActive: {
    backgroundColor: '#2E7D32',
  },
  filterButtonText: {
    color: '#333',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  loader: {
    marginTop: 30,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    flexShrink: 1,
    paddingRight: 12,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  cropName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  marketName: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priceRange: {
    fontSize: 12,
    color: '#777',
  },
  modalPrice: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  // Modal Styles
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
    height: '60%',
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
  detailSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  addressText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});