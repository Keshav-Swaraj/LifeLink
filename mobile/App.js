import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import SOSScreen from './src/screens/SOSScreen';
import ResponderDashboard from './src/screens/ResponderDashboard';
import EmergencyDetailScreen from './src/screens/EmergencyDetailScreen';

const Stack = createStackNavigator();

function RootStack() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#FF2D55" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : !profile ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      ) : profile.role === 'responder' ? (
        <>
          <Stack.Screen name="ResponderHome" component={ResponderDashboard} />
          <Stack.Screen name="EmergencyDetail" component={EmergencyDetailScreen} />
        </>
      ) : (
        <Stack.Screen name="SOS" component={SOSScreen} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootStack />
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
