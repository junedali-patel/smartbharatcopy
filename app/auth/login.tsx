import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColor } from '../../hooks/useThemeColor';
import { router } from 'expo-router';
import { getAuth } from '../../config/firebase';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    // Skip if Firebase Auth is not available
    const authInstance = getAuth();
    if (!authInstance || typeof authInstance.onAuthStateChanged !== 'function') {
      return;
    }

    try {
      const unsubscribe = authInstance.onAuthStateChanged((user) => {
        if (user) {
          router.replace('/(tabs)');
        }
      });

      return unsubscribe;
    } catch (error) {
      console.warn('Failed to setup auth listener:', error);
    }
  }, []);

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      handleGoogleSignIn(credential);
    }
  }, [response]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const authInstance = getAuth();
    
    // Demo mode for Expo Go - allow login without Firebase
    if (!authInstance) {
      console.log('Demo Mode: Logging in without Firebase (Expo Go)');
      // Allow any email/password combination in demo mode
      if (email && password) {
        router.replace('/(tabs)');
        Alert.alert('Demo Mode', 'Logged in successfully (Demo - no Firebase)');
        return;
      }
    }

    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(authInstance, email, password);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async (credential: any) => {
    const authInstance = getAuth();
    if (!authInstance) {
      Alert.alert('Error', 'Firebase Auth is not available. Please use a development build.');
      return;
    }

    setIsLoading(true);
    try {
      await signInWithCredential(authInstance, credential);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        {/* Title and subtitle removed */}
      </View>

      <View style={styles.form}>
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

        <TouchableOpacity
          style={[styles.loginButton, { backgroundColor: accentColor }]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
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
            Don't have an account?
          </Text>
          <TouchableOpacity onPress={() => router.push('/auth/signup')}>
            <Text style={[styles.footerLink, { color: accentColor }]}> Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginTop: 20,
    marginBottom: 0,
    height: 0,
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
  loginButton: {
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
}); 