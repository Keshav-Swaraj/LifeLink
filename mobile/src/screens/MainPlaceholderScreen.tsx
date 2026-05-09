// ============================================================
// MainPlaceholderScreen.tsx
//
// This is a PLACEHOLDER for the main app (SOS screen etc.)
// that other team members are building.
//
// INTEGRATION GUIDE for other members:
// - Replace this file with your own main app navigator/screen.
// - The `user` object from `useAuth()` will contain the logged-in
//   user's full profile including role, is_verified_medical, etc.
// - Call `logout()` from `useAuth()` to log the user out from anywhere.
// ============================================================

import React from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BorderRadius, Colors, Spacing, Typography } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

const MainPlaceholderScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.07, duration: 900, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: Platform.OS !== 'web' }),
      ])
    ).start();
  }, []);

  const isMedical = user?.role === 'medical_professional';

  return (
    <SafeAreaView style={styles.container}>
      {/* Background decorations */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      {/* Header bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>LifeLink</Text>
          <Text style={styles.brandTag}>Golden Hour, Powered by AI</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* User greeting */}
      <View style={styles.greetingCard}>
        <View style={[styles.roleTag, isMedical && styles.roleTagMedical]}>
          <Text style={styles.roleTagText}>
            {isMedical ? '🩺 Medical Professional' : '🙋 User'}
          </Text>
        </View>
        <Text style={styles.greetingHi}>Hello,</Text>
        <Text style={styles.greetingName}>{user?.full_name ?? 'User'}</Text>
        <Text style={styles.greetingEmail}>{user?.email}</Text>

        {isMedical && (
          <View style={styles.verificationStatus}>
            <View style={[
              styles.verificationDot,
              user?.is_verified_medical ? styles.dotVerified : styles.dotPending,
            ]} />
            <Text style={styles.verificationText}>
              {user?.is_verified_medical
                ? 'Verified Responder ✓'
                : 'Verification Pending — document under review'}
            </Text>
          </View>
        )}
      </View>

      {/* Main SOS placeholder */}
      <View style={styles.sosSection}>
        <Text style={styles.sosSectionLabel}>
          {isMedical ? 'Awaiting emergency alerts...' : 'Need help?'}
        </Text>

        <Animated.View style={[styles.sosRing, { transform: [{ scale: pulseAnim }] }]}>
          <TouchableOpacity style={styles.sosButton} activeOpacity={0.85}>
            <Text style={styles.sosBtnLabel}>SOS</Text>
            <Text style={styles.sosBtnSub}>
              {isMedical ? 'Respond' : 'Emergency'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <Text style={styles.sosHint}>
          {isMedical
            ? 'You will receive a push notification when a nearby emergency needs your help.'
            : 'Press the SOS button in an emergency to alert nearby responders and hospitals.'}
        </Text>
      </View>

      {/* Integration note — remove in production */}
      <View style={styles.integrationNote}>
        <Text style={styles.integrationNoteTitle}>🔧 Integration Note</Text>
        <Text style={styles.integrationNoteText}>
          This is a placeholder for the main app. Replace with your navigator.
          Use <Text style={styles.code}>useAuth()</Text> to access the current user profile.
        </Text>
        <View style={styles.codeBlock}>
          <Text style={styles.codeText}>{'const { user } = useAuth();\n// user.role | user.is_verified_medical\n// user.email | user.full_name'}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  bgCircle1: {
    position: 'absolute', top: -100, right: -80,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(230, 57, 70, 0.07)',
  },
  bgCircle2: {
    position: 'absolute', bottom: 0, left: -80,
    width: 250, height: 250, borderRadius: 125,
    backgroundColor: 'rgba(69, 123, 157, 0.06)',
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.divider,
  },
  brand: { color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.extrabold },
  brandTag: { color: Colors.primary, fontSize: 10, fontWeight: Typography.fontWeight.medium, letterSpacing: 1.5, textTransform: 'uppercase' },
  logoutBtn: {
    backgroundColor: 'rgba(230,57,70,0.12)', borderRadius: BorderRadius.full,
    paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: 'rgba(230,57,70,0.3)',
  },
  logoutText: { color: Colors.primary, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },

  greetingCard: {
    margin: Spacing.lg, backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.lg, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  roleTag: {
    backgroundColor: 'rgba(69, 123, 157, 0.15)', borderRadius: BorderRadius.full,
    paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start',
    marginBottom: Spacing.md, borderWidth: 1, borderColor: 'rgba(69, 123, 157, 0.3)',
  },
  roleTagMedical: { backgroundColor: 'rgba(230, 57, 70, 0.12)', borderColor: 'rgba(230, 57, 70, 0.3)' },
  roleTagText: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold },
  greetingHi: { color: Colors.textMuted, fontSize: Typography.fontSize.sm },
  greetingName: { color: Colors.textPrimary, fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.extrabold, marginTop: 2 },
  greetingEmail: { color: Colors.textMuted, fontSize: Typography.fontSize.sm, marginTop: 3 },
  verificationStatus: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: Spacing.md, paddingTop: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.divider,
  },
  verificationDot: { width: 8, height: 8, borderRadius: 4 },
  dotVerified: { backgroundColor: Colors.statusGreen },
  dotPending: { backgroundColor: Colors.statusOrange },
  verificationText: { color: Colors.textSecondary, fontSize: Typography.fontSize.xs, flex: 1 },

  sosSection: { alignItems: 'center', paddingHorizontal: Spacing.lg, flex: 1, justifyContent: 'center' },
  sosSectionLabel: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, marginBottom: Spacing.xl, letterSpacing: 0.5 },
  sosRing: {
    width: 180, height: 180, borderRadius: 90,
    borderWidth: 2, borderColor: 'rgba(230, 57, 70, 0.4)',
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl,
  },
  sosButton: {
    width: 148, height: 148, borderRadius: 74,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 24, elevation: 14,
  },
  sosBtnLabel: { color: Colors.white, fontSize: Typography.fontSize.xxl, fontWeight: Typography.fontWeight.extrabold, letterSpacing: 2 },
  sosBtnSub: { color: 'rgba(255,255,255,0.75)', fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.medium, letterSpacing: 1, textTransform: 'uppercase' },
  sosHint: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, textAlign: 'center', lineHeight: 19, paddingHorizontal: Spacing.md },

  integrationNote: {
    margin: Spacing.lg, backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: BorderRadius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  integrationNoteTitle: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, marginBottom: 6 },
  integrationNoteText: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, lineHeight: 18 },
  code: { color: Colors.primaryLight, fontWeight: Typography.fontWeight.semibold },
  codeBlock: {
    backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: BorderRadius.sm,
    padding: Spacing.sm, marginTop: Spacing.sm,
  },
  codeText: { color: Colors.statusGreen, fontSize: 10, fontFamily: 'monospace' },
});

export default MainPlaceholderScreen;
