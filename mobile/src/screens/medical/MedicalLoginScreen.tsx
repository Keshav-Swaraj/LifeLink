// ============================================================
// MedicalLoginScreen.tsx — Login screen for Medical Professionals
// ============================================================

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
import { ErrorBanner, InputField, PrimaryButton } from '../../components/shared';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { RootStackParamList } from '../../navigation/AuthNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'MedicalLogin'>;
};

const MedicalLoginScreen: React.FC<Props> = ({ navigation }) => {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim()) e.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email.';
    if (!password) e.password = 'Password is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setApiError(null);
    const { error } = await login({ email: email.trim(), password });
    if (error) setApiError(error);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Decorative glow */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>🩺 MEDICAL PROFESSIONAL</Text>
              </View>
            </View>
            <Text style={styles.title}>Welcome back,{'\n'}Doctor</Text>
            <Text style={styles.subtitle}>
              Sign in to your verified responder account and start saving lives.
            </Text>
          </View>

          {/* Verification note */}
          <View style={styles.verifiedNote}>
            <Text style={styles.verifiedNoteIcon}>🔒</Text>
            <Text style={styles.verifiedNoteText}>
              This portal is for verified medical professionals only. Your credentials will be reviewed by our team.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {apiError && <ErrorBanner message={apiError} />}

            <InputField
              label="Professional Email"
              placeholder="dr.name@hospital.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.email}
            />

            <InputField
              label="Password"
              placeholder="Enter your password"
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

            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>

            <PrimaryButton
              title="Sign In as Medical Professional"
              onPress={handleLogin}
              loading={isLoading}
              style={styles.submitBtn}
            />

            {/* Demo hint */}
            <View style={styles.demoHint}>
              <Text style={styles.demoHintText}>
                Demo: use any email + password <Text style={styles.demoCode}>password123</Text>
              </Text>
            </View>
          </View>

          {/* Footer links */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>New to LifeLink?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('UnifiedSignup', { role: 'medical_professional' })}>
              <Text style={styles.footerLink}>  Register as Medical</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.switchRole}
            onPress={() => navigation.navigate('UserLogin')}
          >
            <Text style={styles.switchRoleText}>🙋 I'm a regular User →</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  glowTop: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(230, 57, 70, 0.10)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -80,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(230, 57, 70, 0.06)',
  },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl, flexGrow: 1 },
  backBtn: { marginBottom: Spacing.xl, alignSelf: 'flex-start' },
  backText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.medium,
  },
  header: { marginBottom: Spacing.lg },
  badgeRow: { marginBottom: Spacing.md },
  badge: {
    backgroundColor: 'rgba(230, 57, 70, 0.15)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(230, 57, 70, 0.3)',
  },
  badgeText: {
    color: Colors.primaryLight,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 1.2,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.extrabold,
    lineHeight: 36,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.base,
    marginTop: 10,
    lineHeight: 22,
  },
  verifiedNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(230, 57, 70, 0.08)',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(230, 57, 70, 0.2)',
    padding: Spacing.md,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  verifiedNoteIcon: { fontSize: 16, marginTop: 1 },
  verifiedNoteText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
    lineHeight: 18,
    flex: 1,
  },
  form: { marginBottom: Spacing.xl },
  forgotPassword: { alignSelf: 'flex-end', marginBottom: Spacing.lg, marginTop: -4 },
  forgotPasswordText: {
    color: Colors.primaryLight,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  submitBtn: { marginTop: Spacing.sm },
  demoHint: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  demoHintText: {
    color: Colors.textMuted,
    fontSize: Typography.fontSize.xs,
    textAlign: 'center',
  },
  demoCode: { color: Colors.textSecondary, fontWeight: Typography.fontWeight.semibold },
  eyeIcon: { fontSize: 16, padding: 2 },
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
    borderColor: 'rgba(69, 123, 157, 0.25)',
  },
  switchRoleText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
});

export default MedicalLoginScreen;
