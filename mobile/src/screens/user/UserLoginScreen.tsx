// ============================================================
// UserLoginScreen.tsx — Login screen for regular users
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
import { Colors, Spacing, Typography, BorderRadius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { RootStackParamList } from '../../navigation/AuthNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'UserLogin'>;
};

const UserLoginScreen: React.FC<Props> = ({ navigation }) => {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!email.trim()) newErrors.email = 'Email is required.';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Enter a valid email.';
    if (!password) newErrors.password = 'Password is required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setApiError(null);
    const { error } = await login({ email: email.trim(), password });
    if (error) setApiError(error);
    // On success, AuthNavigator automatically navigates to the main app
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.bgAccent} />
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
            <View style={styles.badge}>
              <Text style={styles.badgeText}>USER</Text>
            </View>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>
              Sign in to access emergency services and LifeLink features.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {apiError && <ErrorBanner message={apiError} />}

            <InputField
              label="Email Address"
              placeholder="you@example.com"
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
              title="Sign In"
              onPress={handleLogin}
              loading={isLoading}
              style={styles.submitBtn}
            />

            {/* Demo hint */}
            <View style={styles.demoHint}>
              <Text style={styles.demoHintText}>
                Demo: use any email and password <Text style={styles.demoCode}>password123</Text>
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('UnifiedSignup', { role: 'user' })}>
              <Text style={styles.footerLink}>  Sign Up</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.switchRole}
            onPress={() => navigation.navigate('MedicalLogin')}
          >
            <Text style={styles.switchRoleText}>
              🩺 I'm a Medical Professional →
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  bgAccent: {
    position: 'absolute',
    top: -100,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(69, 123, 157, 0.08)',
  },
  scroll: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    flexGrow: 1,
  },
  backBtn: { marginBottom: Spacing.xl, alignSelf: 'flex-start' },
  backText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.medium,
  },
  header: { marginBottom: Spacing.xl },
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
  badgeText: {
    color: Colors.secondaryLight,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 1.5,
  },
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
  form: { marginBottom: Spacing.xl },
  forgotPassword: { alignSelf: 'flex-end', marginBottom: Spacing.lg, marginTop: -4 },
  forgotPasswordText: {
    color: Colors.secondaryLight,
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
  demoCode: {
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.semibold,
  },
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
    borderColor: 'rgba(230, 57, 70, 0.2)',
  },
  switchRoleText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
});

export default UserLoginScreen;
