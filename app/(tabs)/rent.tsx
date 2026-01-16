import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, BorderRadius } from '../../constants/newDesignSystem';
import { StyledCard, Heading1, Heading2, BodyText } from '../../components/StyledComponents';
import equipmentService, { Equipment } from '../../services/equipmentService';
import AddEquipmentModal from '../../components/AddEquipmentModal';

export default function RentScreen() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await equipmentService.getAllEquipment();
      setEquipment(data.sort((a, b) => {
        // Sort by status: Available first, then Rented, then Maintenance
        const statusOrder = { 'Available': 0, 'Rented': 1, 'Maintenance': 2 };
        return statusOrder[a.status] - statusOrder[b.status];
      }));
    } catch (err) {
      console.error('Error fetching equipment:', err);
      setError('Failed to load equipment. Please try again.');
      Alert.alert('Error', 'Failed to load equipment listings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchEquipment();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available':
        return { bg: '#22c55e', text: 'Available' };
      case 'Rented':
        return { bg: '#3b82f6', text: 'Rented' };
      case 'Maintenance':
        return { bg: '#f59e0b', text: 'Maintenance' };
      default:
        return { bg: '#6b7280', text: status };
    }
  };

  const totalEarnings = equipment.reduce((sum, item) => sum + item.dailyRate, 0);
  const activeBookings = equipment.filter(e => e.status === 'Rented').length;
  const availableEquipment = equipment.filter(e => e.status === 'Available').length;

  const handleAddEquipment = () => {
    Alert.alert('Add Equipment', 'Open form to add new equipment', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Add',
        onPress: () => router.push('/(tabs)/profile'),
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: Colors.background.light }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <BodyText style={{ marginTop: 16, color: Colors.text.primary }}>Loading equipment...</BodyText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.background.light }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
          <Heading2 style={{ color: Colors.text.primary }}>My Equipment</Heading2>
          <TouchableOpacity style={styles.moreBtn}>
            <MaterialIcons name="more-vert" size={24} color={Colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Stats Card */}
        <View style={[styles.statsCard]}>
          <View style={styles.statsTop}>
            <View>
              <BodyText style={styles.statsLabel}>Available Items</BodyText>
              <Heading1 style={{ color: '#fff', marginTop: 4 }}>{availableEquipment}</Heading1>
            </View>
            <View style={styles.statsIcon}>
              <MaterialIcons name="agriculture" size={32} color="#fff" />
            </View>
          </View>

          <View style={styles.statsDivider} />

          <View style={styles.statsBottom}>
            <View style={styles.statItem}>
              <BodyText style={styles.statsSmallLabel}>Active Rentals</BodyText>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 4 }}>{activeBookings}</Text>
            </View>
            <View style={styles.statsVerticalDivider} />
            <View style={styles.statItem}>
              <BodyText style={styles.statsSmallLabel}>Total Items</BodyText>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 4 }}>{equipment.length}</Text>
            </View>
          </View>
        </View>

        {/* Equipment List */}
        <View style={styles.listHeader}>
          <Heading2 style={{ color: Colors.text.primary }}>All Equipment ({equipment.length})</Heading2>
          {equipment.length > 0 && (
            <TouchableOpacity onPress={handleRefresh}>
              <MaterialIcons name="refresh" size={24} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {equipment.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="agriculture" size={48} color={Colors.text.tertiary} />
            <BodyText style={{ marginTop: 12, color: Colors.text.secondary }}>
              No equipment available
            </BodyText>
            <BodyText style={{ marginTop: 4, color: Colors.text.tertiary, fontSize: 12 }}>
              Check back soon for new listings
            </BodyText>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {equipment.map((item) => {
              const statusColor = getStatusColor(item.status);
              return (
                <StyledCard
                  key={item.id}
                  style={styles.equipmentCard}
                  onPress={() => {
                    Alert.alert('Equipment Details', `${item.name}\n₹${item.dailyRate}/day\n${item.location}`, [
                      { text: 'Close', onPress: () => {} },
                      { text: 'Contact', onPress: () => Alert.alert('Contact', `Call: ${item.phone}`) },
                    ]);
                  }}
                >
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {/* Equipment Image Placeholder */}
                    <View style={[styles.equipmentImage, item.status === 'Maintenance' && { opacity: 0.6 }]}>
                      <View style={styles.imagePlaceholder}>
                        <MaterialIcons
                          name={
                            item.category === 'Tractor' ? 'agriculture' :
                            item.category === 'Harvester' ? 'handyman' :
                            item.category === 'Sprayer' ? 'water-drop' : 'construction'
                          }
                          size={32}
                          color={Colors.primary}
                        />
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: statusColor.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: statusColor.text }]}>{item.status}</Text>
                      </View>
                    </View>

                    {/* Equipment Details */}
                    <View style={{ flex: 1, justifyContent: 'space-between' }}>
                      <View>
                        <Heading2 style={{ color: Colors.text.primary, marginBottom: 4 }} numberOfLines={1}>
                          {item.name}
                        </Heading2>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                          <MaterialIcons name="location-on" size={14} color={Colors.text.tertiary} />
                          <BodyText style={{ color: Colors.text.secondary, fontSize: 12 }}>
                            {item.city}, {item.state}
                          </BodyText>
                        </View>
                        {item.category && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <MaterialIcons name="category" size={12} color={Colors.text.tertiary} />
                            <BodyText style={{ color: Colors.text.tertiary, fontSize: 11 }}>
                              {item.category}
                            </BodyText>
                          </View>
                        )}
                      </View>

                      {/* Price and Rating */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <View>
                          <BodyText style={{ color: Colors.text.tertiary, fontSize: 11, fontWeight: '600' }}>
                            DAILY RATE
                          </BodyText>
                          <Text style={{ color: Colors.primary, fontSize: 16, fontWeight: 'bold', marginTop: 2 }}>
                            ₹{item.dailyRate.toLocaleString()}
                          </Text>
                        </View>
                        {item.rating > 0 && (
                          <View style={{ alignItems: 'flex-end' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                              <MaterialIcons name="star" size={14} color="#fbbf24" />
                              <Text style={{ color: Colors.text.primary, fontSize: 12, fontWeight: '600' }}>
                                {item.rating.toFixed(1)}
                              </Text>
                            </View>
                            <BodyText style={{ color: Colors.text.tertiary, fontSize: 10 }}>
                              {item.totalBookings} bookings
                            </BodyText>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </StyledCard>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* FAB - List New Item */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
        <MaterialIcons name="add" size={28} color="#fff" />
        <Text style={styles.fabText}>List Equipment</Text>
      </TouchableOpacity>

      {/* Add Equipment Modal */}
      <AddEquipmentModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={(newEquipment) => {
          setEquipment([newEquipment, ...equipment]);
        }}
      />
    </SafeAreaView>
  );
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Available':
      return { bg: '#d1fae5', text: '#065f46' };
    case 'Rented':
      return { bg: '#fed7aa', text: '#92400e' };
    case 'Maintenance':
      return { bg: '#fecaca', text: '#7f1d1d' };
    default:
      return { bg: '#e5e7eb', text: '#374151' };
  }
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: { paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  moreBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  statsCard: {
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.primary,
  },
  statsTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statsLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '500' },
  statsIcon: { backgroundColor: 'rgba(255,255,255,0.15)', padding: 8, borderRadius: BorderRadius.default },
  statsDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 12 },
  statsBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: { flex: 1 },
  statsSmallLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  statsVerticalDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 12 },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  equipmentCard: {
    marginHorizontal: 16,
    marginBottom: 0,
  },
  equipmentImage: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.default,
    backgroundColor: Colors.background.light,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusBadgeText: { fontSize: 9, fontWeight: 'bold', textTransform: 'uppercase' },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 30,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
