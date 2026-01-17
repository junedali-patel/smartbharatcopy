import { Tabs } from 'expo-router';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { useColorScheme, View, StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2E7D32',
        tabBarInactiveTintColor: '#9CA3AF',
        headerShown: false,
        header: () => null,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          elevation: 8,
          shadowOpacity: 0.1,
          height: 80, // Balanced height for icons and labels
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: 4,
          marginBottom: 2, // Reduced bottom margin
          fontWeight: '500',
          includeFontPadding: false, // Prevents extra padding around text
        },
        tabBarItemStyle: {
          paddingVertical: 6, // Adjusted vertical padding
          marginHorizontal: 2, // Reduced horizontal margin
          borderRadius: 12,
          height: 'auto', // Changed from 100% to auto
          minHeight: 60, // Minimum height for touch target
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarActiveBackgroundColor: 'rgba(46, 125, 50, 0.1)',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <MaterialIcons 
              name="home" 
              size={24} 
              color={focused ? '#2E7D32' : '#9CA3AF'} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="schemes"
        options={{
          title: 'Schemes',
          tabBarIcon: ({ focused }) => (
            <MaterialIcons 
              name="featured-play-list" 
              size={24} 
              color={focused ? '#2E7D32' : '#9CA3AF'} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ focused }) => (
            <View style={focused ? styles.activeTab : null}>
              <MaterialIcons 
                name="explore" 
                size={24} 
                color={focused ? '#2E7D32' : '#9CA3AF'}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ focused }) => (
            <MaterialIcons 
              name="check-circle-outline" 
              size={24} 
              color={focused ? '#2E7D32' : '#9CA3AF'} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="rent"
        options={{
          title: 'Rent',
          tabBarIcon: ({ focused }) => (
            <MaterialIcons 
              name="shopping-bag" 
              size={24} 
              color={focused ? '#2E7D32' : '#9CA3AF'} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <MaterialIcons 
              name="person-outline" 
              size={24} 
              color={focused ? '#2E7D32' : '#9CA3AF'} 
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeTab: {
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
    padding: 8,
    borderRadius: 12,
  },
});
