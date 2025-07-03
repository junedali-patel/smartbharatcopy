import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Switch, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeColor } from '../../hooks/useThemeColor';
import { router } from 'expo-router';

export default function SettingsScreen() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [voiceAssistantEnabled, setVoiceAssistantEnabled] = useState(true);

  // Use white background for all layouts
  const backgroundColor = '#ffffff';
  const cardBackground = '#ffffff';
  const textColor = useThemeColor({ light: '#333333', dark: '#333333' }, 'text');
  const secondaryTextColor = useThemeColor({ light: '#666', dark: '#666' }, 'text');
  const accentColor = useThemeColor({ light: '#2E7D32', dark: '#2E7D32' }, 'tint');
  const borderColor = '#e0e0e0';

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'Are you sure you want to clear all cached data?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          onPress: () => {
            // Implement cache clearing logic here
            Alert.alert('Success', 'Cache cleared successfully');
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: textColor }]}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Preferences</Text>
        <View style={[styles.settingItem, { borderColor }]}>
          <View style={styles.settingInfo}>
            <MaterialIcons name="notifications" size={24} color={textColor} />
            <Text style={[styles.settingText, { color: textColor }]}>Notifications</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#767577', true: accentColor }}
            thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={[styles.settingItem, { borderColor }]}>
          <View style={styles.settingInfo}>
            <MaterialIcons name="dark-mode" size={24} color={textColor} />
            <Text style={[styles.settingText, { color: textColor }]}>Dark Mode</Text>
          </View>
          <Switch
            value={darkModeEnabled}
            onValueChange={setDarkModeEnabled}
            trackColor={{ false: '#767577', true: accentColor }}
            thumbColor={darkModeEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>

        <View style={[styles.settingItem, { borderColor }]}>
          <View style={styles.settingInfo}>
            <MaterialIcons name="record-voice-over" size={24} color={textColor} />
            <Text style={[styles.settingText, { color: textColor }]}>Voice Assistant</Text>
          </View>
          <Switch
            value={voiceAssistantEnabled}
            onValueChange={setVoiceAssistantEnabled}
            trackColor={{ false: '#767577', true: accentColor }}
            thumbColor={voiceAssistantEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>Data</Text>
        <TouchableOpacity
          style={[styles.settingItem, { borderColor }]}
          onPress={handleClearCache}
        >
          <View style={styles.settingInfo}>
            <MaterialIcons name="delete" size={24} color={textColor} />
            <Text style={[styles.settingText, { color: textColor }]}>Clear Cache</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={secondaryTextColor} />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: textColor }]}>About</Text>
        <View style={[styles.settingItem, { borderColor }]}>
          <View style={styles.settingInfo}>
            <MaterialIcons name="info" size={24} color={textColor} />
            <Text style={[styles.settingText, { color: textColor }]}>Version</Text>
          </View>
          <Text style={[styles.settingValue, { color: secondaryTextColor }]}>1.0.0</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 20,
  },
  backButton: {
    marginRight: 15,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    marginLeft: 15,
    flex: 1,
  },
  settingValue: {
    fontSize: 16,
  },
}); 