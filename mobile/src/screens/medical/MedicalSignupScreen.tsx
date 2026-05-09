// ============================================================
// MedicalSignupScreen.tsx — Registration for Medical Professionals
// Collects basic info. Professional details are collected next
// in ProfessionalDetailsScreen.tsx
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
  navigation: NativeStackNavigationProp<RootStackParamList, 'MedicalSignup'>;
};

// Step indicator component
const StepIndicator: React.FC<{ currentStep: number; totalSteps: number; labels: string[] }> = ({
  currentStep, totalSteps, labels
}) => (
  <View style={stepStyles.container}>
    {Array.from({ length: totalSteps }).map((_, i) => (
      <React.Fragment key={i}>
        <View style={stepStyles.stepGroup}>
          <View style={[stepStyles.dot, i < currentStep && stepStyles.dotDone, i === currentStep - 1 && stepStyles.dotActive]}>
            {i < currentStep ? (
              <Text style={stepStyles.dotCheck}>✓</Text>
            ) : (
              <Text style={[stepStyles.dotNum, i === currentStep - 1 && stepStyles.dotNumActive]}>{i + 1}</Text>
            )}
          </View>
          <Text style={[stepStyles.label, i === currentStep - 1 && stepStyles.labelActive]}>{labels[i]}</Text>
        </View>
        {i < totalSteps - 1 && (
          <View style={[stepStyles.line, i < currentStep - 1 && stepStyles.lineDone]} />
        )}
      </React.Fragment>
    ))}
  </View>
);

const stepStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', marginBottom: Spacing.xl },
  stepGroup: { alignItems: 'center', width: 72 },
  dot: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1.5, borderColor: Colors.surfaceBorder,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  dotActive: { borderColor: Colors.primary, backgroundColor: 'rgba(230,57,70,0.15)' },
  dotDone: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dotCheck: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  dotNum: { color: Colors.textMuted, fontSize: Typography.fontSize.sm, fontWeight: '600' },
  dotNumActive: { color: Colors.primary },
  label: { color: Colors.textMuted, fontSize: 10, textAlign: 'center' },
  labelActive: { color: Colors.textSecondary },
  line: { flex: 1, height: 1.5, backgroundColor: Colors.surfaceBorder, marginTop: 15, marginHorizontal: 4 },
  lineDone: { backgroundColor: Colors.primary },
});

const MedicalSignupScreen: React.FC<Props> = ({ navigation }) => {
  const { signUpMedical, isLoading } = useAuth();

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
    const { error } = await signUpMedical({
      full_name: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,
    });
    if (error) {
      setApiError(error);
    }
    // On success, AuthNavigator sees user.onboarding_complete = false
    // and automatically navigates to ProfessionalDetailsScreen
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.glowTop} />
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

          {/* Step indicator */}
          <StepIndicator
            currentStep={1}
            totalSteps={3}
            labels={['Account', 'Credentials', 'Upload ID']}
          />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>🩺 STEP 1 OF 3</Text>
            </View>
            <Text style={styles.title}>Create Your{'\n'}Medical Account</Text>
            <Text style={styles.subtitle}>
              Start with your basic information. You'll enter your professional credentials next.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {apiError && <ErrorBanner message={apiError} />}

            <InputField
              label="Full Name (with title, e.g. Dr.)"
              placeholder="Dr. Jane Smith"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              error={errors.fullName}
            />

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
              title="Continue to Credentials →"
              onPress={handleSignup}
              loading={isLoading}
              style={styles.submitBtn}
            />
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already registered?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('MedicalLogin')}>
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
  glowTop: {
    position: 'absolute', top: -100, right: -80,
    width: 300, height: 300, borderRadius: 150,
    backgroundColor: 'rgba(230, 57, 70, 0.09)',
  },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl, flexGrow: 1 },
  backBtn: { marginBottom: Spacing.lg, alignSelf: 'flex-start' },
  backText: { color: Colors.textSecondary, fontSize: Typography.fontSize.md, fontWeight: Typography.fontWeight.medium },
  header: { marginBottom: Spacing.xl },
  badge: {
    backgroundColor: 'rgba(230, 57, 70, 0.15)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12, paddingVertical: 4,
    alignSelf: 'flex-start', marginBottom: Spacing.md,
    borderWidth: 1, borderColor: 'rgba(230, 57, 70, 0.3)',
  },
  badgeText: { color: Colors.primaryLight, fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.bold, letterSpacing: 1.2 },
  title: { color: Colors.textPrimary, fontSize: Typography.fontSize.xxl, fontWeight: Typography.fontWeight.extrabold, lineHeight: 36 },
  subtitle: { color: Colors.textSecondary, fontSize: Typography.fontSize.base, marginTop: 10, lineHeight: 22 },
  form: { marginBottom: Spacing.xl },
  eyeIcon: { fontSize: 16, padding: 2 },
  strengthContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, gap: Spacing.sm },
  strengthBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: Colors.statusRed },
  strengthMedium: { backgroundColor: Colors.statusOrange },
  strengthStrong: { backgroundColor: Colors.statusGreen },
  strengthLabel: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, width: 50 },
  submitBtn: { marginTop: Spacing.sm },
  footerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm },
  footerLink: { color: Colors.primary, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
});

export default MedicalSignupScreen;
