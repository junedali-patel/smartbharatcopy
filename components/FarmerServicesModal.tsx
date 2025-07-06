import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, ScrollView, Image, Pressable, Dimensions, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
// Theme colors
const colors = {
  background: '#FFFFFF',
  cardBackground: '#FFFFFF',
  border: '#E0E0E0',
  text: '#333333',
  textSecondary: '#666666',
  primary: '#2E7D32',
  shadow: 'rgba(0, 0, 0, 0.1)'
};

// Types
type ServiceProvider = {
  id: string;
  name: string;
  contact: string;
  rating: number;
  price: string;
  location: string;
  available: boolean;
  image?: string;
};

type ServiceItem = {
  id: string;
  name: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  description: string;
  providers: ServiceProvider[];
};

// Mock Data
const services: ServiceItem[] = [
  {
    id: '1',
    name: 'Tractor Rental',
    icon: 'agriculture',
    description: 'Rent tractors and heavy machinery for your farming needs',
    providers: [
      {
        id: 'p1',
        name: 'Green Fields Tractor Services',
        contact: '+91 98765 43210',
        rating: 4.5,
        price: '₹1500/day',
        location: 'Vadodara, Gujarat',
        available: true,
        image: 'https://example.com/tractor1.jpg'
      },
      {
        id: 'p2',
        name: 'AgroTech Equipment',
        contact: '+91 87654 32109',
        rating: 4.2,
        price: '₹1800/day',
        location: 'Anand, Gujarat',
        available: true,
        image: 'https://example.com/tractor2.jpg'
      }
    ]
  },
  {
    id: '2',
    name: 'Irrigation Equipment',
    icon: 'water',
    description: 'Rent pumps, pipes, and other irrigation equipment',
    providers: [
      {
        id: 'p3',
        name: 'WaterPlus Solutions',
        contact: '+91 76543 21098',
        rating: 4.0,
        price: '₹800/day',
        location: 'Ahmedabad, Gujarat',
        available: true,
        image: 'https://example.com/pump1.jpg'
      }
    ]
  },
  {
    id: '3',
    name: 'Harvesting Tools',
    icon: 'content-cut',
    description: 'Rent modern harvesting tools and equipment',
    providers: [
      {
        id: 'p4',
        name: 'HarvestPro Tools',
        contact: '+91 65432 10987',
        rating: 4.3,
        price: '₹500/day',
        location: 'Surat, Gujarat',
        available: true,
        image: 'https://example.com/harvest1.jpg'
      }
    ]
  },
  {
    id: '4',
    name: 'Storage Solutions',
    icon: 'storage',
    description: 'Rent storage facilities for your produce',
    providers: [
      {
        id: 'p5',
        name: 'SafeStore Warehousing',
        contact: '+91 94321 09876',
        rating: 4.1,
        price: '₹2000/month',
        location: 'Rajkot, Gujarat',
        available: true,
        image: 'https://example.com/storage1.jpg'
      }
    ]
  },
  {
    id: '5',
    name: 'Transportation',
    icon: 'local-shipping',
    description: 'Arrange for transportation of your agricultural products',
    providers: [
      {
        id: 'p6',
        name: 'AgriTrans Logistics',
        contact: '+91 83210 98765',
        rating: 4.4,
        price: '₹15/km',
        location: 'Gandhinagar, Gujarat',
        available: true,
        image: 'https://example.com/truck1.jpg'
      }
    ]
  },
  {
    id: '6',
    name: 'Labor Services',
    icon: 'groups',
    description: 'Hire skilled labor for farming activities',
    providers: [
      {
        id: 'p7',
        name: 'KhetiMitra Labor Services',
        contact: '+91 98765 01234',
        rating: 4.0,
        price: '₹600/day',
        location: 'Vadodara, Gujarat',
        available: true,
        image: 'https://example.com/labor1.jpg'
      }
    ]
  },
];

