// ============================================================
// UnifiedSignupScreen.tsx
//
// A single signup form for both Regular Users and
// Medical Professionals / Students. The `role` route param
// determines which AuthContext function is called.
//
// Both user types land on the SOS home screen after signup.
// Medical professionals can complete their professional
// profile from the profile/settings screen later.
// ============================================================

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErrorBanner, InputField, PrimaryButton } from '../components/shared';
import { BorderRadius, Colors, Spacing, Typography } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/AuthNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'UnifiedSignup'>;
  route: RouteProp<RootStackParamList, 'UnifiedSignup'>;
};

const UnifiedSignupScreen: React.FC<Props> = ({ navigation, route }) => {
  const role = route?.params?.role ?? 'user';
  const isMedical = role === 'medical_professional';

  const { signUpUser, signUpMedical, isLoading } = useAuth();

  const [fullName, setFullName]               = useState('');
  const [email, setEmail]                     = useState('');
  const [phone, setPhone]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]       = useState(false);
  const [errors, setErrors]                   = useState<Record<string, string>>({});
  const [apiError, setApiError]               = useState<string | null>(null);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Full name is required.';
    if (!email.trim()) e.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email address.';
    if (!phone.trim()) e.phone = 'Phone number is required.';
    else if (phone.replace(/\D/g, '').length < 10) e.phone = 'Enter a valid 10-digit phone number.';
    if (!password) e.password = 'Password is required.';
    else if (password.length < 8) e.password = 'Password must be at least 8 characters.';
    if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setApiError(null);

    const payload = {
      full_name: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,
    };

    // Both regular users and medical professionals use the same form.
    // signUpMedical sets role='medical_professional' & onboarding_complete=false
    // but App.js now routes medical professionals to the SOS screen regardless,
    // so they reach the same home page as regular users.
    const { error } = isMedical
      ? await signUpMedical(payload)
      : await signUpUser(payload);

    if (error) {
      setApiError(error);
    }
    // On success the AuthContext state update triggers App.js to navigate
    // to SOSScreen for regular users, or ResponderDashboard for medical.
    // Since we want both to land on SOS, App.js handles this via the
    // unified home routing below.
  };

  const passwordStrength = (() => {
    if (password.length === 0) return null;
    if (password.length < 8) return 'weak';
    if (password.length < 12) return 'medium';
    return 'strong';
  })();

  const strengthColor = {
    weak: Colors.statusRed,
    medium: Colors.statusOrange,
    strong: Colors.statusGreen,
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Background decorations */}
      <View style={[styles.bgBlob, isMedical ? styles.bgBlobMedical : styles.bgBlobUser]} />
      <View style={styles.bgBlob2} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.badge, isMedical && styles.badgeMedical]}>
              <Text style={[styles.badgeText, isMedical && styles.badgeTextMedical]}>
                {isMedical ? '🩺 MEDICAL PROFESSIONAL / STUDENT' : '🙋 REGULAR USER'}
              </Text>
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              {isMedical
                ? 'Join as a medical professional or student. You\'ll respond to emergencies and also have SOS access.'
                : 'Join LifeLink to access emergency SOS services and get help when you need it most.'}
            </Text>
          </View>

          {/* Medical info note */}
          {isMedical && (
            <View style={styles.infoNote}>
              <Text style={styles.infoNoteIcon}>ℹ️</Text>
              <Text style={styles.infoNoteText}>
                You'll get the same SOS access as regular users. Complete your professional profile anytime from Settings to start responding to emergencies.
              </Text>
            </View>
          )}

          {/* Form */}
          <View style={styles.form}>
            {apiError && <ErrorBanner message={apiError} />}

            <InputField
              label="Full Name"
              placeholder={isMedical ? 'Dr. Jane Doe' : 'John Doe'}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              error={errors.fullName}
            />

            <InputField
              label="Email Address"
              placeholder={isMedical ? 'dr.name@hospital.com' : 'you@example.com'}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.email}
            />

            <InputField
              label="Phone Number"
              placeholder="+91 98765 43210"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              error={errors.phone}
            />

            <InputField
              label="Password"
              placeholder="Min. 8 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              error={errors.password}
              rightIcon={
                <TouchableOpacity onPress={() => setShowPassword(p => !p)}>
                  <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
                </TouchableOpacity>
              }
            />

            <InputField
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              error={errors.confirmPassword}
            />

            {/* Password strength */}
            {passwordStrength && (
              <View style={styles.strengthRow}>
                <View
                  style={[
                    styles.strengthBar,
                    { backgroundColor: strengthColor[passwordStrength] },
                  ]}
                />
                <Text style={[styles.strengthLabel, { color: strengthColor[passwordStrength] }]}>
                  {passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}
                </Text>
              </View>
            )}

            <PrimaryButton
              title="Create Account & Continue"
              onPress={handleSignup}
              loading={isLoading}
              style={[styles.submitBtn, isMedical && styles.submitBtnMedical]}
            />
          </View>

          {/* Footer — switch role */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate(isMedical ? 'MedicalLogin' : 'UserLogin')
              }
            >
              <Text style={styles.footerLink}>  Sign In</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.switchRole}
            onPress={() =>
              navigation.replace('UnifiedSignup', {
                role: isMedical ? 'user' : 'medical_professional',
              })
            }
          >
            <Text style={styles.switchRoleText}>
              {isMedical
                ? '🙋 Sign up as a Regular User instead →'
                : '🩺 Sign up as Medical Professional / Student instead →'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  bgBlob: {
    position: 'absolute',
    top: -100,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
  },
  bgBlobUser: { backgroundColor: 'rgba(69, 123, 157, 0.09)' },
  bgBlobMedical: { backgroundColor: 'rgba(230, 57, 70, 0.10)' },
  bgBlob2: {
    position: 'absolute',
    bottom: -60,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(69, 123, 157, 0.06)',
  },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl, flexGrow: 1 },
  backBtn: { marginBottom: Spacing.xl, alignSelf: 'flex-start' },
  backText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.medium,
  },
  header: { marginBottom: Spacing.lg },
  badge: {
    backgroundColor: 'rgba(69, 123, 157, 0.15)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(69, 123, 157, 0.3)',
  },
  badgeMedical: {
    backgroundColor: 'rgba(230, 57, 70, 0.15)',
    borderColor: 'rgba(230, 57, 70, 0.3)',
  },
  badgeText: {
    color: Colors.secondaryLight,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 1.2,
  },
  badgeTextMedical: { color: Colors.primaryLight },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.extrabold,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.base,
    marginTop: 8,
    lineHeight: 22,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(230, 57, 70, 0.07)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(230, 57, 70, 0.2)',
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  infoNoteIcon: { fontSize: 16, marginTop: 1 },
  infoNoteText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
    flex: 1,
  },
  form: { marginBottom: Spacing.xl },
  eyeIcon: { fontSize: 16, padding: 2 },
  strengthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    width: 50,
  },
  submitBtn: { marginTop: Spacing.sm },
  submitBtnMedical: {
    // PrimaryButton already uses Colors.primary; we rely on the existing style
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  footerText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
  footerLink: {
    color: Colors.primary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  switchRole: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  switchRoleText: {
    color: Colors.textMuted,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    textAlign: 'center',
  },
});

export default UnifiedSignupScreen;
