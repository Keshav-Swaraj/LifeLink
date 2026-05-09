import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Audio } from 'expo-av';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import NetInfo from '@react-native-community/netinfo';
import { runAITriage } from '../lib/gemini';
import { submitEmergency, uploadPhotos } from '../services/emergencyService';
import { syncQueue } from '../services/offlineQueue';
import 'react-native-url-polyfill/auto';

const { width } = Dimensions.get('window');

const SEVERITY_CONFIG = {
  red:     { color: '#FF2D55', label: 'CRITICAL', emoji: '🔴' },
  orange:  { color: '#FF6B00', label: 'URGENT',   emoji: '🟠' },
  yellow:  { color: '#FFD60A', label: 'MODERATE', emoji: '🟡' },
  unknown: { color: '#8E8E93', label: 'ANALYZING',emoji: '⚪' },
};

export default function SOSScreen() {
  // Permissions
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micGranted, setMicGranted]   = useState(false);
  const [locGranted, setLocGranted]   = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);

  // State machine
  const [phase, setPhase] = useState('idle'); 
  // idle → consent → recording → capturing → analyzing → result | error

  const [recording, setRecording]     = useState(null);
  const [transcript, setTranscript]   = useState('');
  const [photos, setPhotos]           = useState([]);
  const [location, setLocation]       = useState(null);
  const [triageResult, setTriageResult] = useState(null);
  const [isOnline, setIsOnline]       = useState(true);
  const [statusMsg, setStatusMsg]     = useState('');

  // Camera ref for burst capture
  const cameraRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Monitor connectivity
  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      const online = state.isConnected && state.isInternetReachable;
      setIsOnline(!!online);
      if (online) syncQueue().catch(() => {});
    });
    return () => unsub();
  }, []);

  // Pulse animation for SOS button
  useEffect(() => {
    if (phase === 'idle') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [phase]);

  // ─── CONSENT ─────────────────────────────────────────────────────────────

  async function handleSOSPress() {
    // Request all permissions upfront with explanation
    const micStatus = await Audio.requestPermissionsAsync();
    const locStatus = await Location.requestForegroundPermissionsAsync();
    const camStatus = await requestCameraPermission();

    const allGranted = micStatus.granted && locStatus.granted && camStatus.granted;

    setMicGranted(micStatus.granted);
    setLocGranted(locStatus.granted);

    if (!allGranted) {
      Alert.alert(
        'Permissions Required',
        'LifeLink needs microphone, camera, and location access to send an accurate emergency alert. Please grant all permissions.',
        [{ text: 'OK' }]
      );
      return;
    }

    setConsentGiven(true);
    setPhase('consent');
  }

  async function handleConfirmSOS() {
    setPhase('recording');
    await startRecording();
  }

  // ─── RECORDING ───────────────────────────────────────────────────────────

  async function startRecording() {
    setStatusMsg('🎙️ Speak now — describe the emergency...');
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);

      // Auto-stop after 10 seconds
      setTimeout(async () => {
        await stopRecording(rec);
      }, 10000);
    } catch (err) {
      console.error('Recording failed:', err);
      setPhase('error');
      setStatusMsg('❌ Microphone error: ' + err.message);
    }
  }

  async function stopRecording(rec) {
    const activeRec = rec || recording;
    if (!activeRec) return;
    try {
      const uri = activeRec.getURI();
      await activeRec.stopAndUnloadAsync();
      setRecording(null);
      
      // Store the URI for later processing
      await capturePhotosAndLocation(uri);
    } catch (err) {
      console.error('Stop recording error:', err);
    }
  }

  // ─── BURST PHOTOS + LOCATION ──────────────────────────────────────────────

  async function capturePhotosAndLocation(audioUri) {
    setPhase('capturing');
    setStatusMsg('📸 Capturing scene photos...');

    const capturedPhotos = [];

    try {
      // Burst capture: 6 photos
      for (let i = 0; i < 6; i++) {
        if (cameraRef.current) {
          const photo = await cameraRef.current.takePictureAsync({
            quality: 0.6,
            base64: true,
            skipProcessing: true,
          });
          capturedPhotos.push({ uri: photo.uri, base64: photo.base64, mimeType: 'image/jpeg' });
          setStatusMsg(`📸 Captured ${i + 1}/6 photos...`);
          await new Promise(r => setTimeout(r, 400));
        }
      }
    } catch (err) {
      console.warn('Photo capture error:', err.message);
    }

    setPhotos(capturedPhotos);

    // Get location
    let loc = null;
    try {
      loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation(loc);
    } catch (err) {
      console.warn('Location error:', err.message);
    }

    await runTriage(audioUri, capturedPhotos, loc);
  }

  // ─── AI TRIAGE ───────────────────────────────────────────────────────────

  async function runTriage(audioUri, capturedPhotos, loc) {
    setPhase('analyzing');
    setStatusMsg('🧠 AI analyzing emergency...');

    try {
      // Read audio file as base64
      let audioBase64 = null;
      if (audioUri) {
        audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
          encoding: 'base64',
        });
      }

      const audioInput = audioBase64 ? { 
        base64: audioBase64, 
        mimeType: Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mp4' 
      } : null;

      const imageInputs = capturedPhotos.map(p => ({ base64: p.base64, mimeType: p.mimeType }));
      
      const result = await runAITriage(audioInput, imageInputs);
      setTriageResult(result);
      setTranscript(result.transcript);

      await submitPacket(result, capturedPhotos, loc);
    } catch (err) {
      console.error('Triage error:', err);
      setPhase('error');
      setStatusMsg('❌ AI analysis failed: ' + err.message);
    }
  }

  // ─── SUBMIT ───────────────────────────────────────────────────────────────

  async function submitPacket(triageData, capturedPhotos, loc) {
    setStatusMsg('📡 Sending emergency alert...');

    const clientId = `sos_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    // Upload photos if online
    let photoUrls = [];
    if (isOnline && capturedPhotos.length > 0) {
      try {
        photoUrls = await uploadPhotos(capturedPhotos.map(p => p.uri), clientId);
      } catch (err) {
        console.warn('Photo upload failed:', err.message);
      }
    }

    const packet = {
      client_id:         clientId,
      latitude:          loc?.coords?.latitude  ?? 0,
      longitude:         loc?.coords?.longitude ?? 0,
      voice_transcript:  transcript,
      photo_urls:        photoUrls,
      severity:          triageData.severity,
      ai_summary:        triageData.summary,
      ai_injuries:       triageData.injuries,
      ai_risks:          triageData.risks,
      ai_recommendations: triageData.recommendations,
      ai_raw_response:   triageData.raw,
      status:            'pending',
    };

    const outcome = await submitEmergency(packet, isOnline);

    if (outcome.queued) {
      setStatusMsg('📶 Saved offline. Will auto-sync when connected.');
    } else {
      setStatusMsg('✅ Emergency alert sent successfully!');
    }

    setPhase('result');
  }

  // ─── RESET ────────────────────────────────────────────────────────────────

  function resetSOS() {
    setPhase('idle');
    setTranscript('');
    setPhotos([]);
    setLocation(null);
    setTriageResult(null);
    setStatusMsg('');
    setConsentGiven(false);
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────

  const severity = triageResult ? SEVERITY_CONFIG[triageResult.severity] : null;

  return (
    <View style={styles.container}>
      {/* Connectivity banner */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>📶 OFFLINE MODE — SOS will be queued locally</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Text style={styles.appTitle}>LifeLink</Text>
        <Text style={styles.appSubtitle}>Golden Hour, Powered by AI</Text>

        {/* ── IDLE: Big SOS Button ── */}
        {phase === 'idle' && (
          <View style={styles.centerBlock}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity style={styles.sosButton} onPress={handleSOSPress} activeOpacity={0.85}>
                <Text style={styles.sosButtonText}>SOS</Text>
              </TouchableOpacity>
            </Animated.View>
            <Text style={styles.tapHint}>Tap to trigger emergency alert</Text>
          </View>
        )}

        {/* ── CONSENT ── */}
        {phase === 'consent' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>⚠️ Confirm Emergency</Text>
            <Text style={styles.cardBody}>
              LifeLink will:{'\n\n'}
              🎙️ Record your voice (10 seconds){'\n'}
              📸 Capture 6 scene photos{'\n'}
              📍 Share your GPS location{'\n\n'}
              This data will be sent to verified medical responders and hospitals nearby.
            </Text>
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmSOS}>
              <Text style={styles.confirmButtonText}>I Confirm — Send SOS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={resetSOS}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── RECORDING / CAPTURING / ANALYZING ── */}
        {['recording', 'capturing', 'analyzing'].includes(phase) && (
          <View style={styles.card}>
            <ActivityIndicator size="large" color="#FF2D55" style={{ marginBottom: 16 }} />
            <Text style={styles.statusText}>{statusMsg}</Text>

            {/* Live camera preview */}
            {phase === 'capturing' && (
              <View style={styles.cameraContainer}>
                <CameraView
                  ref={cameraRef}
                  style={styles.camera}
                  facing="back"
                />
              </View>
            )}

            {phase === 'recording' && (
              <TouchableOpacity style={styles.stopButton} onPress={() => stopRecording(null)}>
                <Text style={styles.stopButtonText}>⏹ Stop Recording Early</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── RESULT ── */}
        {phase === 'result' && triageResult && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Emergency Alert Sent</Text>
            <Text style={styles.statusText}>{statusMsg}</Text>

            {/* Severity Badge */}
            <View style={[styles.severityBadge, { backgroundColor: severity?.color }]}>
              <Text style={styles.severityEmoji}>{severity?.emoji}</Text>
              <Text style={styles.severityLabel}>{severity?.label}</Text>
            </View>

            {/* AI Summary and Transcript */}
            <Text style={styles.sectionTitle}>AI Summary</Text>
            <Text style={styles.cardBody}>{triageResult.summary}</Text>

            {triageResult.transcript && (
              <>
                <Text style={styles.sectionTitle}>Voice Transcript</Text>
                <Text style={[styles.cardBody, { fontStyle: 'italic' }]}>"{triageResult.transcript}"</Text>
              </>
            )}

            {triageResult.injuries?.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Detected Injuries</Text>
                {triageResult.injuries.map((inj, i) => (
                  <Text key={i} style={styles.listItem}>• {inj}</Text>
                ))}
              </>
            )}

            {triageResult.recommendations?.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>First Aid Recommendations</Text>
                {triageResult.recommendations.map((rec, i) => (
                  <Text key={i} style={styles.listItem}>• {rec}</Text>
                ))}
              </>
            )}

            <TouchableOpacity style={styles.resetButton} onPress={resetSOS}>
              <Text style={styles.resetButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── ERROR ── */}
        {phase === 'error' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Something went wrong</Text>
            <Text style={styles.cardBody}>{statusMsg}</Text>
            <TouchableOpacity style={styles.resetButton} onPress={resetSOS}>
              <Text style={styles.resetButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  offlineBanner: {
    backgroundColor: '#FF6B00',
    paddingVertical: 8,
    alignItems: 'center',
  },
  offlineBannerText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  appTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FF2D55',
    letterSpacing: 2,
  },
  appSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 40,
    letterSpacing: 1,
  },
  centerBlock: {
    alignItems: 'center',
    marginTop: 20,
  },
  sosButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#FF2D55',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF2D55',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
  },
  sosButtonText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 4,
  },
  tapHint: {
    marginTop: 24,
    fontSize: 14,
    color: '#636366',
  },
  card: {
    width: '100%',
    backgroundColor: '#1C1C1E',
    borderRadius: 20,
    padding: 24,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  cardBody: {
    fontSize: 15,
    color: '#AEAEB2',
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#636366',
    marginTop: 16,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  listItem: {
    fontSize: 14,
    color: '#AEAEB2',
    marginBottom: 4,
    lineHeight: 20,
  },
  statusText: {
    fontSize: 16,
    color: '#E5E5EA',
    textAlign: 'center',
    marginBottom: 12,
  },
  cameraContainer: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 16,
  },
  camera: {
    flex: 1,
  },
  confirmButton: {
    marginTop: 20,
    backgroundColor: '#FF2D55',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  cancelButton: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelButtonText: {
    color: '#636366',
    fontSize: 15,
  },
  stopButton: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#FF2D55',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  stopButtonText: {
    color: '#FF2D55',
    fontSize: 15,
    fontWeight: '700',
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    marginVertical: 16,
    gap: 8,
  },
  severityEmoji: {
    fontSize: 22,
  },
  severityLabel: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
  },
  resetButton: {
    marginTop: 24,
    backgroundColor: '#2C2C2E',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#AEAEB2',
    fontSize: 16,
    fontWeight: '700',
  },
});
