// ============================================================
// UserSignupScreen.tsx — Registration screen for regular users
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
  navigation: NativeStackNavigationProp<RootStackParamList, 'UserSignup'>;
};

const UserSignupScreen: React.FC<Props> = ({ navigation }) => {
  const { signUpUser, isLoading } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

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
    const { error } = await signUpUser({
      full_name: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,
    });
    if (error) setApiError(error);
    // On success, AuthNavigator detects the user and navigates to MainApp
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
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>NEW USER</Text>
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Join LifeLink as a user to access emergency services and SOS features.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {apiError && <ErrorBanner message={apiError} />}

            <InputField
              label="Full Name"
              placeholder="John Doe"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              error={errors.fullName}
            />

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

            {/* Password strength indicator */}
            {password.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={[
                  styles.strengthBar,
                  password.length >= 8 && styles.strengthMedium,
                  password.length >= 12 && styles.strengthStrong,
                ]} />
                <Text style={styles.strengthLabel}>
                  {password.length < 8 ? 'Weak' : password.length < 12 ? 'Medium' : 'Strong'}
                </Text>
              </View>
            )}

            <PrimaryButton
              title="Create Account"
              onPress={handleSignup}
              loading={isLoading}
              style={styles.submitBtn}
            />
          </View>

          {/* Footer */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('UserLogin')}>
              <Text style={styles.footerLink}>  Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  bgAccent: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(69, 123, 157, 0.07)',
  },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl, flexGrow: 1 },
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
  eyeIcon: { fontSize: 16, padding: 2 },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.statusRed,
  },
  strengthMedium: { backgroundColor: Colors.statusOrange },
  strengthStrong: { backgroundColor: Colors.statusGreen },
  strengthLabel: {
    color: Colors.textMuted,
    fontSize: Typography.fontSize.xs,
    width: 50,
  },
  submitBtn: { marginTop: Spacing.sm },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
  footerLink: {
    color: Colors.primary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
});

export default UserSignupScreen;
