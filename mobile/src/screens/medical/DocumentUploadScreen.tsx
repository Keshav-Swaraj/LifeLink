// ============================================================
// DocumentUploadScreen.tsx — Step 3 of 3 for Medical Signup
// Uploads medical registration certificate to Supabase Storage
// ============================================================

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErrorBanner, PrimaryButton } from '../../components/shared';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';
import { RootStackParamList } from '../../navigation/AuthNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'DocumentUpload'>;
};

interface SelectedFile {
  uri: string;
  name: string;
  type: 'image' | 'document';
  size?: number;
}

const DocumentUploadScreen: React.FC<Props> = ({ navigation }) => {
  const { uploadCertificate, isLoading } = useAuth();

  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Pick from camera roll (image)
  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setSelectedFile({
        uri: asset.uri,
        name: asset.fileName ?? `certificate_${Date.now()}.jpg`,
        type: 'image',
        size: asset.fileSize,
      });
      setApiError(null);
    }
  };

  // Pick a PDF document
  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile({
          uri: asset.uri,
          name: asset.name,
          type: 'document',
          size: asset.size ?? undefined,
        });
        setApiError(null);
      }
    } catch (err) {
      setApiError('Could not open document picker. Please try again.');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setApiError('Please select a file to upload first.');
      return;
    }
    setUploading(true);
    setApiError(null);
    const { url, error } = await uploadCertificate(selectedFile.uri, selectedFile.name);
    setUploading(false);
    if (error) {
      setApiError(error);
    } else {
      // Certificate uploaded, onboarding complete → AuthNavigator will detect this and go to MainApp
      Alert.alert(
        '🎉 Registration Complete!',
        'Your certificate has been submitted for review. You will gain full responder access once verified.',
        [{ text: 'Start Using LifeLink', style: 'default' }]
      );
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.glowTop} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Step Indicator */}
        <View style={styles.stepRow}>
          {['Account', 'Credentials', 'Upload ID'].map((label, i) => (
            <React.Fragment key={i}>
              <View style={styles.stepItem}>
                <View style={[styles.stepDot, i === 2 && styles.stepDotActive, i < 2 && styles.stepDotDone]}>
                  {i < 2 ? (
                    <Text style={styles.stepCheck}>✓</Text>
                  ) : (
                    <Text style={[styles.stepNum, i === 2 && styles.stepNumActive]}>{i + 1}</Text>
                  )}
                </View>
                <Text style={[styles.stepLabel, i === 2 && styles.stepLabelActive]}>{label}</Text>
              </View>
              {i < 2 && <View style={[styles.stepLine, styles.stepLineDone]} />}
            </React.Fragment>
          ))}
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>🩺 STEP 3 OF 3</Text>
          </View>
          <Text style={styles.title}>Upload Your{'\n'}Medical Certificate</Text>
          <Text style={styles.subtitle}>
            Upload your MCI registration certificate or hospital ID to get verified as a responder.
          </Text>
        </View>

        {/* Upload Options */}
        {!selectedFile ? (
          <View style={styles.uploadArea}>
            <View style={styles.uploadPlaceholder}>
              <Text style={styles.uploadIcon}>📋</Text>
              <Text style={styles.uploadPlaceholderTitle}>No file selected</Text>
              <Text style={styles.uploadPlaceholderDesc}>
                Accepted: JPG, PNG, or PDF · Max 10 MB
              </Text>
            </View>

            <View style={styles.uploadBtnsRow}>
              <TouchableOpacity style={styles.uploadOptionBtn} onPress={handlePickImage} activeOpacity={0.8}>
                <Text style={styles.uploadOptionIcon}>🖼</Text>
                <Text style={styles.uploadOptionText}>Photo / Image</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.uploadOptionBtn} onPress={handlePickDocument} activeOpacity={0.8}>
                <Text style={styles.uploadOptionIcon}>📄</Text>
                <Text style={styles.uploadOptionText}>PDF Document</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* File Preview */
          <View style={styles.filePreview}>
            {selectedFile.type === 'image' ? (
              <Image source={{ uri: selectedFile.uri }} style={styles.previewImage} resizeMode="cover" />
            ) : (
              <View style={styles.pdfPreview}>
                <Text style={styles.pdfIcon}>📄</Text>
                <Text style={styles.pdfLabel}>PDF Document</Text>
              </View>
            )}

            <View style={styles.fileInfo}>
              <Text style={styles.fileName} numberOfLines={1}>{selectedFile.name}</Text>
              {selectedFile.size && (
                <Text style={styles.fileSize}>{formatFileSize(selectedFile.size)}</Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.changeFileBtn}
              onPress={selectedFile.type === 'image' ? handlePickImage : handlePickDocument}
            >
              <Text style={styles.changeFileBtnText}>Change file</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Guidelines */}
        <View style={styles.guidelines}>
          <Text style={styles.guidelinesTitle}>📝 Document Guidelines</Text>
          {[
            'Document must be clearly legible.',
            'Ensure all text and logos are visible.',
            'Do NOT upload expired certificates.',
            'Personal details must match your profile.',
          ].map((item, i) => (
            <View key={i} style={styles.guidelineItem}>
              <View style={styles.guidelineDot} />
              <Text style={styles.guidelineText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Submit */}
        {apiError && <ErrorBanner message={apiError} />}

        <PrimaryButton
          title={uploading ? 'Uploading...' : 'Submit & Complete Registration'}
          onPress={handleUpload}
          loading={uploading || isLoading}
          style={styles.submitBtn}
        />
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
    backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1.5, borderColor: Colors.surfaceBorder,
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
  header: { marginBottom: Spacing.xl },
  badge: {
    backgroundColor: 'rgba(230, 57, 70, 0.15)', borderRadius: BorderRadius.full,
    paddingHorizontal: 12, paddingVertical: 4, alignSelf: 'flex-start',
    marginBottom: Spacing.md, borderWidth: 1, borderColor: 'rgba(230, 57, 70, 0.3)',
  },
  badgeText: { color: Colors.primaryLight, fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.bold, letterSpacing: 1.2 },
  title: { color: Colors.textPrimary, fontSize: Typography.fontSize.xxl, fontWeight: Typography.fontWeight.extrabold, lineHeight: 36 },
  subtitle: { color: Colors.textSecondary, fontSize: Typography.fontSize.base, marginTop: 10, lineHeight: 22 },

  // Upload area
  uploadArea: { marginBottom: Spacing.xl },
  uploadPlaceholder: {
    backgroundColor: Colors.backgroundCard, borderRadius: BorderRadius.lg,
    borderWidth: 2, borderColor: Colors.surfaceBorder, borderStyle: 'dashed',
    padding: Spacing.xxl, alignItems: 'center', marginBottom: Spacing.lg,
  },
  uploadIcon: { fontSize: 40, marginBottom: Spacing.md },
  uploadPlaceholderTitle: { color: Colors.textSecondary, fontSize: Typography.fontSize.md, fontWeight: Typography.fontWeight.semibold },
  uploadPlaceholderDesc: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 6, textAlign: 'center' },
  uploadBtnsRow: { flexDirection: 'row', gap: Spacing.md },
  uploadOptionBtn: {
    flex: 1, backgroundColor: Colors.backgroundElevated, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md,
    alignItems: 'center', gap: 8,
  },
  uploadOptionIcon: { fontSize: 28 },
  uploadOptionText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },

  // File preview
  filePreview: {
    backgroundColor: Colors.backgroundCard, borderRadius: BorderRadius.lg,
    borderWidth: 1.5, borderColor: Colors.primary, overflow: 'hidden', marginBottom: Spacing.xl,
  },
  previewImage: { width: '100%', height: 180 },
  pdfPreview: {
    height: 130, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(230, 57, 70, 0.08)',
  },
  pdfIcon: { fontSize: 48, marginBottom: 8 },
  pdfLabel: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
  fileInfo: { padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.divider },
  fileName: { color: Colors.textPrimary, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
  fileSize: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, marginTop: 3 },
  changeFileBtn: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  changeFileBtnText: { color: Colors.primaryLight, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },

  // Guidelines
  guidelines: {
    backgroundColor: Colors.backgroundCard, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.surfaceBorder, padding: Spacing.md, marginBottom: Spacing.xl,
  },
  guidelinesTitle: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, marginBottom: Spacing.sm },
  guidelineItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  guidelineDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: Colors.primary, marginTop: 5 },
  guidelineText: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, lineHeight: 17, flex: 1 },

  submitBtn: { marginBottom: Spacing.sm },
});

export default DocumentUploadScreen;
