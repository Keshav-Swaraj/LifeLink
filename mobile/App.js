import 'react-native-gesture-handler';
import 'react-native-url-polyfill/auto';
import React, { useState, useEffect, useMemo } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { View, ActivityIndicator, StyleSheet, Modal } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { supabase } from './src/lib/supabase';
import { initializeNotifications } from './src/services/notifications';

// ── Auth Screens (Member 4) ──────────────────────────────────────
import WelcomeScreen from './src/screens/WelcomeScreen';
import UserLoginScreen from './src/screens/user/UserLoginScreen';
import UserSignupScreen from './src/screens/user/UserSignupScreen';
import MedicalLoginScreen from './src/screens/medical/MedicalLoginScreen';
import MedicalSignupScreen from './src/screens/medical/MedicalSignupScreen';
import ProfessionalDetailsScreen from './src/screens/medical/ProfessionalDetailsScreen';
import DocumentUploadScreen from './src/screens/medical/DocumentUploadScreen';

// ── Victim Screens (Member 1) ────────────────────────────────────
import SOSScreen from './src/screens/SOSScreen';

// ── Responder Screens (Members 2 + 4) ───────────────────────────
import ResponderDashboard from './src/screens/ResponderDashboard';
import EmergencyDetailScreen from './src/screens/EmergencyDetailScreen';
import ActiveResponseScreen from './src/screens/ActiveResponseScreen';
import ResponderAlertScreen from './src/screens/ResponderAlertScreen';
import ResponderProfileScreen from './src/screens/ResponderProfileScreen';

// ── Shared Components ────────────────────────────────────────────
import InAppNotificationBanner from './src/components/InAppNotificationBanner';

const Stack = createStackNavigator();
export const navigationRef = createNavigationContainerRef();

const SCREEN_OPTIONS = { headerShown: false };

function RootStack() {
  const { profile, loading, isAuthenticated } = useAuth();
  const [bannerPayload, setBannerPayload] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalEmergency, setModalEmergency] = useState(null);

  // Determine routing branch
  const isMedical = profile?.role === 'medical_professional';
  const onboardingComplete = profile?.onboarding_complete === true;

  // ── Realtime listener: incoming emergencies for responders ────────
  useEffect(() => {
    if (!isMedical) return;

    const channel = supabase
      .channel('public:emergencies:pending-inserts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'emergencies', filter: 'status=eq.pending' },
        payload => {
          const newRow = payload.new;
          if (!newRow) return;
          setModalEmergency(newRow);
          setModalVisible(true);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isMedical]);

  // ── Push notifications for responders ─────────────────────────────
  useEffect(() => {
    if (!isMedical) return;

    const cleanupPromise = initializeNotifications({
      onForegroundNotification: payload => {
        setBannerPayload(payload);
      },
      onNotificationTap: payload => {
        if (!navigationRef.isReady()) return;
        navigationRef.navigate('ResponderAlertScreen', {
          emergency_id: payload.emergency_id,
          severity: payload.severity,
          summary: payload.summary,
          victim_lat: payload.victim_lat,
          victim_lng: payload.victim_lng,
        });
      },
    });

    return () => {
      cleanupPromise.then(cleanup => cleanup()).catch(() => {});
    };
  }, [isMedical]);

  // ── Modal navigation helper ────────────────────────────────────────
  const modalNavigation = useMemo(() => ({
    navigate: (routeName, params) => {
      if (navigationRef.isReady()) {
        setModalVisible(false);
        setTimeout(() => navigationRef.navigate(routeName, params), 150);
      }
    },
  }), []);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#E63946" />
      </View>
    );
  }

  return (
    <>
      <Stack.Navigator screenOptions={SCREEN_OPTIONS}>
        {!isAuthenticated ? (
          // ── Unauthenticated: Auth flow (Member 4) ──────────────────
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="UserLogin" component={UserLoginScreen} />
            <Stack.Screen name="UserSignup" component={UserSignupScreen} />
            <Stack.Screen name="MedicalLogin" component={MedicalLoginScreen} />
            <Stack.Screen name="MedicalSignup" component={MedicalSignupScreen} />
            <Stack.Screen name="ProfessionalDetails" component={ProfessionalDetailsScreen} />
            <Stack.Screen name="DocumentUpload" component={DocumentUploadScreen} />
          </>
        ) : isMedical && !onboardingComplete ? (
          // ── Medical professional completing onboarding ──────────────
          <>
            <Stack.Screen name="ProfessionalDetails" component={ProfessionalDetailsScreen} />
            <Stack.Screen name="DocumentUpload" component={DocumentUploadScreen} />
          </>
        ) : isMedical ? (
          // ── Fully onboarded medical professional / responder ────────
          <>
            <Stack.Screen name="ResponderHome" component={ResponderDashboard} />
            <Stack.Screen name="EmergencyDetail" component={EmergencyDetailScreen} />
            <Stack.Screen name="ActiveResponseScreen" component={ActiveResponseScreen} />
            <Stack.Screen name="ResponderAlertScreen" component={ResponderAlertScreen} />
            <Stack.Screen name="ResponderProfileScreen" component={ResponderProfileScreen} />
          </>
        ) : (
          // ── Regular user / victim ───────────────────────────────────
          <Stack.Screen name="SOS" component={SOSScreen} />
        )}
      </Stack.Navigator>

      {/* Global overlays for responders only */}
      {isMedical && onboardingComplete && (
        <>
          <InAppNotificationBanner
            payload={bannerPayload}
            onDismiss={() => setBannerPayload(null)}
          />

          <Modal visible={modalVisible} animationType="slide" transparent statusBarTranslucent>
            <View style={styles.modalOverlay}>
              {modalEmergency ? (
                <ResponderAlertScreen
                  emergencyId={modalEmergency.id}
                  severity={modalEmergency.severity}
                  aiSummary={modalEmergency.ai_summary ?? modalEmergency.aiSummary}
                  victimLatitude={modalEmergency.victim_lat ?? modalEmergency.victimLatitude}
                  victimLongitude={modalEmergency.victim_lng ?? modalEmergency.victimLongitude}
                  scenePhotoUrls={modalEmergency.photos ?? modalEmergency.scenePhotoUrls ?? []}
                  alertTimestamp={modalEmergency.created_at ?? modalEmergency.alertTimestamp}
                  distanceKm={0.8}
                  address={modalEmergency.address}
                  navigation={modalNavigation}
                  activeResponseRouteName="ActiveResponseScreen"
                  homeRouteName="ResponderHome"
                  incidentTitle={modalEmergency.title ?? 'Incoming Emergency'}
                />
              ) : null}
            </View>
          </Modal>
        </>
      )}
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer ref={navigationRef}>
          <RootStack />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: '#0A0E1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(9, 9, 11, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
