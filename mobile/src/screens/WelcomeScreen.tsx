// ============================================================
// WelcomeScreen.tsx
// First screen shown to unauthenticated users.
// Lets them choose between the User path and the Medical Professional path.
// ============================================================

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BorderRadius, Colors, Spacing, Typography } from '../constants/theme';
import { RootStackParamList } from '../navigation/AuthNavigator';

const { width } = Dimensions.get('window');

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Welcome'>;
};

const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();

    // Pulsing animation for the SOS logo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 1000, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: Platform.OS !== 'web' }),
      ])
    ).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* Background gradient circles */}
      <View style={styles.bgCircle1} />
      <View style={styles.bgCircle2} />

      <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* Logo */}
        <Animated.View style={[styles.logoContainer, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.logoRing}>
            <View style={styles.logoInner}>
              <Text style={styles.logoPlus}>+</Text>
            </View>
          </View>
        </Animated.View>

        {/* Brand */}
        <Text style={styles.brand}>LifeLink</Text>
        <Text style={styles.tagline}>Golden Hour, Powered by AI</Text>

        <View style={styles.divider} />

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Who are you joining as?
        </Text>
        <Text style={styles.subtitleSub}>
          Both paths give you SOS access. Medical professionals additionally receive and respond to emergency alerts.
        </Text>

        {/* Path Cards */}
        <View style={styles.cardsContainer}>
          {/* User Card */}
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('UserLogin')}
          >
            <View style={styles.cardIconContainer}>
              <Text style={styles.cardIcon}>🙋</Text>
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>Regular User</Text>
              <Text style={styles.cardSubtitle}>Any profession · Bystander</Text>
              <Text style={styles.cardDesc}>Trigger SOS in an emergency, alert nearby responders, and get connected to hospitals fast.</Text>
            </View>
            <View style={styles.cardArrow}>
              <Text style={styles.cardArrowText}>›</Text>
            </View>
          </TouchableOpacity>

          {/* Medical Professional Card */}
          <TouchableOpacity
            style={[styles.card, styles.cardMedical]}
            activeOpacity={0.85}
            onPress={() => navigation.navigate('MedicalLogin')}
          >
            <View style={[styles.cardIconContainer, styles.cardIconMedical]}>
              <Text style={styles.cardIcon}>🩺</Text>
            </View>
            <View style={styles.cardTextContainer}>
              <Text style={styles.cardTitle}>Medical Professional / Student</Text>
              <Text style={[styles.cardSubtitle, styles.cardSubtitleMedical]}>
                Doctor · Nurse · Paramedic · Med Student
              </Text>
              <Text style={styles.cardDesc}>Get SOS access plus respond to verified emergencies near you as a certified professional.</Text>
            </View>
            <View style={styles.cardArrow}>
              <Text style={[styles.cardArrowText, { color: Colors.primaryLight }]}>›</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          By continuing you agree to LifeLink's{' '}
          <Text style={styles.footerLink}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={styles.footerLink}>Privacy Policy</Text>
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  bgCircle1: {
    position: 'absolute',
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: 'rgba(230, 57, 70, 0.08)',
    top: -80,
    right: -80,
  },
  bgCircle2: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(69, 123, 157, 0.07)',
    bottom: 60,
    left: -60,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: Spacing.lg,
  },
  logoContainer: {
    marginBottom: Spacing.lg,
  },
  logoRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(230, 57, 70, 0.12)',
  },
  logoInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPlus: {
    color: Colors.white,
    fontSize: 36,
    fontWeight: Typography.fontWeight.bold,
    lineHeight: 42,
  },
  brand: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.extrabold,
    letterSpacing: 1,
  },
  tagline: {
    color: Colors.primary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: Colors.primary,
    borderRadius: 1,
    marginVertical: Spacing.lg,
    opacity: 0.6,
  },
  subtitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
  },
  subtitleSub: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
  },
  cardsContainer: {
    width: '100%',
    gap: Spacing.md,
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  cardMedical: {
    borderColor: 'rgba(230, 57, 70, 0.35)',
    backgroundColor: 'rgba(230, 57, 70, 0.07)',
  },
  cardIconContainer: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconMedical: {
    backgroundColor: 'rgba(230, 57, 70, 0.15)',
  },
  cardIcon: {
    fontSize: 26,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
  },
  cardSubtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cardSubtitleMedical: {
    color: Colors.primaryLight,
  },
  cardDesc: {
    color: Colors.textMuted,
    fontSize: Typography.fontSize.xs,
    marginTop: 5,
    lineHeight: 17,
  },
  cardArrow: {
    paddingLeft: Spacing.sm,
  },
  cardArrowText: {
    color: Colors.textSecondary,
    fontSize: 28,
    fontWeight: Typography.fontWeight.regular,
  },
  footer: {
    color: Colors.textMuted,
    fontSize: Typography.fontSize.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLink: {
    color: Colors.secondaryLight,
    fontWeight: Typography.fontWeight.medium,
  },
});

export default WelcomeScreen;
