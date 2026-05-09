// ============================================================
// AuthNavigator.tsx — Root Navigation for the Auth Module
//
// INTEGRATION GUIDE for other team members:
//
// 1. Import <AuthProvider> and <AuthNavigator> into your App.tsx.
// 2. Wrap your whole app with <AuthProvider>.
// 3. Conditionally render <AuthNavigator /> when `!isAuthenticated`.
// 4. Render your own main navigator when `isAuthenticated`.
//
// Example:
//   const { isAuthenticated, user } = useAuth();
//   if (!isAuthenticated) return <AuthNavigator />;
//   return <YourMainAppNavigator />;
//
// ROUTE PARAMETER LIST:
// Export `RootStackParamList` for type-safe navigation from any screen.
// ============================================================

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { useAuth } from '../context/AuthContext';
import DocumentUploadScreen from '../screens/medical/DocumentUploadScreen';
import MedicalLoginScreen from '../screens/medical/MedicalLoginScreen';
import MedicalSignupScreen from '../screens/medical/MedicalSignupScreen';
import ProfessionalDetailsScreen from '../screens/medical/ProfessionalDetailsScreen';
import MainPlaceholderScreen from '../screens/MainPlaceholderScreen';
import UserLoginScreen from '../screens/user/UserLoginScreen';
import UserSignupScreen from '../screens/user/UserSignupScreen';
import UnifiedSignupScreen from '../screens/UnifiedSignupScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import SOSScreen from '../screens/SOSScreen';
import ActiveSOSScreen from '../screens/ActiveSOSScreen';
import ActiveResponseScreen from '../screens/ActiveResponseScreen';

// ── Route Map ─────────────────────────────────────────────────
// Export this so other screens can import it for type-safe navigation.
export type RootStackParamList = {
  // Auth
  Welcome: undefined;

  // User Flow
  UserLogin: undefined;
  UserSignup: undefined;

  // Medical Professional Flow
  MedicalLogin: undefined;
  MedicalSignup: undefined;
  ProfessionalDetails: undefined;
  DocumentUpload: undefined;

  // Unified Signup (both roles)
  UnifiedSignup: { role: 'user' | 'medical_professional' };

  // Main App
  MainApp: undefined;
  SOSScreen: undefined;
  ActiveSOSScreen: undefined;
  ActiveSOSScreenDirect: undefined;
  ActiveResponseScreen: {
    emergencyId: string;
    aiSummary?: string;
    photoUrls?: string[];
    address?: string;
    victimLatitude?: number;
    victimLongitude?: number;
  };
  ActiveResponseScreenDirect: any;
  UserProfileScreen: undefined;
  ResponderAlertScreen: any;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// ── Auth Stack (unauthenticated) ──────────────────────────────
const AuthStack: React.FC = () => (
  <Stack.Navigator
    id="AuthStack"
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
      contentStyle: { backgroundColor: 'transparent' },
    }}
    initialRouteName="Welcome"
  >
    <Stack.Screen name="Welcome" component={WelcomeScreen} />

    {/* User flows */}
    <Stack.Screen name="UserLogin" component={UserLoginScreen} />
    <Stack.Screen name="UserSignup" component={UserSignupScreen} />

    {/* Medical flows */}
    <Stack.Screen name="MedicalLogin" component={MedicalLoginScreen} />
    <Stack.Screen name="MedicalSignup" component={MedicalSignupScreen} />
    <Stack.Screen name="ProfessionalDetails" component={ProfessionalDetailsScreen} />
    <Stack.Screen name="DocumentUpload" component={DocumentUploadScreen} />

    {/* Unified Signup (shared by both roles) */}
    <Stack.Screen name="UnifiedSignup" component={UnifiedSignupScreen} />
  </Stack.Navigator>
);

// ── Onboarding Stack (authenticated but incomplete) ───────────
// Shown to medical professionals who signed up but haven't
// completed Step 2 (Professional Details) and Step 3 (Upload).
const OnboardingStack: React.FC = () => (
  <Stack.Navigator
    id="OnboardingStack"
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
    }}
    initialRouteName="ProfessionalDetails"
  >
    <Stack.Screen name="ProfessionalDetails" component={ProfessionalDetailsScreen} />
    <Stack.Screen name="DocumentUpload" component={DocumentUploadScreen} />
    {/* Add Welcome as fallback to satisfy type requirements */}
    <Stack.Screen name="Welcome" component={WelcomeScreen} />
    <Stack.Screen name="UserLogin" component={UserLoginScreen} />
    <Stack.Screen name="UserSignup" component={UserSignupScreen} />
    <Stack.Screen name="MedicalLogin" component={MedicalLoginScreen} />
    <Stack.Screen name="MedicalSignup" component={MedicalSignupScreen} />
    <Stack.Screen name="MainApp" component={MainPlaceholderScreen} />
  </Stack.Navigator>
);

// ── Main App Stack (fully authenticated) ─────────────────────
const AppStack: React.FC = () => (
  <Stack.Navigator id="AppStack" screenOptions={{ headerShown: false }} initialRouteName="SOSScreen">
    <Stack.Screen name="SOSScreen" component={SOSScreen} />
    <Stack.Screen name="ActiveSOSScreen" component={ActiveSOSScreen} />
    <Stack.Screen name="ActiveResponseScreen" component={ActiveResponseScreen} />
    <Stack.Screen name="MainApp" component={MainPlaceholderScreen} />
  </Stack.Navigator>
);

// ── Root Navigator ────────────────────────────────────────────
// This is the single component to export and render in App.tsx.
// It handles all auth state routing automatically.
const AuthNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  // While restoring session from AsyncStorage, show nothing (splash handled separately)
  if (isLoading) return null;

  return (
    <NavigationContainer>
      {!isAuthenticated ? (
        // Not logged in → show auth screens
        <AuthStack />
      ) : user?.role === 'medical_professional' && !user?.onboarding_complete ? (
        // Logged in as medical professional but onboarding incomplete
        <OnboardingStack />
      ) : (
        // Fully authenticated and onboarded
        <AppStack />
      )}
    </NavigationContainer>
  );
};

export default AuthNavigator;
