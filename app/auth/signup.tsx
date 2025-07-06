import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColor } from '../../hooks/useThemeColor';
import { router } from 'expo-router';
import { auth } from '../../services/firebase';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useLanguage } from '../../contexts/LanguageContext';

WebBrowser.maybeCompleteAuthSession();

export default function SignupScreen() {
  const { language, toggleLanguage, t } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: '383010531150-qn3ajb63pb600jieb60svqr575rrth6d.apps.googleusercontent.com',
    redirectUri: 'smartbharat://',
    scopes: ['profile', 'email'],
  });

  // Use white background for all layouts
  const backgroundColor = '#ffffff';
  const cardBackground = '#ffffff';
  const textColor = useThemeColor({ light: '#333333', dark: '#333333' }, 'text');
  const secondaryTextColor = useThemeColor({ light: '#666', dark: '#666' }, 'text');
  const accentColor = useThemeColor({ light: '#2E7D32', dark: '#2E7D32' }, 'tint');
  const borderColor = '#e0e0e0';

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        router.replace('/(tabs)');
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      handleGoogleSignUp(credential);
    }
  }, [response]);

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create user profile in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        name,
        email,
        createdAt: new Date().toISOString(),
        notificationsEnabled: true,
        darkModeEnabled: false,
        voiceAssistantEnabled: true,
      });

      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async (credential: any) => {
    setIsLoading(true);
    try {
      const result = await signInWithCredential(auth, credential);
      const user = result.user;

      // Create user profile in Firestore if it doesn't exist
      const userDoc = doc(db, 'users', user.uid);
      await setDoc(userDoc, {
        name: user.displayName,
        email: user.email,
        createdAt: new Date().toISOString(),
        notificationsEnabled: true,
        darkModeEnabled: false,
        voiceAssistantEnabled: true,
      }, { merge: true });

      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <TouchableOpacity 
        style={styles.languageButton}
        onPress={toggleLanguage}
      >
        <Text style={styles.languageButtonText}>
          {language === 'en' ? 'हिंदी' : 'English'}
        </Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={[styles.title, { color: textColor }]}>{t('createAccount')}</Text>
        <Text style={[styles.subtitle, { color: secondaryTextColor }]}>
          {t('signUpToStart')}
        </Text>
      </View>

      <View style={styles.form}>
        <View style={[styles.inputContainer, { borderColor }]}>
          <MaterialIcons name="person" size={20} color={secondaryTextColor} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: textColor }]}
            placeholder="Full Name"
            placeholderTextColor={secondaryTextColor}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={[styles.inputContainer, { borderColor }]}>
          <MaterialIcons name="email" size={20} color={secondaryTextColor} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: textColor }]}
            placeholder="Email"
            placeholderTextColor={secondaryTextColor}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={[styles.inputContainer, { borderColor }]}>
          <MaterialIcons name="lock" size={20} color={secondaryTextColor} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: textColor }]}
            placeholder="Password"
            placeholderTextColor={secondaryTextColor}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <View style={[styles.inputContainer, { borderColor }]}>
          <MaterialIcons name="lock" size={20} color={secondaryTextColor} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: textColor }]}
            placeholder="Confirm Password"
            placeholderTextColor={secondaryTextColor}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[styles.signupButton, { backgroundColor: accentColor }]}
          onPress={handleSignup}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Sign Up</Text>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
          <Text style={[styles.dividerText, { color: secondaryTextColor }]}>OR</Text>
          <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
        </View>

        <TouchableOpacity
          style={[styles.googleButton, { borderColor }]}
          onPress={() => promptAsync()}
          disabled={isLoading || !request}
        >
          <MaterialIcons name="g-translate" size={24} color="#DB4437" />
          <Text style={[styles.googleButtonText, { color: textColor }]}>
            Continue with Google
          </Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: secondaryTextColor }]}>
            Already have an account?
          </Text>
          <TouchableOpacity onPress={() => router.push('/auth/login')}>
            <Text style={[styles.footerLink, { color: accentColor }]}> Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// Add these styles to your StyleSheet
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginTop: 60,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
  },
  signupButton: {
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 14,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  languageButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    padding: 10,
    backgroundColor: '#2E7D32',
    borderRadius: 8,
  },
  languageButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});