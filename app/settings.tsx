import { FontAwesome } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Switch,
} from 'react-native';
import { useThemeColor } from '../hooks/useThemeColor';

const SettingsScreen = () => {
  const { textColor, backgroundColor, cardBackground, accentColor } = useThemeColor();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(false);

  const settings = [
    {
      title: 'Account',
      items: [
        { icon: 'user', title: 'Edit Profile', onPress: () => router.push('/(tabs)/profile') },
        { icon: 'lock', title: 'Privacy', onPress: () => {} },
        { icon: 'shield', title: 'Security', onPress: () => {} },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: 'bell',
          title: 'Notifications',
          right: (
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={notificationsEnabled ? accentColor : '#f4f3f4'}
            />
          ),
        },
        {
          icon: 'moon-o',
          title: 'Dark Mode',
          right: (
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={darkMode ? accentColor : '#f4f3f4'}
            />
          ),
        },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: 'question-circle', title: 'Help & Support', onPress: () => {} },
        { icon: 'info-circle', title: 'About', onPress: () => {} },
        { icon: 'file-text', title: 'Terms & Conditions', onPress: () => {} },
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome name="arrow-left" size={24} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textColor }]}>Settings</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.scrollView}>
        {settings.map((section, sectionIndex) => (
          <View key={sectionIndex} style={[styles.section, { backgroundColor: cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: accentColor }]}>{section.title}</Text>
            {section.items.map((item, itemIndex) => (
              <TouchableOpacity
                key={itemIndex}
                style={styles.settingItem}
                onPress={item.onPress}
                disabled={!item.onPress}
              >
                <View style={styles.settingLeft}>
                  <FontAwesome name={item.icon} size={20} color={textColor} style={styles.settingIcon} />
                  <Text style={[styles.settingText, { color: textColor }]}>{item.title}</Text>
                </View>
                {item.right || <FontAwesome name="angle-right" size={20} color="#bdc3c7" />}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginLeft: -32, // Adjust for the back button
  },
  headerRight: {
    width: 40, // Same as back button for balance
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  section: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionTitle: {
    padding: 16,
    fontSize: 16,
    fontWeight: '600',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIcon: {
    width: 24,
    marginRight: 16,
  },
  settingText: {
    fontSize: 16,
  },
});

export default SettingsScreen;
