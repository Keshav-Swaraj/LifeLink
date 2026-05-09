// ============================================================
// ProfessionalDetailsScreen.tsx — Step 2 of 3 for Medical Signup
// Collects: Professional Type, Experience, Registration Number
// ============================================================

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
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
import { MedicalProfessionalType } from '../../types/auth.types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ProfessionalDetails'>;
};

const PROFESSIONAL_TYPES: { type: MedicalProfessionalType; emoji: string; desc: string }[] = [
  { type: 'Doctor', emoji: '👨‍⚕️', desc: 'MBBS / MD / MS' },
  { type: 'Nurse', emoji: '👩‍⚕️', desc: 'B.Sc / GNM Nursing' },
  { type: 'Paramedic', emoji: '🚑', desc: 'Emergency Medical Technician' },
];

const ProfessionalDetailsScreen: React.FC<Props> = ({ navigation }) => {
  const { updateMedicalProfile, isLoading } = useAuth();

  const [selectedType, setSelectedType] = useState<MedicalProfessionalType | null>(null);
  const [experienceYears, setExperienceYears] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!selectedType) e.type = 'Please select your professional type.';
    if (!experienceYears.trim()) e.experience = 'Years of experience is required.';
    else if (isNaN(Number(experienceYears)) || Number(experienceYears) < 0) {
      e.experience = 'Please enter a valid number.';
    }
    if (!registrationNumber.trim()) e.registration = 'Medical registration number is required.';
    else if (registrationNumber.trim().length < 5) e.registration = 'Enter a valid registration number.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleContinue = async () => {
    if (!validate()) return;
    setApiError(null);
    const { error } = await updateMedicalProfile({
      professional_type: selectedType!,
      experience_years: Number(experienceYears),
      registration_number: registrationNumber.trim(),
    });
    if (error) {
      setApiError(error);
    } else {
      navigation.navigate('DocumentUpload');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.glowTop} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Step Indicator */}
        <View style={styles.stepRow}>
          {['Account', 'Credentials', 'Upload ID'].map((label, i) => (
            <React.Fragment key={i}>
              <View style={styles.stepItem}>
                <View style={[styles.stepDot, i === 1 && styles.stepDotActive, i < 1 && styles.stepDotDone]}>
                  {i < 1 ? (
                    <Text style={styles.stepCheck}>✓</Text>
                  ) : (
                    <Text style={[styles.stepNum, i === 1 && styles.stepNumActive]}>{i + 1}</Text>
                  )}
                </View>
                <Text style={[styles.stepLabel, i === 1 && styles.stepLabelActive]}>{label}</Text>
              </View>
              {i < 2 && <View style={[styles.stepLine, i < 1 && styles.stepLineDone]} />}
            </React.Fragment>
          ))}
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🩺 STEP 2 OF 3</Text>
          </View>
          <Text style={styles.title}>Your Professional{'\n'}Credentials</Text>
          <Text style={styles.subtitle}>
            This information is used to verify your identity as a medical professional.
          </Text>
        </View>

        {/* Professional Type Selector */}
        <Text style={styles.sectionLabel}>I am a</Text>
        {errors.type && <Text style={styles.fieldError}>{errors.type}</Text>}
        <View style={styles.typeGrid}>
          {PROFESSIONAL_TYPES.map(({ type, emoji, desc }) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeCard,
                selectedType === type && styles.typeCardActive,
              ]}
              onPress={() => setSelectedType(type)}
              activeOpacity={0.75}
            >
              <Text style={styles.typeEmoji}>{emoji}</Text>
              <Text style={[styles.typeName, selectedType === type && styles.typeNameActive]}>
                {type}
              </Text>
              <Text style={styles.typeDesc}>{desc}</Text>
              {selectedType === type && (
                <View style={styles.typeCheck}>
                  <Text style={styles.typeCheckText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          {apiError && <ErrorBanner message={apiError} />}

          <InputField
            label="Years of Experience"
            placeholder="e.g. 5"
            value={experienceYears}
            onChangeText={setExperienceYears}
            keyboardType="numeric"
            error={errors.experience}
          />

          <InputField
            label="Medical Council Registration Number"
            placeholder="e.g. MCI-12345 / State Council No."
            value={registrationNumber}
            onChangeText={setRegistrationNumber}
            autoCapitalize="characters"
            autoCorrect={false}
            error={errors.registration}
          />

          {/* Info note */}
          <View style={styles.infoNote}>
            <Text style={styles.infoNoteText}>
              ℹ️  Your registration number will be cross-verified with the Medical Council of India (MCI) database before you receive emergency alerts.
            </Text>
          </View>

          <PrimaryButton
            title="Continue to Document Upload →"
            onPress={handleContinue}
            loading={isLoading}
            style={styles.submitBtn}
          />

        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  glowTop: {
    position: 'absolute', top: -120, right: -80,
    width: 320, height: 320, borderRadius: 160,
    backgroundColor: 'rgba(230, 57, 70, 0.09)',
  },
  scroll: { padding: Spacing.lg, paddingBottom: Spacing.xxl, flexGrow: 1 },

  // Step indicator
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', marginBottom: Spacing.xl },
  stepItem: { alignItems: 'center', width: 72 },
  stepDot: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1.5, borderColor: Colors.surfaceBorder,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  stepDotActive: { borderColor: Colors.primary, backgroundColor: 'rgba(230,57,70,0.15)' },
  stepDotDone: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  stepCheck: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  stepNum: { color: Colors.textMuted, fontSize: Typography.fontSize.sm, fontWeight: '600' },
  stepNumActive: { color: Colors.primary },
  stepLabel: { color: Colors.textMuted, fontSize: 10, textAlign: 'center' },
  stepLabelActive: { color: Colors.textSecondary },
  stepLine: { flex: 1, height: 1.5, backgroundColor: Colors.surfaceBorder, marginTop: 15, marginHorizontal: 4 },
  stepLineDone: { backgroundColor: Colors.primary },

  // Header
  header: { marginBottom: Spacing.lg },
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

  // Type Selector
  sectionLabel: {
    color: Colors.textSecondary, fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium, marginBottom: 6, marginLeft: 2,
  },
  fieldError: { color: Colors.statusRed, fontSize: Typography.fontSize.xs, marginBottom: 8, marginLeft: 2 },
  typeGrid: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  typeCard: {
    flex: 1, alignItems: 'center', padding: Spacing.md,
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5, borderColor: Colors.surfaceBorder,
    position: 'relative',
  },
  typeCardActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(230, 57, 70, 0.1)',
  },
  typeEmoji: { fontSize: 28, marginBottom: 8 },
  typeName: {
    color: Colors.textSecondary, fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  typeNameActive: { color: Colors.primary },
  typeDesc: { color: Colors.textMuted, fontSize: 9, textAlign: 'center', marginTop: 3 },
  typeCheck: {
    position: 'absolute', top: 6, right: 6,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  typeCheckText: { color: Colors.white, fontSize: 10, fontWeight: '700' },

  // Form
  form: { marginTop: Spacing.sm },
  infoNote: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: BorderRadius.md, padding: Spacing.md,
    marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.surfaceBorder,
  },
  infoNoteText: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, lineHeight: 18 },
  submitBtn: { marginBottom: Spacing.sm },
});

export default ProfessionalDetailsScreen;
