import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Image } from 'react-native';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import Svg, { Line, Polyline, Circle } from 'react-native-svg';
import { useRouter } from 'expo-router';

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
  imageUrl?: string;
  distanceKm?: number;
  priceHistory?: number[];
}

// Mock Data for Crop Prices with price history for graphs
const mockCropData: CropData[] = [
  { 
    id: '1', 
    cropName: 'Tomato', 
    category: 'Vegetable', 
    variety: 'Hybrid', 
    marketName: 'Pune Market', 
    location: 'Pune', 
    pinCode: '411001', 
    minPrice: 25, 
    maxPrice: 35, 
    modalPrice: 30, 
    priceUnit: 'kg', 
    distance: '50 km', 
    transportCost: '₹300', 
    supplyAddress: 'Market Yard, Gate No. 1, Pune, Maharashtra 411037',
    imageUrl: 'https://picsum.photos/seed/tomato/100/100',
    distanceKm: 4.2,
    priceHistory: [25, 26, 28, 27, 29, 31, 30, 32, 31, 33, 35, 30]
  },
  { 
    id: '2', 
    cropName: 'Onion', 
    category: 'Vegetable', 
    variety: 'Red', 
    marketName: 'Nashik Market', 
    location: 'Nashik', 
    pinCode: '422001', 
    minPrice: 15, 
    maxPrice: 25, 
    modalPrice: 20, 
    priceUnit: 'kg', 
    distance: '200 km', 
    transportCost: '₹1200', 
    supplyAddress: 'Nashik Main Market, Nashik, Maharashtra 422001',
    imageUrl: 'https://picsum.photos/seed/onion/100/100',
    distanceKm: 1.5,
    priceHistory: [15, 16, 17, 18, 19, 20, 21, 22, 21, 20, 22, 25]
  },
  { 
    id: '3', 
    cropName: 'Potato', 
    category: 'Vegetable', 
    variety: 'Local', 
    marketName: 'Pune Market', 
    location: 'Pune', 
    pinCode: '411001', 
    minPrice: 10, 
    maxPrice: 18, 
    modalPrice: 15, 
    priceUnit: 'kg', 
    distance: '50 km', 
    transportCost: '₹250', 
    supplyAddress: 'Market Yard, Gate No. 1, Pune, Maharashtra 411037',
    imageUrl: 'https://picsum.photos/seed/potato/100/100',
    distanceKm: 8.7,
    priceHistory: [10, 11, 11, 12, 13, 14, 15, 16, 15, 14, 16, 18]
  },
  { 
    id: '4', 
    cropName: 'Apple', 
    category: 'Fruit', 
    variety: 'Shimla', 
    marketName: 'Mumbai Market', 
    location: 'Mumbai', 
    pinCode: '400001', 
    minPrice: 80, 
    maxPrice: 120, 
    modalPrice: 100, 
    priceUnit: 'kg', 
    distance: '150 km', 
    transportCost: '₹900', 
    supplyAddress: 'APMC Market, Vashi, Navi Mumbai, Maharashtra 400703',
    imageUrl: 'https://picsum.photos/seed/apple/100/100',
    distanceKm: 12.8,
    priceHistory: [80, 85, 88, 90, 92, 95, 98, 100, 105, 110, 115, 120]
  },
  { 
    id: '5', 
    cropName: 'Mango', 
    category: 'Fruit', 
    variety: 'Alphonso', 
    marketName: 'Ratnagiri Market', 
    location: 'Ratnagiri', 
    pinCode: '415612', 
    minPrice: 200, 
    maxPrice: 400, 
    modalPrice: 300, 
    priceUnit: 'kg', 
    distance: '330 km', 
    transportCost: '₹2000', 
    supplyAddress: 'Ratnagiri APMC, Ratnagiri, Maharashtra 415612',
    imageUrl: 'https://picsum.photos/seed/mango/100/100',
    distanceKm: 140,
    priceHistory: [200, 220, 240, 260, 280, 300, 320, 340, 360, 380, 400, 300]
  },
  { 
    id: '6', 
    cropName: 'Wheat', 
    category: 'Grain', 
    variety: 'Lokwan', 
    marketName: 'Nagpur Market', 
    location: 'Nagpur', 
    pinCode: '440001', 
    minPrice: 2000, 
    maxPrice: 2500, 
    modalPrice: 2200, 
    priceUnit: 'quintal', 
    distance: '250 km', 
    transportCost: '₹1500', 
    supplyAddress: 'Kalamna Market, Kamptee Road, Nagpur, Maharashtra 440026',
    imageUrl: 'https://picsum.photos/seed/wheat/100/100',
    distanceKm: 12.8,
    priceHistory: [2000, 2050, 2100, 2150, 2180, 2200, 2250, 2300, 2350, 2400, 2500, 2200]
  },
];

const categories = ['All', 'Vegetable', 'Fruit', 'Grain'];

