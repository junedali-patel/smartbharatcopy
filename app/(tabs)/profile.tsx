import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColor } from '../../hooks/useThemeColor';
import { auth, db } from '../../services/firebase';
import { doc, setDoc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import { FieldValue } from 'firebase/firestore';

type UserProfile = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  occupation: string;
  interests: string[];
  avatarUrl: string;
  createdAt: string | FieldValue;
  updatedAt: string | FieldValue;
}

const INTEREST_OPTIONS = [
  'Farming',
  'Technology',
  'Education',
  'Healthcare',
  'Environment',
  'Business',
  'Art & Culture',
  'Sports',
  'Travel',
  'Food & Cooking'
];

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const backgroundColor = '#f8f9fa';
  const cardBackground = '#ffffff';
  const textColor = useThemeColor({ light: '#2c3e50', dark: '#2c3e50' }, 'text');
  const accentColor = useThemeColor({ light: '#27ae60', dark: '#27ae60' }, 'tint');
  const borderColor = '#e9ecef';

  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    occupation: '',
    interests: [],
    avatarUrl: '',
    createdAt: '',
    updatedAt: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    console.log('ProfileScreen: Component mounted');
    setIsMounted(true);
    // Delay fetching profile to ensure component is fully mounted
    const timer = setTimeout(() => {
      fetchUserProfile();
    }, 100);
    
    return () => {
      clearTimeout(timer);
      setIsMounted(false);
    };
  }, []);

  // Cleanup effect to prevent navigation after unmount
  useEffect(() => {
    return () => {
      setIsMounted(false);
    };
  }, []);

  const safeNavigate = (route: '/auth/login') => {
    try {
      if (isMounted) {
        router.replace(route);
      }
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback: try to navigate after a short delay
      setTimeout(() => {
        try {
          router.replace(route);
        } catch (fallbackError) {
          console.error('Fallback navigation failed:', fallbackError);
        }
      }, 100);
    }
  };

  const fetchUserProfile = async () => {
    try {
      console.log('ProfileScreen: Fetching user profile...');
      if (!auth.currentUser) {
        console.log('ProfileScreen: No current user, redirecting to login');
        // Only navigate if component is mounted
        if (isMounted) {
          safeNavigate('/auth/login');
        }
        return;
      }

      console.log('ProfileScreen: Current user found:', auth.currentUser.uid);
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        console.log('ProfileScreen: User profile found in Firestore');
        const data = docSnap.data() as UserProfile;
        setProfile({
          ...data,
          interests: Array.isArray(data.interests) ? data.interests : []
        });
      } else {
        console.log('ProfileScreen: No user profile found, creating default profile');
        // Create a default profile if none exists
        const defaultProfile: UserProfile = {
          name: auth.currentUser.displayName || '',
          email: auth.currentUser.email || '',
          phone: '',
          address: '',
          city: '',
          state: '',
          pincode: '',
          occupation: '',
          interests: [],
          avatarUrl: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setProfile(defaultProfile);
      }
    } catch (error) {
      console.error('ProfileScreen: Error fetching profile:', error);
      setError('Failed to load profile data');
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    console.log('ProfileScreen: Sign out button pressed');
    
    try {
      console.log('ProfileScreen: Starting Firebase sign out...');
      await auth.signOut();
      console.log('ProfileScreen: Firebase sign out successful');
      
      // Navigate to login page
      console.log('ProfileScreen: Navigating to login...');
      router.replace('/auth/login');
      console.log('ProfileScreen: Navigation successful');
    } catch (error) {
      console.error('ProfileScreen: Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  const pickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please grant permission to access your photos in Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true, // Always get base64
      });
      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0].base64) {
        await uploadImageFromBase64(result.assets[0].base64);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadImageFromBase64 = async (base64Data: string) => {
    if (!auth.currentUser) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }
    try {
      setUploadingImage(true);
      const localImageUrl = `data:image/jpeg;base64,${base64Data}`;
      setProfile(prev => ({ ...prev, avatarUrl: localImageUrl }));
      await updateProfile({ avatarUrl: localImageUrl });
      Alert.alert('Success', 'Profile picture updated successfully!');
    } catch (error) {
      Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!auth.currentUser) {
      Alert.alert('Error', 'You must be logged in to update your profile');
      return;
    }
  
    try {
      setSaving(true);
      setError(null);
      
      // Validate required fields if needed
      if (updates.name && updates.name.trim().length < 2) {
        throw new Error('Name must be at least 2 characters long');
      }
  
      const userRef = doc(db, 'users', auth.currentUser.uid);
      
      // Only update if there are actual changes
      const hasChanges = Object.keys(updates).length > 0;
      
      if (hasChanges) {
        console.log('Updating profile with changes:', updates);
        
        // Prepare update data with timestamps
        const updateData: Partial<UserProfile> = {
          ...updates,
          updatedAt: serverTimestamp(),
        };
        
        // If this is a new user, set the createdAt timestamp
        if (!profile?.createdAt) {
          updateData.createdAt = serverTimestamp();
        }
        
        // Use setDoc with merge: true to create or update the document
        await setDoc(userRef, updateData, { merge: true });
        
        // Update local state with the new data
        setProfile(prev => ({
          ...prev,
          ...updates,
          updatedAt: new Date().toISOString(),
          // Only update createdAt if it's a new profile
          ...(!prev?.createdAt && { createdAt: new Date().toISOString() })
        }));
        
        // Show success message if not in development mode
        if (!__DEV__) {
          Alert.alert('Success', 'Profile updated successfully!');
        }
      } else {
        console.log('No changes to save');
      }

      setEditing(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      const errorMessage = error.message || 'Failed to update profile. Please try again.';
      setError(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const toggleInterest = (interest: string) => {
    setProfile(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={accentColor} />
          <Text style={[styles.loadingText, { color: textColor }]}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <View style={styles.errorContainer}>
          <FontAwesome name="exclamation-triangle" size={48} color="#e74c3c" />
          <Text style={[styles.errorText, { color: textColor }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: accentColor }]}
            onPress={fetchUserProfile}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Enhanced Profile Header */}
        <View style={[styles.header, { backgroundColor: cardBackground }]}>
          <View style={styles.headerContent}>
            <View style={{ flex: 1 }} />
            <Text style={[styles.headerTitle, { color: textColor, textAlign: 'center' }]}>My Profile</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                style={[styles.settingsButton, { marginRight: 10 }]}
                onPress={() => router.push('/settings')}
              >
                <FontAwesome name="cog" size={24} color={textColor} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: editing ? '#e74c3c' : accentColor }]}
                onPress={() => setEditing(!editing)}
              >
                <FontAwesome name={editing ? "times" : "edit"} size={16} color="#fff" />
                <Text style={styles.editButtonText}>
                  {editing ? 'Cancel' : 'Edit'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Enhanced Avatar Section */}
        <View style={[styles.avatarSection, { backgroundColor: cardBackground }]}>
          <TouchableOpacity
            style={[styles.avatarContainer, { borderColor }]}
            onPress={editing ? pickImage : undefined}
            disabled={!editing || uploadingImage}
          >
            {profile.avatarUrl && !profile.avatarUrl.includes('firebasestorage.googleapis.com') ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <FontAwesome name="user-circle" size={60} color={accentColor} />
                <Text style={[styles.avatarPlaceholderText, { color: textColor }]}>
                  {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            )}
            {editing && !uploadingImage && (
              <View style={styles.avatarOverlay}>
                <FontAwesome name="camera" size={24} color="#fff" />
                <Text style={styles.avatarOverlayText}>Tap to change</Text>
              </View>
            )}
            {uploadingImage && (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.avatarOverlayText}>Uploading...</Text>
              </View>
            )}
          </TouchableOpacity>
          
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: textColor }]}>
              {profile.name || 'Your Name'}
            </Text>
            <Text style={[styles.profileEmail, { color: '#7f8c8d' }]}>
              {profile.email}
            </Text>
            {profile.occupation && (
              <Text style={[styles.profileOccupation, { color: accentColor }]}>
                {profile.occupation}
              </Text>
            )}
          </View>
        </View>

        {/* Personal Information Card */}
        <View style={[styles.card, { backgroundColor: cardBackground }]}>
          <View style={styles.cardHeader}>
            <FontAwesome name="user" size={20} color={accentColor} />
            <Text style={[styles.cardTitle, { color: textColor }]}>Personal Information</Text>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: textColor }]}>Full Name</Text>
            <TextInput
              style={[styles.input, { color: textColor, borderColor }]}
              value={profile.name}
              onChangeText={(text) => setProfile(prev => ({ ...prev, name: text }))}
              editable={editing}
              placeholder="Enter your full name"
              placeholderTextColor="#bdc3c7"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: textColor }]}>Email</Text>
            <TextInput
              style={[styles.input, { color: textColor, borderColor, backgroundColor: '#f8f9fa' }]}
              value={profile.email}
              editable={false}
              placeholder="Your email address"
              placeholderTextColor="#bdc3c7"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: textColor }]}>Phone Number</Text>
            <TextInput
              style={[styles.input, { color: textColor, borderColor }]}
              value={profile.phone}
              onChangeText={(text) => setProfile(prev => ({ ...prev, phone: text }))}
              editable={editing}
              placeholder="Enter your phone number"
              placeholderTextColor="#bdc3c7"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: textColor }]}>Occupation</Text>
            <TextInput
              style={[styles.input, { color: textColor, borderColor }]}
              value={profile.occupation}
              onChangeText={(text) => setProfile(prev => ({ ...prev, occupation: text }))}
              editable={editing}
              placeholder="Enter your occupation"
              placeholderTextColor="#bdc3c7"
            />
          </View>
        </View>

        {/* Address Information Card */}
        <View style={[styles.card, { backgroundColor: cardBackground }]}>
          <View style={styles.cardHeader}>
            <FontAwesome name="map-marker" size={20} color={accentColor} />
            <Text style={[styles.cardTitle, { color: textColor }]}>Address Information</Text>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: textColor }]}>Address</Text>
            <TextInput
              style={[styles.input, { color: textColor, borderColor }]}
              value={profile.address}
              onChangeText={(text) => setProfile(prev => ({ ...prev, address: text }))}
              editable={editing}
              placeholder="Enter your address"
              placeholderTextColor="#bdc3c7"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.label, { color: textColor }]}>City</Text>
              <TextInput
                style={[styles.input, { color: textColor, borderColor }]}
                value={profile.city}
                onChangeText={(text) => setProfile(prev => ({ ...prev, city: text }))}
                editable={editing}
                placeholder="City"
                placeholderTextColor="#bdc3c7"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={[styles.label, { color: textColor }]}>State</Text>
              <TextInput
                style={[styles.input, { color: textColor, borderColor }]}
                value={profile.state}
                onChangeText={(text) => setProfile(prev => ({ ...prev, state: text }))}
                editable={editing}
                placeholder="State"
                placeholderTextColor="#bdc3c7"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: textColor }]}>Pincode</Text>
            <TextInput
              style={[styles.input, { color: textColor, borderColor }]}
              value={profile.pincode}
              onChangeText={(text) => setProfile(prev => ({ ...prev, pincode: text }))}
              editable={editing}
              placeholder="Enter your pincode"
              placeholderTextColor="#bdc3c7"
              keyboardType="number-pad"
            />
          </View>
        </View>

        {/* Interests Card */}
        <View style={[styles.card, { backgroundColor: cardBackground }]}>
          <View style={styles.cardHeader}>
            <FontAwesome name="heart" size={20} color={accentColor} />
            <Text style={[styles.cardTitle, { color: textColor }]}>Interests</Text>
          </View>
          <View style={styles.interestsContainer}>
            {INTEREST_OPTIONS.map((interest) => (
              <TouchableOpacity
                key={interest}
                style={[
                  styles.interestButton,
                  {
                    backgroundColor: profile.interests.includes(interest)
                      ? accentColor
                      : '#f8f9fa',
                    borderColor: profile.interests.includes(interest) ? accentColor : borderColor
                  }
                ]}
                onPress={() => editing && toggleInterest(interest)}
                disabled={!editing}
              >
                <Text
                  style={[
                    styles.interestText,
                    {
                      color: profile.interests.includes(interest)
                        ? '#fff'
                        : textColor
                    }
                  ]}
                >
                  {interest}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Settings Card */}
        <View style={[styles.card, { backgroundColor: cardBackground }]}>
          <View style={styles.cardHeader}>
            <FontAwesome name="cog" size={20} color={accentColor} />
            <Text style={[styles.cardTitle, { color: textColor }]}>Settings</Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.settingItem, { borderColor }]}
            onPress={() => Alert.alert('Coming Soon', 'Notifications settings will be available soon!')}
          >
            <View style={styles.settingContent}>
              <FontAwesome name="bell-o" size={22} color={textColor} />
              <Text style={[styles.settingText, { color: textColor }]}>Notifications</Text>
            </View>
            <FontAwesome name="angle-right" size={20} color="#bdc3c7" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.settingItem, { borderColor }]}
            onPress={() => Alert.alert('Coming Soon', 'Privacy settings will be available soon!')}
          >
            <View style={styles.settingContent}>
              <FontAwesome name="shield" size={22} color={textColor} />
              <Text style={[styles.settingText, { color: textColor }]}>Privacy</Text>
            </View>
            <FontAwesome name="angle-right" size={20} color="#bdc3c7" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.settingItem, { borderColor }]}
            onPress={() => Alert.alert('Coming Soon', 'Language settings will be available soon!')}
          >
            <View style={styles.settingContent}>
              <FontAwesome name="globe" size={22} color={textColor} />
              <Text style={[styles.settingText, { color: textColor }]}>Language</Text>
            </View>
            <FontAwesome name="angle-right" size={20} color="#bdc3c7" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.settingItem, { borderColor }]}
            onPress={() => Alert.alert('Coming Soon', 'Help & Support will be available soon!')}
          >
            <View style={styles.settingContent}>
              <FontAwesome name="life-ring" size={22} color={textColor} />
              <Text style={[styles.settingText, { color: textColor }]}>Help & Support</Text>
            </View>
            <FontAwesome name="angle-right" size={20} color="#bdc3c7" />
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        {editing && (
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: accentColor }]}
            onPress={() => updateProfile(profile)}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <FontAwesome name="save" size={16} color="#fff" />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Sign Out Button */}
        <TouchableOpacity
          style={[styles.signOutButton, { borderColor }]}
          onPress={handleSignOut}
        >
          <FontAwesome name="sign-out" size={16} color="#e74c3c" />
          <Text style={[styles.signOutText, { color: '#e74c3c' }]}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  settingsButton: {
    padding: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  avatarOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlayText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  avatarLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    marginBottom: 4,
  },
  profileOccupation: {
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  interestText: {
    fontSize: 14,
    fontWeight: '500',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  retryButton: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});