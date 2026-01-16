import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getDb, getAuth } from '../../config/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { FieldValue } from 'firebase/firestore';
import FirestoreImageService from '../../services/firestoreImageService';
import { Colors, Spacing, BorderRadius } from '../../constants/newDesignSystem';
import { StyledCard, Heading2, BodyText } from '../../components/StyledComponents';

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
};

const INTEREST_OPTIONS = [
  'Farming', 'Technology', 'Education', 'Healthcare', 'Environment',
  'Business', 'Art & Culture', 'Sports', 'Travel', 'Food & Cooking'
];

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile>({
    name: '', email: '', phone: '', address: '', city: '', state: '',
    pincode: '', occupation: '', interests: [], avatarUrl: '', createdAt: '', updatedAt: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [avatarDataUri, setAvatarDataUri] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
    const timer = setTimeout(() => fetchUserProfile(), 100);
    return () => {
      clearTimeout(timer);
      setIsMounted(false);
    };
  }, []);

  const fetchUserProfile = async () => {
    try {
      const auth = getAuth();
      if (!auth || !auth.currentUser) {
        if (isMounted) router.replace('/auth/login');
        return;
      }
      
      const db = getDb();
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setProfile({ ...data, interests: Array.isArray(data.interests) ? data.interests : [] });
        
        if (data.avatarUrl && !data.avatarUrl.includes('://')) {
          const imageService = FirestoreImageService.getInstance();
          const imageUri = await imageService.getImage(data.avatarUrl);
          if (imageUri) setAvatarDataUri(imageUri);
        }
      } else {
        const defaultProfile: UserProfile = {
          name: auth.currentUser.displayName || '',
          email: auth.currentUser.email || '',
          phone: '', address: '', city: '', state: '', pincode: '',
          occupation: '', interests: [], avatarUrl: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setProfile(defaultProfile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant permission to access your photos in Settings.');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });
      
      if (!result.canceled && result.assets?.[0].base64) {
        await uploadImageFromBase64(result.assets[0].base64);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const uploadImageFromBase64 = async (base64Data: string) => {
    setUploadingImage(true);
    try {
      const imageService = FirestoreImageService.getInstance();
      const imageId = await imageService.uploadImage(base64Data);
      setProfile(prev => ({ ...prev, avatarUrl: imageId }));
      setAvatarDataUri(`data:image/jpeg;base64,${base64Data}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const updateProfile = async () => {
    setSaving(true);
    try {
      const auth = getAuth();
      if (!auth?.currentUser) return;

      const db = getDb();
      const userRef = doc(db, 'users', auth.currentUser.uid);
      
      await setDoc(userRef, {
        ...profile,
        updatedAt: serverTimestamp(),
        createdAt: profile.createdAt || serverTimestamp(),
      }, { merge: true });

      Alert.alert('Success', 'Profile updated successfully!');
      setEditing(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const auth = getAuth();
      if (auth) await signOut(auth);
      router.replace('/auth/login');
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out.');
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
      <SafeAreaView style={[styles.container, { backgroundColor: Colors.background.light }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <BodyText style={{ marginTop: 16, color: Colors.text.primary }}>Loading profile...</BodyText>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: Colors.background.light }]}>
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={48} color={Colors.error} />
          <BodyText style={{ marginTop: 16, color: Colors.text.primary }}>{error}</BodyText>
          <TouchableOpacity style={[styles.retryBtn, { backgroundColor: Colors.primary }]} onPress={fetchUserProfile}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.background.light }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <Heading2 style={{ flex: 1, color: Colors.text.primary }}>My Profile</Heading2>
          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: editing ? Colors.error : Colors.primary }]}
            onPress={() => setEditing(!editing)}
          >
            <MaterialIcons name={editing ? "close" : "edit"} size={16} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: 'bold', marginLeft: 4 }}>{editing ? 'Cancel' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>

        {/* Avatar Section */}
        <StyledCard style={styles.avatarCard}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={editing ? pickImage : undefined}
            disabled={!editing || uploadingImage}
          >
            {avatarDataUri ? (
              <Image source={{ uri: avatarDataUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <MaterialIcons name="account-circle" size={60} color={Colors.primary} />
              </View>
            )}
            {editing && !uploadingImage && (
              <View style={styles.avatarOverlay}>
                <MaterialIcons name="add-a-photo" size={24} color="#fff" />
                <Text style={styles.avatarOverlayText}>Change</Text>
              </View>
            )}
            {uploadingImage && (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator size="large" color="#fff" />
              </View>
            )}
          </TouchableOpacity>
          
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Heading2 style={{ color: Colors.text.primary }}>{profile.name || 'Your Name'}</Heading2>
            <BodyText style={{ color: Colors.text.secondary, marginTop: 4 }}>
              {profile.occupation ? `${profile.occupation} • ` : ''}Member since 2023
            </BodyText>
            <BodyText style={{ color: Colors.text.tertiary, marginTop: 4 }}>{profile.email}</BodyText>
          </View>
        </StyledCard>

        {/* Personal Information Card */}
        <StyledCard style={styles.card}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="person" size={20} color={Colors.primary} />
            <Heading2 style={{ marginLeft: 8, color: Colors.text.primary }}>Personal Info</Heading2>
          </View>
          
          <InputField label="Full Name" value={profile.name} editable={editing} 
            onChangeText={(text) => setProfile(prev => ({ ...prev, name: text }))} />
          <InputField label="Email" value={profile.email} editable={false} onChangeText={() => {}} />
          <InputField label="Phone" value={profile.phone} editable={editing} 
            onChangeText={(text) => setProfile(prev => ({ ...prev, phone: text }))} />
          <InputField label="Occupation" value={profile.occupation} editable={editing} 
            onChangeText={(text) => setProfile(prev => ({ ...prev, occupation: text }))} />
          
          <View style={styles.twoColumns}>
            <InputField label="Farm Size (Acres)" value={profile.state} editable={editing}
              onChangeText={(text) => setProfile(prev => ({ ...prev, state: text }))} containerStyle={{ flex: 1 }} />
            <InputField label="Primary Crop" value={profile.pincode} editable={editing}
              onChangeText={(text) => setProfile(prev => ({ ...prev, pincode: text }))} containerStyle={{ flex: 1, marginLeft: 8 }} />
          </View>
        </StyledCard>

        {/* Farm Location Card */}
        <StyledCard style={styles.card}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="location-on" size={20} color={Colors.primary} />
            <Heading2 style={{ marginLeft: 8, color: Colors.text.primary }}>Farm Location</Heading2>
          </View>
          
          <InputField label="Address" value={profile.address} editable={editing} multiline
            onChangeText={(text) => setProfile(prev => ({ ...prev, address: text }))} />
          
          <View style={styles.twoColumns}>
            <InputField label="City" value={profile.city} editable={editing} containerStyle={{ flex: 1 }}
              onChangeText={(text) => setProfile(prev => ({ ...prev, city: text }))} />
            <InputField label="State" value={profile.state} editable={editing} containerStyle={{ flex: 1, marginLeft: 8 }}
              onChangeText={(text) => setProfile(prev => ({ ...prev, state: text }))} />
          </View>
          
          <InputField label="Pincode" value={profile.pincode} editable={editing}
            onChangeText={(text) => setProfile(prev => ({ ...prev, pincode: text }))} />
        </StyledCard>

        {/* Interests Card */}
        <StyledCard style={styles.card}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="favorite" size={20} color={Colors.primary} />
            <Heading2 style={{ marginLeft: 8, color: Colors.text.primary }}>Interests</Heading2>
          </View>
          
          <View style={styles.interestsContainer}>
            {INTEREST_OPTIONS.map((interest) => (
              <TouchableOpacity
                key={interest}
                disabled={!editing}
                style={[styles.interestBadge, {
                  backgroundColor: profile.interests.includes(interest) ? Colors.primary : Colors.background.light,
                  borderColor: profile.interests.includes(interest) ? Colors.primary : Colors.border,
                }]}
                onPress={() => toggleInterest(interest)}
              >
                <Text style={{
                  color: profile.interests.includes(interest) ? '#fff' : Colors.text.primary,
                  fontSize: 13,
                  fontWeight: '500',
                }}>
                  {interest}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </StyledCard>

        {/* Action Buttons */}
        {editing && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: Colors.primary }]}
            onPress={updateProfile}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <MaterialIcons name="save" size={20} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: 'bold', marginLeft: 8 }}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Sign Out Button */}
        <TouchableOpacity style={[styles.signOutBtn, { borderColor: Colors.error }]} onPress={handleSignOut}>
          <MaterialIcons name="logout" size={20} color={Colors.error} />
          <Text style={{ color: Colors.error, fontWeight: 'bold', marginLeft: 8 }}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function InputField({ label, value, editable, onChangeText, multiline, containerStyle }: {label: string; value: string; editable: boolean; onChangeText: (text: string) => void; multiline?: boolean; containerStyle?: any}) {
  return (
    <View style={[styles.inputGroup, containerStyle]}>
      <BodyText style={{ color: Colors.text.secondary, fontWeight: '600', marginBottom: 6 }}>{label}</BodyText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        style={[styles.input, { color: editable ? Colors.text.primary : Colors.text.tertiary }]}
        placeholderTextColor={Colors.text.tertiary}
        placeholder={`Enter ${label.toLowerCase()}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingVertical: 16, paddingBottom: 40 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16, gap: 8 },
  editBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.full, justifyContent: 'center' },
  retryBtn: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, borderRadius: BorderRadius.lg, alignItems: 'center' },
  avatarCard: { marginHorizontal: 16, marginVertical: 8, flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: Colors.primary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatar: { width: '100%', height: '100%' },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: `${Colors.primary}10`, width: '100%', height: '100%' },
  avatarOverlay: { position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  avatarOverlayText: { color: '#fff', fontSize: 11, fontWeight: 'bold', marginTop: 6 },
  card: { marginHorizontal: 16, marginVertical: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  inputGroup: { marginBottom: 12 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.lg, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: Colors.background.light },
  twoColumns: { flexDirection: 'row', marginBottom: 12 },
  interestsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  interestBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, marginVertical: 8, paddingVertical: 14, borderRadius: BorderRadius.lg },
  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, marginVertical: 8, paddingVertical: 14, borderRadius: BorderRadius.lg, borderWidth: 2 },
});