const TrendGraph = ({ priceHistory }: { priceHistory?: number[] }) => {
  if (!priceHistory || priceHistory.length === 0) return null;

  const width = 220;
  const height = 80;
  const padding = 10;
  const graphWidth = width - padding * 2;
  const graphHeight = height - padding * 2;

  const minPrice = Math.min(...priceHistory);
  const maxPrice = Math.max(...priceHistory);
  const priceRange = maxPrice - minPrice || 1;

  const points = priceHistory.map((price, index) => {
    const x = padding + (index / (priceHistory.length - 1)) * graphWidth;
    const y = height - padding - ((price - minPrice) / priceRange) * graphHeight;
    return { x, y, price };
  });

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#E5E7EB" strokeWidth="1" />
      <Line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#E5E7EB" strokeWidth="1" />
      <Polyline
        points={polylinePoints}
        fill="none"
        stroke="#2E7D32"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((point, index) => (
        <Circle
          key={index}
          cx={point.x}
          cy={point.y}
          r="3"
          fill={index === priceHistory.length - 1 ? '#2E7D32' : '#4CAF50'}
          opacity={index === priceHistory.length - 1 ? 1 : 0.7}
        />
      ))}
    </Svg>
  );
};

export default function MarketPriceScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isLoading, setIsLoading] = useState(false);
  const [filteredData, setFilteredData] = useState(mockCropData);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

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

  const handleCropPress = (cropId: string) => {
    router.push({
      pathname: '/cropDetails',
      params: { id: cropId }
    });
  };

  const categorizedData = useMemo(() => {
    if (selectedCategory === 'All') {
      return filteredData;
    }
    return filteredData.filter(item => item.category === selectedCategory);
  }, [selectedCategory, filteredData]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Mandi Prices</Text>
          <TouchableOpacity style={styles.notificationButton}>
            <MaterialIcons name="notifications" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>
        
        {/* Search Bar */}
        <View style={[
          styles.searchContainer,
          {
            borderWidth: isSearchFocused ? 2 : 0,
            borderColor: isSearchFocused ? '#2E7D32' : 'transparent'
          }
        ]}>
          <FontAwesome name="search" size={16} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search crop, market or location..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity style={styles.micButton}>
            <FontAwesome name="microphone" size={16} color="#2E7D32" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Main Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.contentHeader}>
          <Text style={styles.contentTitle}>Today's Market Prices</Text>
          <Text style={styles.updateTime}>Updated 5m ago</Text>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color="#2E7D32" style={styles.loader} />
        ) : (
          <View style={styles.cardsContainer}>
            {categorizedData.length > 0 ? (
              categorizedData.map(item => (
                <TouchableOpacity 
                  key={item.id}
                  onPress={() => handleCropPress(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.premiumCard}>
                    {/* Card Header with Image and Price */}
                    <View style={styles.cardHeader}>
                      <Image 
                        source={{ uri: item.imageUrl || 'https://picsum.photos/seed/default/100/100' }} 
                        style={styles.cropImage}
                      />
                      <View style={styles.cardContent}>
                        <View style={styles.cardLeft}>
                          <Text style={styles.cropName}>{item.cropName} ({item.variety})</Text>
                          <View style={styles.locationRow}>
                            <FontAwesome name="map-marker" size={12} color="#6B7280" />
                            <Text style={styles.locationText}>{item.marketName}, {item.location}</Text>
                          </View>
                          <Text style={styles.distanceText}>📍 {item.distanceKm || '4.2'} km away</Text>
                        </View>
                        <View style={styles.cardRight}>
                          <Text style={styles.priceRange}>₹{item.minPrice}-{item.maxPrice}</Text>
                          <Text style={styles.currentPrice}>₹{item.modalPrice}/{item.priceUnit}</Text>
                          <View style={[
                            styles.priceStatus,
                            { backgroundColor: item.modalPrice > item.minPrice ? '#dcfce7' : '#fee2e2' }
                          ]}>
                            <MaterialIcons 
                              name={item.modalPrice > item.minPrice ? "trending-up" : "trending-down"}
                              size={12}
                              color={item.modalPrice > item.minPrice ? "#22c55e" : "#ef4444"}
                            />
                            <Text style={[
                              styles.priceStatusText,
                              { color: item.modalPrice > item.minPrice ? "#22c55e" : "#ef4444" }
                            ]}>
                              {item.modalPrice > item.minPrice ? '+' : ''}{Math.round(((item.modalPrice - item.minPrice) / item.minPrice) * 10)}%
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    
                    {/* Price Trend Graph */}
                    <View style={styles.graphSection}>
                      <View style={styles.graphHeader}>
                        <Text style={styles.graphLabel}>7-Day Price Trend</Text>
                        <Text style={styles.graphSubLabel}>Last 7 days</Text>
                      </View>
                      <View style={styles.graphContainer}>
                        <TrendGraph priceHistory={item.priceHistory} />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <MaterialIcons name="search" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>No results found</Text>
                <Text style={styles.emptySubText}>Try searching with different keywords</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAF9',
  },
  header: {
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  notificationButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: 'transparent',
  } as any,
  micButton: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    marginLeft: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  updateTime: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  cardsContainer: {
    gap: 16,
    paddingBottom: 100,
  },
  premiumCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  cropImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flex: 1,
    gap: 4,
  },
  cropName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  distanceText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '500',
  },
  cardRight: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    gap: 4,
  },
  priceRange: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  currentPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2E7D32',
  },
  priceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  priceStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  graphSection: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  graphHeader: {
    marginBottom: 12,
  },
  graphLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  graphSubLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  graphContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  loader: {
    marginTop: 30,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
    marginBottom: 50,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
});