interface FarmerServicesModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function FarmerServicesModal({ visible, onClose }: FarmerServicesModalProps) {
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);
  
  const backgroundColor = colors.background;
  const textColor = colors.text;
  const tintColor = colors.primary;
  const iconColor = colors.text;
  const cardBackground = colors.cardBackground;

  const handleServiceSelect = (service: ServiceItem) => {
    setSelectedService(service);
    setSelectedProvider(null);
  };

  const handleProviderSelect = (provider: ServiceProvider) => {
    setSelectedProvider(provider);
  };

  const handleBack = () => {
    if (selectedProvider) {
      setSelectedProvider(null);
    } else if (selectedService) {
      setSelectedService(null);
    } else {
      onClose();
    }
  };

  const renderServiceItem = (service: ServiceItem) => (
    <TouchableOpacity 
      key={service.id}
      onPress={() => handleServiceSelect(service)}
    >
      <View 
        style={[
          styles.serviceItem, 
          { 
            backgroundColor: cardBackground,
            borderColor: tintColor,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2,
          }
        ]}
      >
        <View style={[styles.serviceIconContainer, { backgroundColor: `${tintColor}20` }]}>
          <MaterialIcons name={service.icon} size={24} color={tintColor} />
        </View>
        <View style={styles.serviceInfo}>
          <Text style={[styles.serviceName, { color: textColor }]}>{service.name}</Text>
          <Text style={[styles.serviceDescription, { color: textColor, opacity: 0.7 }]}>
            {service.description}
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={textColor} />
      </View>
    </TouchableOpacity>
  );

  const renderProviderItem = (provider: ServiceProvider) => (
    <TouchableOpacity 
      key={provider.id}
      onPress={() => handleProviderSelect(provider)}
    >
      <View style={[styles.providerItem, { backgroundColor: cardBackground }]}>
        <View style={styles.providerImage}>
          <MaterialIcons name="store" size={40} color={tintColor} />
        </View>
        <View style={styles.providerInfo}>
          <Text style={[styles.providerName, { color: textColor }]}>{provider.name}</Text>
          <View style={styles.ratingContainer}>
            <MaterialIcons name="star" size={16} color="#FFD700" />
            <Text style={[styles.ratingText, { color: textColor }]}>{provider.rating}</Text>
          </View>
          <Text style={[styles.providerDetail, { color: textColor }]}>{provider.price}</Text>
          <Text style={[styles.providerLocation, { color: textColor, opacity: 0.7 }]}>
            <MaterialIcons name="location-on" size={14} color={tintColor} /> {provider.location}
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={textColor} />
      </View>
    </TouchableOpacity>
  );

  const renderProviderDetail = (provider: ServiceProvider) => (
    <View style={styles.providerDetailContainer}>
      <View style={styles.profileHeader}>
        <View style={[styles.profileImage, { backgroundColor: `${tintColor}20` }]}>
          <MaterialIcons name="store" size={60} color={tintColor} />
        </View>
        <Text style={[styles.providerName, { color: textColor, fontSize: 22, marginTop: 10 }]}>
          {provider.name}
        </Text>
        <View style={styles.ratingContainer}>
          <MaterialIcons name="star" size={20} color="#FFD700" />
          <Text style={[styles.ratingText, { color: textColor, fontSize: 16 }]}>
            {provider.rating} ({Math.floor(Math.random() * 100) + 1} reviews)
          </Text>
        </View>
      </View>

      <View style={styles.detailSection}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Service Details</Text>
        <View style={styles.detailRow}>
          <MaterialIcons name="attach-money" size={20} color={tintColor} />
          <Text style={[styles.detailText, { color: textColor }]}>
            <Text style={{ fontWeight: 'bold' }}>Price:</Text> {provider.price}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialIcons name="location-on" size={20} color={tintColor} />
          <Text style={[styles.detailText, { color: textColor }]}>
            <Text style={{ fontWeight: 'bold' }}>Location:</Text> {provider.location}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <MaterialIcons name="check-circle" size={20} color="#4CAF50" />
          <Text style={[styles.detailText, { color: textColor }]}>
            {provider.available ? 'Available Now' : 'Currently Unavailable'}
          </Text>
        </View>
      </View>

      <View style={styles.contactSection}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Contact Information</Text>
        <TouchableOpacity style={[styles.contactButton, { backgroundColor: tintColor }]} onPress={() => Linking.openURL(`tel:${provider.contact}`)}>
          <MaterialIcons name="phone" size={20} color="white" />
          <Text style={styles.contactButtonText}>Call {provider.contact}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.contactButton, { backgroundColor: '#34B7F1', marginTop: 10 }]} onPress={() => {
          const message = `Hello, I'm interested in your ${selectedService?.name} service.`;
          const url = `https://wa.me/${provider.contact.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
          Linking.openURL(url);
        }}>
          <MaterialIcons name="chat" size={20} color="white" />
          <Text style={styles.contactButtonText}>Chat on WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderContent = () => {
    if (selectedProvider) {
      return renderProviderDetail(selectedProvider);
    }
    
    if (selectedService) {
      return (
        <>
          <View style={styles.serviceHeader}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color={tintColor} />
              <Text style={[styles.backButtonText, { color: tintColor }]}>Back</Text>
            </TouchableOpacity>
            <Text style={[styles.sectionTitle, { color: textColor, marginLeft: 10 }]}>
              {selectedService.name}
            </Text>
          </View>
          <ScrollView style={styles.providersList}>
            {selectedService.providers.map(renderProviderItem)}
          </ScrollView>
        </>
      );
    }

    return (
      <ScrollView style={styles.servicesList}>
        {services.map(renderServiceItem)}
      </ScrollView>
    );
  };

  const getHeaderTitle = () => {
    if (selectedProvider) return selectedProvider.name;
    if (selectedService) return selectedService.name;
    return 'Farm Services & Rentals';
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { backgroundColor }]}>
          <View style={styles.modalHeader}>
            {(selectedService || selectedProvider) ? (
              <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <MaterialIcons name="arrow-back" size={24} color={tintColor} />
              </TouchableOpacity>
            ) : null}
            <Text style={[styles.modalTitle, { color: textColor, flex: 1, marginLeft: 10 }]}>
              {getHeaderTitle()}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={textColor} />
            </TouchableOpacity>
          </View>
          
          {renderContent()}
          
          {!selectedProvider && (
            <View style={styles.footer}>
              <Pressable 
                style={({ pressed }) => [
                  styles.requestButton,
                  { backgroundColor: tintColor, opacity: pressed ? 0.7 : 1 }
                ]}
                onPress={() => {
                  // Handle custom service request
                  console.log('Request custom service');
                }}
              >
                <Text style={styles.requestButtonText}>Request a Custom Service</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
    width: '100%',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 10,
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
  },
  closeButton: {
    padding: 5,
    marginLeft: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  },
  backButtonText: {
    marginLeft: 5,
    fontWeight: '600',
  },
  servicesList: {
    marginBottom: 20,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  serviceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: colors.text,
  },
  serviceDescription: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  // Provider List Styles
  providersList: {
    marginBottom: 20,
  },
  providerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  providerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    backgroundColor: 'rgb(255, 255, 255)',
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  providerDetail: {
    fontSize: 14,
    marginBottom: 2,
  },
  providerLocation: {
    fontSize: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
  },
  // Provider Detail Styles
  providerDetailContainer: {
    paddingBottom: 20,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    marginBottom: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailSection: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailText: {
    marginLeft: 10,
    fontSize: 15,
  },
  contactSection: {
    marginTop: 10,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  contactButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 10,
  },
  // Footer & Buttons
  footer: {
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  requestButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  requestButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
});