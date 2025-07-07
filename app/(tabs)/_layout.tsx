import { Tabs } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/Colors';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: '#9ca3af',
        headerShown: false,
        header: () => null,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          elevation: 8,
          shadowOpacity: 0.1,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: -4,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '',
          headerShown: false,
          tabBarIcon: ({ color }: { color: string }) => <FontAwesome name="home" size={20} color="#333333" />,
        }}
      />
      <Tabs.Screen
        name="schemes"
        options={{
          title: '',
          headerShown: false,
          tabBarIcon: ({ color }: { color: string }) => <FontAwesome name="list" size={20} color="#333333" />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: '',
          headerShown: false,
          tabBarIcon: ({ color }: { color: string }) => <FontAwesome name="compass" size={20} color="#333333" />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: '',
          headerShown: false,
          tabBarIcon: ({ color }: { color: string }) => <FontAwesome name="tasks" size={20} color="#333333" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '',
          headerShown: false,
          tabBarIcon: ({ color }: { color: string }) => <FontAwesome name="user" size={20} color="#333333" />,
        }}
      />
      <Tabs.Screen
        name="rent"
        options={{
          title: '',
          headerShown: false,
          tabBarIcon: ({ color }: { color: string }) => <FontAwesome name="shopping-bag" size={20} color="#333333" />,
        }}
      />
    </Tabs>
  );
}
