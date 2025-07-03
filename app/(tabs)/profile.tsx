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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColor } from '../../hooks/useThemeColor';
import { auth, db } from '../../services/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface UserProfile {
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
  createdAt: string;
  updatedAt: string;
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

export default function ProfileScreen() {
  const backgroundColor = '#ffffff';
  const cardBackground = '#ffffff';
  const textColor = useThemeColor({ light: '#333333', dark: '#333333' }, 'text');
  const accentColor = useThemeColor({ light: '#2E7D32', dark: '#2E7D32' }, 'tint');
  const borderColor = '#e0e0e0';

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
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      if (!auth.currentUser) {
        router.replace('/(auth)/login');
        return;
      }

      const userRef = doc(db, 'users', auth.currentUser.uid);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setProfile({
          ...data,
          interests: Array.isArray(data.interests) ? data.interests : []
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant permission to access your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      try {
        setSaving(true);
        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();
        const storage = getStorage();
        const storageRef = ref(storage, `avatars/${auth.currentUser?.uid}`);
        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);
        
        setProfile(prev => ({ ...prev, avatarUrl: downloadURL }));
        await updateProfile({ avatarUrl: downloadURL });
      } catch (error) {
        console.error('Error uploading image:', error);
        Alert.alert('Error', 'Failed to upload image');
      } finally {
        setSaving(false);
      }
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!auth.currentUser) return;

    try {
      setSaving(true);
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const profileUpdates = {
        ...updates,
        interests: Array.isArray(updates.interests) ? updates.interests : [],
        updatedAt: new Date().toISOString()
      };
      await updateDoc(userRef, profileUpdates);
      setProfile(prev => ({ ...prev, ...profileUpdates }));
      setEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
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
        <ActivityIndicator size="large" color={accentColor} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <Text style={[styles.headerTitle, { color: textColor }]}>Profile</Text>
          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: editing ? '#e53935' : accentColor }]}
            onPress={() => setEditing(!editing)}
          >
            <Text style={styles.editButtonText}>
              {editing ? 'Cancel' : 'Edit'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={[styles.avatarContainer, { borderColor }]}
            onPress={editing ? pickImage : undefined}
            disabled={!editing}
          >
            {profile.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
            ) : (
              <FontAwesome name="user-circle" size={80} color={accentColor} />
            )}
            {editing && (
              <View style={styles.avatarOverlay}>
                <FontAwesome name="camera" size={24} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
          {saving && (
            <ActivityIndicator size="small" color={accentColor} style={styles.avatarLoading} />
          )}
        </View>

        {/* Personal Information */}
        <View style={[styles.section, { borderColor }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Personal Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: textColor }]}>Full Name</Text>
            <TextInput
              style={[styles.input, { color: textColor, borderColor }]}
              value={profile.name}
              onChangeText={(text) => setProfile(prev => ({ ...prev, name: text }))}
              editable={editing}
              placeholder="Enter your full name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: textColor }]}>Email</Text>
            <TextInput
              style={[styles.input, { color: textColor, borderColor }]}
              value={profile.email}
              editable={false}
              placeholder="Your email address"
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
            />
          </View>
        </View>

        {/* Address Information */}
        <View style={[styles.section, { borderColor }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Address Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: textColor }]}>Address</Text>
            <TextInput
              style={[styles.input, { color: textColor, borderColor }]}
              value={profile.address}
              onChangeText={(text) => setProfile(prev => ({ ...prev, address: text }))}
              editable={editing}
              placeholder="Enter your address"
              multiline
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: textColor }]}>City</Text>
            <TextInput
              style={[styles.input, { color: textColor, borderColor }]}
              value={profile.city}
              onChangeText={(text) => setProfile(prev => ({ ...prev, city: text }))}
              editable={editing}
              placeholder="Enter your city"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: textColor }]}>State</Text>
            <TextInput
              style={[styles.input, { color: textColor, borderColor }]}
              value={profile.state}
              onChangeText={(text) => setProfile(prev => ({ ...prev, state: text }))}
              editable={editing}
              placeholder="Enter your state"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: textColor }]}>Pincode</Text>
            <TextInput
              style={[styles.input, { color: textColor, borderColor }]}
              value={profile.pincode}
              onChangeText={(text) => setProfile(prev => ({ ...prev, pincode: text }))}
              editable={editing}
              placeholder="Enter your pincode"
              keyboardType="number-pad"
            />
          </View>
        </View>

        {/* Interests */}
        <View style={[styles.section, { borderColor }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Interests</Text>
          <View style={styles.interestsContainer}>
            {INTEREST_OPTIONS.map((interest) => (
              <TouchableOpacity
                key={interest}
                style={[
                  styles.interestButton,
                  {
                    backgroundColor: profile.interests.includes(interest)
                      ? accentColor
                      : '#f5f5f5',
                    borderColor
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

        {/* Settings Section */}
        <View style={[styles.section, { borderColor }]}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Settings</Text>
          
          <TouchableOpacity 
            style={[styles.settingItem, { borderColor }]}
            onPress={() => {/* Handle notifications settings */}}
          >
            <View style={styles.settingContent}>
              <FontAwesome name="bell-o" size={22} color={textColor} />
              <Text style={[styles.settingText, { color: textColor }]}>Notifications</Text>
            </View>
            <FontAwesome name="angle-right" size={20} color={textColor} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.settingItem, { borderColor }]}
            onPress={() => {/* Handle privacy settings */}}
          >
            <View style={styles.settingContent}>
              <FontAwesome name="shield" size={22} color={textColor} />
              <Text style={[styles.settingText, { color: textColor }]}>Privacy</Text>
            </View>
            <FontAwesome name="angle-right" size={20} color={textColor} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.settingItem, { borderColor }]}
            onPress={() => {/* Handle language settings */}}
          >
            <View style={styles.settingContent}>
              <FontAwesome name="globe" size={22} color={textColor} />
              <Text style={[styles.settingText, { color: textColor }]}>Language</Text>
            </View>
            <FontAwesome name="angle-right" size={20} color={textColor} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.settingItem, { borderColor }]}
            onPress={() => {/* Handle help & support */}}
          >
            <View style={styles.settingContent}>
              <FontAwesome name="life-ring" size={22} color={textColor} />
              <Text style={[styles.settingText, { color: textColor }]}>Help & Support</Text>
            </View>
            <FontAwesome name="angle-right" size={20} color={textColor} />
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
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Sign Out Button */}
        <TouchableOpacity
          style={[styles.signOutButton, { borderColor }]}
          onPress={handleSignOut}
        >
          <Text style={[styles.signOutText, { color: '#e53935' }]}>Sign Out</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  avatarSection: {
    alignItems: 'center',
    padding: 20,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  section: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
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
    marginBottom: 16,
    color: '#666',
  },
  saveButton: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
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
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
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
  },
  settingText: {
    fontSize: 16,
    marginLeft: 12,
  },
});