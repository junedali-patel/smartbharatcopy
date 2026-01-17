import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons, FontAwesome } from '@expo/vector-icons';
import Svg, { Line, Polyline, Circle } from 'react-native-svg';
import { useAuth } from '../contexts/AuthContext';

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

// Mock data for all crops
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
    distanceKm: 50,
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
    distanceKm: 200,
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
    distanceKm: 50,
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
    distanceKm: 150,
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
    distanceKm: 330,
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
    distanceKm: 250,
    priceHistory: [2000, 2050, 2100, 2150, 2180, 2200, 2250, 2300, 2350, 2400, 2500, 2200]
  },
];

interface RTDataPoint {
  time: string;
  price: number;
  volume: number;
  trend: 'up' | 'down' | 'stable';
}

// Generate real-time data updates
const generateRTData = (basePrice: number): RTDataPoint[] => {
  const data: RTDataPoint[] = [];
  const now = new Date();
  
  for (let i = 23; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    const variance = (Math.random() - 0.5) * 4;
    const price = Math.max(basePrice - 5, basePrice + variance);
    
    data.push({
      time: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      price: Math.round(price * 10) / 10,
      volume: Math.round(Math.random() * 500 + 200),
      trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable'
    });
  }
  
  return data;
};

const TrendGraph = ({ priceHistory, width = 320, height = 200 }: { priceHistory: number[], width?: number, height?: number }) => {
  const padding = 30;
  const graphHeight = height - 2 * padding;
  const graphWidth = width - 2 * padding;
  
  if (priceHistory.length < 2) return null;

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

export default function CropDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [rtData, setRtData] = useState<RTDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Distance matrix based on user location and market location (simplified)
  const distanceMatrix: { [key: string]: { [key: string]: number } } = {
    'Pune': { 'Pune': 0, 'Nashik': 200, 'Mumbai': 150, 'Ratnagiri': 350, 'Nagpur': 650 },
    'Nashik': { 'Pune': 200, 'Nashik': 0, 'Mumbai': 300, 'Ratnagiri': 400, 'Nagpur': 450 },
    'Mumbai': { 'Pune': 150, 'Nashik': 300, 'Mumbai': 0, 'Ratnagiri': 200, 'Nagpur': 750 },
    'Ratnagiri': { 'Pune': 350, 'Nashik': 400, 'Mumbai': 200, 'Ratnagiri': 0, 'Nagpur': 850 },
    'Nagpur': { 'Pune': 650, 'Nashik': 450, 'Mumbai': 750, 'Ratnagiri': 850, 'Nagpur': 0 },
    'default': { 'Pune': 280, 'Nashik': 350, 'Mumbai': 400, 'Ratnagiri': 450, 'Nagpur': 600 },
  };

  const getCalculatedDistance = (): number => {
    const foundCrop = mockCropData.find(c => c.id === id);
    
    if (foundCrop && user?.profile?.location?.district) {
      const userDistrict = user.profile.location.district;
      const marketLocation = foundCrop.location;
      
      const matrix = distanceMatrix[userDistrict] || distanceMatrix['default'];
      return matrix[marketLocation] || 280;
    }
    
    return 0; // Return 0 if no user location, will use fallback in display
  };

  const calculatedDistance = getCalculatedDistance();
  
  const crop = useMemo(() => {
    const foundCrop = mockCropData.find(c => c.id === id);
    return foundCrop;
  }, [id]);

  useEffect(() => {
    if (crop) {
      // Simulate loading real-time data
      setTimeout(() => {
        setRtData(generateRTData(crop.modalPrice));
        setIsLoading(false);
      }, 500);
    }
  }, [crop]);

  // Simulate real-time updates
  useEffect(() => {
    if (!isLoading && crop) {
      const interval = setInterval(() => {
        setRtData(prev => {
          const newData = [...prev];
          const variance = (Math.random() - 0.5) * 2;
          const newPrice = Math.max(crop.modalPrice - 5, crop.modalPrice + variance);
          
          newData.push({
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            price: Math.round(newPrice * 10) / 10,
            volume: Math.round(Math.random() * 500 + 200),
            trend: Math.random() > 0.5 ? 'up' : 'down'
          });
          
          // Keep only last 24 hours
          if (newData.length > 24) {
            newData.shift();
          }
          
          return newData;
        });
      }, 10000); // Update every 10 seconds
      
      return () => clearInterval(interval);
    }
  }, [isLoading, crop]);

  if (!crop) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Crop not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <FontAwesome name="arrow-left" size={20} color="#1F2937" />
          </TouchableOpacity>
        </View>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Loading real-time data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const priceHistory = rtData.map(d => d.price);
  const avgPrice = rtData.length > 0 ? Math.round(rtData.reduce((a, b) => a + b.price, 0) / rtData.length * 10) / 10 : crop.modalPrice;
  const highPrice = rtData.length > 0 ? Math.max(...priceHistory) : crop.maxPrice;
  const lowPrice = rtData.length > 0 ? Math.min(...priceHistory) : crop.minPrice;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome name="arrow-left" size={20} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{crop.cropName} Details</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        {/* Crop Header Card */}
        <View style={styles.headerCard}>
          <Image 
            source={{ uri: crop.imageUrl || 'https://picsum.photos/seed/default/200/200' }} 
            style={styles.cropImage}
          />
          <View style={styles.cropInfo}>
            <Text style={styles.cropName}>{crop.cropName}</Text>
            <Text style={styles.variety}>{crop.variety}</Text>
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{crop.category}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: '#fef3c7' }]}>
                <Text style={[styles.badgeText, { color: '#d97706' }]}>
                  {calculatedDistance > 0 ? calculatedDistance : crop.distanceKm} km away
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Current Price Section */}
        <View style={styles.priceCard}>
          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceLabel}>Current Price</Text>
              <Text style={styles.currentPrice}>₹{crop.modalPrice}/{crop.priceUnit}</Text>
            </View>
            <View style={[styles.statusBadge, {
              backgroundColor: crop.modalPrice > avgPrice ? '#dcfce7' : '#fee2e2'
            }]}>
              <MaterialIcons 
                name={crop.modalPrice > avgPrice ? "trending-up" : "trending-down"}
                size={16}
                color={crop.modalPrice > avgPrice ? "#22c55e" : "#ef4444"}
              />
              <Text style={[styles.statusText, {
                color: crop.modalPrice > avgPrice ? "#22c55e" : "#ef4444"
              }]}>
                {crop.modalPrice > avgPrice ? '+' : ''}{Math.round(((crop.modalPrice - avgPrice) / avgPrice) * 100)}%
              </Text>
            </View>
          </View>

          <View style={styles.priceStatsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>High (24h)</Text>
              <Text style={styles.statValue}>₹{highPrice}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Low (24h)</Text>
              <Text style={styles.statValue}>₹{lowPrice}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Avg Price</Text>
              <Text style={styles.statValue}>₹{avgPrice}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Range</Text>
              <Text style={styles.statValue}>₹{Math.round((highPrice - lowPrice) * 10) / 10}</Text>
            </View>
          </View>
        </View>

        {/* Real-Time Price Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>24-Hour Price Trend (Real-Time)</Text>
            <View style={styles.updateIndicator}>
              <View style={styles.updateDot} />
              <Text style={styles.updateText}>Live</Text>
            </View>
          </View>
          <View style={styles.chartContainer}>
            <TrendGraph priceHistory={priceHistory} width={320} height={200} />
          </View>
        </View>

        {/* Market Details */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Market Details</Text>
          
          <View style={styles.detailRow}>
            <FontAwesome name="shopping-basket" size={16} color="#2E7D32" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Market</Text>
              <Text style={styles.detailValue}>{crop.marketName}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <FontAwesome name="map-marker" size={16} color="#2E7D32" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>{crop.location}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <FontAwesome name="location-arrow" size={16} color="#2E7D32" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Supply Address</Text>
              <Text style={styles.detailValue}>{crop.supplyAddress}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <FontAwesome name="envelope" size={16} color="#2E7D32" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>PIN Code</Text>
              <Text style={styles.detailValue}>{crop.pinCode}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <FontAwesome name="truck" size={16} color="#2E7D32" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Transport Cost</Text>
              <Text style={styles.detailValue}>{crop.transportCost}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <FontAwesome name="road" size={16} color="#2E7D32" />
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Distance</Text>
              <Text style={styles.detailValue}>
                {calculatedDistance > 0 
                  ? `${calculatedDistance} km from your location` 
                  : `${crop.distanceKm} km`}
              </Text>
            </View>
          </View>
        </View>

        {/* Real-Time Data Table */}
        <View style={styles.dataTableCard}>
          <Text style={styles.sectionTitle}>Real-Time Price Updates</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Time</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Price (₹)</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Volume</Text>
            <Text style={[styles.tableHeaderCell, { flex: 0.8 }]}>Trend</Text>
          </View>
          
          {rtData.slice().reverse().slice(0, 10).map((data, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 1 }]}>{data.time}</Text>
              <Text style={[styles.tableCell, { flex: 1, fontWeight: '600' }]}>₹{data.price}</Text>
              <Text style={[styles.tableCell, { flex: 1, color: '#6B7280' }]}>{data.volume} units</Text>
              <View style={[styles.tableCell, { flex: 0.8, alignItems: 'center' }]}>
                {data.trend === 'up' && <MaterialIcons name="trending-up" size={14} color="#22c55e" />}
                {data.trend === 'down' && <MaterialIcons name="trending-down" size={14} color="#ef4444" />}
                {data.trend === 'stable' && <MaterialIcons name="trending-flat" size={14} color="#6B7280" />}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.spacer} />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerPlaceholder: {
    width: 36,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  headerCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.05)',
    gap: 12,
  },
  cropImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  cropInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  cropName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  variety: {
    fontSize: 14,
    color: '#6B7280',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  badge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803d',
  },
  priceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.05)',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  priceLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  currentPrice: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2E7D32',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  priceStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.05)',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  updateIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  updateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  updateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803d',
  },
  chartContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.05)',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  dataTableCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.05)',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#F3F4F6',
    marginBottom: 8,
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 13,
    color: '#1F2937',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
  },
  spacer: {
    height: 20,
  },
});
