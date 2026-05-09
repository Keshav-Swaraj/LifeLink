import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Animated,
} from 'react-native';
import { Audio } from 'expo-av';
import { CameraView } from 'expo-camera';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system/legacy';
// ImageManipulator removed due to SDK 54 compatibility issue
import NetInfo from '@react-native-community/netinfo';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Circle, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Speech from 'expo-speech';

import { runAITriage } from '../lib/groq';
import { submitEmergency, uploadPhotos } from '../services/emergencyService';
import { syncQueue } from '../services/offlineQueue';
import { supabase } from '../lib/supabase';

const SEVERITY_CONFIG = {
  red:     { color: '#FF2D55', label: 'CRITICAL', emoji: '🔴' },
  orange:  { color: '#FF6B00', label: 'URGENT',   emoji: '🟠' },
  yellow:  { color: '#FFD60A', label: 'MODERATE', emoji: '🟡' },
  green:   { color: '#34C759', label: 'SAFE',     emoji: '🟢' },
  unknown: { color: '#8E8E93', label: 'ANALYZING',emoji: '⚪' },
};

const MAP_DARK_STYLE = [
  { "elementType": "geometry", "stylers": [{ "color": "#080808" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#4a4a4a" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#080808" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] }
];

export default function ActiveSOSScreen() {
  const navigation = useNavigation();

  const [phase, setPhase] = useState('recording'); 

  const [recording, setRecording]     = useState(null);
  const [transcript, setTranscript]   = useState('');
  const [photos, setPhotos]           = useState([]);
  const [incidentLoc, setIncidentLoc] = useState(null);
  
  const [triageResult, setTriageResult] = useState(null);
  const [isOnline, setIsOnline]       = useState(true);
  const [statusMsg, setStatusMsg]     = useState('');

  const cameraRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(0)).current;

  // Tracking phase state
  const [emergencyId, setEmergencyId]         = useState(null);
  const [trackingStatus, setTrackingStatus]   = useState('pending');
  const [responderCoords, setResponderCoords] = useState(null);
  const trackingChannelRef = useRef(null);
  const [routeCoords, setRouteCoords] = useState(null);
  const [etaMinutes, setEtaMinutes] = useState(null);

  useEffect(() => {
    if (incidentLoc?.coords && responderCoords && phase === 'tracking') {
      const fetchRoute = async () => {
        try {
          const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${responderCoords.longitude},${responderCoords.latitude};${incidentLoc.coords.longitude},${incidentLoc.coords.latitude}?overview=full&geometries=geojson`);
          const data = await res.json();
          if (data.routes && data.routes.length > 0) {
            setRouteCoords(data.routes[0].geometry.coordinates.map(c => ({ latitude: c[1], longitude: c[0] })));
            setEtaMinutes(Math.ceil(data.routes[0].duration / 60));
          } else {
            setRouteCoords(null);
          }
        } catch (err) {
          console.error("OSRM fetch error", err);
          setRouteCoords(null);
        }
      };
      fetchRoute();
    }
  }, [incidentLoc, responderCoords, phase]);

  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      const online = state.isConnected && state.isInternetReachable;
      setIsOnline(!!online);
      if (online) syncQueue().catch(() => {});
    });

    startRecording(); // Start immediately

    return () => unsub();
  }, []);

  useEffect(() => {
    if (phase === 'analyzing') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 0, useNativeDriver: true })
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
    }
  }, [phase]);

  async function startRecording() {
    setStatusMsg('🎙️ Speak now — describe the emergency...');
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);

      setTimeout(async () => {
        await stopRecording(rec);
      }, 5000); // 5 seconds buffer
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
      await capturePhotosAndLocation(uri);
    } catch (err) {
      if (err.message && !err.message.includes('already been unloaded')) {
        console.error('Stop recording error:', err);
      }
    }
  }

  async function capturePhotosAndLocation(audioUri) {
    setPhase('capturing');
    setStatusMsg('📸 Capturing scene photos...');

    const capturedPhotos = [];

    try {
      for (let i = 0; i < 2; i++) { // 2 photos, very low quality to stay under Groq limit
        if (cameraRef.current) {
          const photo = await cameraRef.current.takePictureAsync({
            quality: 0.1, // Aggressive compression
            base64: true,
            skipProcessing: false, // Must be false on Android for 'quality' to apply!
            exif: false,
          });
          
          capturedPhotos.push({ uri: photo.uri, base64: photo.base64, mimeType: 'image/jpeg' });
          setStatusMsg(`📸 Captured ${i + 1}/2 photos...`);
          await new Promise(r => setTimeout(r, 400));
        }
      }
    } catch (err) {
      console.warn('Photo capture error:', err.message);
    }

    setPhotos(capturedPhotos);

    let loc = null;
    try {
      loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setIncidentLoc(loc);
    } catch (err) {
      console.warn('Location error:', err.message);
    }

    await runTriage(audioUri, capturedPhotos, loc);
  }

  async function runTriage(audioUri, capturedPhotos, loc) {
    setPhase('analyzing');
    setStatusMsg('🧠 AI analyzing emergency & searching for responders...');

    try {
      let audioBase64 = null;
      if (audioUri) {
        audioBase64 = await FileSystem.readAsStringAsync(audioUri, { encoding: 'base64' });
      }

      const audioInput = audioBase64 ? { base64: audioBase64, mimeType: Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mp4' } : null;
      const imageInputs = capturedPhotos.map(p => ({ base64: p.base64, mimeType: p.mimeType }));
      
      const result = await runAITriage(audioInput, imageInputs);
      setTriageResult(result);
      setTranscript(result.transcript ?? '');

      if (result.severity === 'red') {
        await submitPacket(result, capturedPhotos, loc);
      } else if (result.severity === 'green') {
        setPhase('green_safe');
        Speech.speak("No danger detected. Canceling emergency alert.");
        setTimeout(() => {
          navigation.navigate('SOSScreen');
        }, 4000);
      } else {
        // Orange or Yellow
        setPhase('ai_call');
        Speech.speak("This is LifeLink A.I. We detected a moderate incident. Do you need an ambulance?", { rate: 0.95, pitch: 1.0 });
      }
    } catch (err) {
      console.error('Triage error:', err);
      setPhase('error');
      setStatusMsg('❌ AI analysis failed: ' + err.message);
    }
  }

  async function handleUserNeedsHelp() {
    Speech.stop();
    await submitPacket(triageResult, photos, incidentLoc);
  }

  function handleUserIsSafe() {
    Speech.stop();
    setPhase('green_safe');
    setTimeout(() => {
      navigation.navigate('SOSScreen');
    }, 1500);
  }

  async function submitPacket(triageData, capturedPhotos, loc) {
    setStatusMsg('📡 Sending emergency alert...');
    setPhase('submitting');

    const clientId = `sos_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    let photoUrls = [];
    if (isOnline && capturedPhotos.length > 0) {
      try {
        photoUrls = await uploadPhotos(capturedPhotos.map(p => p.uri), clientId);
      } catch (err) {
        console.warn('Photo upload failed:', err.message);
      }
    }

    let address = null;
    if (loc?.coords) {
      try {
        const [place] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (place) {
          address = [place.name, place.street, place.district, place.city, place.region].filter(Boolean).join(', ');
        }
      } catch (err) {
        console.warn('Reverse geocode failed:', err.message);
      }
    }

    const packet = {
      client_id:          clientId,
      latitude:           loc?.coords?.latitude  ?? 0,
      longitude:          loc?.coords?.longitude ?? 0,
      address,
      voice_transcript:   triageData.transcript ?? '',
      photo_urls:         photoUrls,
      severity:           triageData.severity,
      ai_summary:         triageData.summary,
      ai_injuries:        triageData.injuries,
      ai_risks:           triageData.risks,
      ai_recommendations: triageData.recommendations,
      ai_raw_response:    triageData.raw,
      status:             'pending',
    };

    const outcome = await submitEmergency(packet, isOnline);

    if (outcome.queued) {
      setStatusMsg('📶 Saved offline. Will auto-sync when connected.');
      setPhase('result');
    } else {
      // Got a real emergency ID — start live tracking
      const newId = outcome.data?.id;
      setEmergencyId(newId);
      setStatusMsg('✅ Emergency alert sent! Connecting to responders...');
      setPhase('tracking');
      if (newId) startTrackingSubscription(newId);
    }
  }

  function startTrackingSubscription(eid) {
    const channel = supabase
      .channel(`emergency-tracking-${eid}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'emergencies', filter: `id=eq.${eid}` },
        (payload) => {
          const row = payload.new;
          if (row.status) setTrackingStatus(row.status);
          if (row.responder_lat && row.responder_lng) {
            setResponderCoords({ latitude: row.responder_lat, longitude: row.responder_lng });
          }
        }
      )
      .subscribe();
    trackingChannelRef.current = channel;
  }

  function handleCancel() {
    Speech.stop();
    navigation.goBack();
  }

  const severity = triageResult ? SEVERITY_CONFIG[triageResult.severity] : null;

  const mockHospitals = useMemo(() => {
    if (!incidentLoc) return [];
    return [
      { id: 1, lat: incidentLoc.coords.latitude + 0.01, lng: incidentLoc.coords.longitude + 0.015 },
      { id: 2, lat: incidentLoc.coords.latitude - 0.008, lng: incidentLoc.coords.longitude - 0.012 },
    ];
  }, [incidentLoc]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Emergency Mode</Text>
        <TouchableOpacity style={styles.closeBtn} onPress={handleCancel}>
          <Ionicons name="close" size={28} color="#FFF" />
        </TouchableOpacity>
      </View>

      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>📶 OFFLINE MODE — SOS will be queued locally</Text>
        </View>
      )}

      {/* Background Camera Layer (only visible in recording/capturing) */}
      {(phase === 'recording' || phase === 'capturing') && (
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFillObject} facing="back" />
      )}
      
      {/* Semi-transparent overlay during capture */}
      {(phase === 'recording' || phase === 'capturing') && (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1 }]} />
      )}

      <ScrollView contentContainerStyle={[styles.scrollContent, { zIndex: 10 }]} showsVerticalScrollIndicator={false}>
        
        {(phase === 'recording' || phase === 'capturing' || phase === 'submitting') && (
          <View style={styles.card}>
            <ActivityIndicator size="large" color="#FF2D55" style={{ marginBottom: 16 }} />
            <Text style={styles.statusText}>{statusMsg}</Text>

            {phase === 'recording' && (
              <TouchableOpacity style={styles.stopButton} onPress={() => stopRecording(null)}>
                <Text style={styles.stopButtonText}>⏹ Stop Recording Early</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {phase === 'analyzing' && incidentLoc && (
          <View style={styles.card}>
            <Text style={styles.statusText}>{statusMsg}</Text>
            <View style={styles.mapContainer}>
              <MapView 
                style={styles.map} 
                provider={PROVIDER_DEFAULT} 
                customMapStyle={MAP_DARK_STYLE}
                initialRegion={{
                  latitude: incidentLoc.coords.latitude,
                  longitude: incidentLoc.coords.longitude,
                  latitudeDelta: 0.04,
                  longitudeDelta: 0.04,
                }}
                scrollEnabled={false}
                zoomEnabled={false}
              >
                <Marker coordinate={{ latitude: incidentLoc.coords.latitude, longitude: incidentLoc.coords.longitude }}>
                  <View style={styles.userMarker} />
                </Marker>
                
                {/* Radar pulse animation */}
                <Marker coordinate={{ latitude: incidentLoc.coords.latitude, longitude: incidentLoc.coords.longitude }}>
                  <Animated.View style={[
                    styles.radarPulse,
                    {
                      transform: [
                        { scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 3] }) }
                      ],
                      opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] })
                    }
                  ]} />
                </Marker>

                {mockHospitals.map(h => (
                  <Marker key={h.id} coordinate={{ latitude: h.lat, longitude: h.lng }}>
                    <Ionicons name="medical" size={16} color="#FF2D55" />
                  </Marker>
                ))}
              </MapView>
            </View>
          </View>
        )}

        {phase === 'green_safe' && (
          <View style={styles.card}>
            <Ionicons name="checkmark-circle" size={64} color="#34C759" style={{ alignSelf: 'center' }} />
            <Text style={[styles.cardTitle, { textAlign: 'center', marginTop: 16 }]}>False Alarm</Text>
            <Text style={styles.cardBody}>No danger detected. Canceling the emergency alert automatically.</Text>
          </View>
        )}

        {phase === 'ai_call' && (
          <View style={[styles.card, { borderColor: '#FFD60A', borderWidth: 2 }]}>
            <Ionicons name="call" size={48} color="#FFD60A" style={{ alignSelf: 'center', marginBottom: 12 }} />
            <Text style={[styles.cardTitle, { textAlign: 'center' }]}>Incoming AI Call</Text>
            <Text style={[styles.cardBody, { textAlign: 'center', color: '#FFF' }]}>
              "This is LifeLink AI. We detected a moderate incident. Do you need an ambulance?"
            </Text>
            
            <TouchableOpacity style={[styles.confirmButton, { backgroundColor: '#FF2D55', marginTop: 30 }]} onPress={handleUserNeedsHelp}>
              <Text style={styles.confirmButtonText}>YES, I NEED HELP</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.cancelButton, { backgroundColor: '#3A3A3C', borderRadius: 16, marginTop: 16 }]} onPress={handleUserIsSafe}>
              <Text style={[styles.cancelButtonText, { color: '#FFF' }]}>NO, I'M FINE</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === 'result' && triageResult && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Emergency Alert Sent</Text>
            <Text style={styles.statusText}>{statusMsg}</Text>

            <View style={[styles.severityBadge, { backgroundColor: severity?.color }]}>
              <Text style={styles.severityEmoji}>{severity?.emoji}</Text>
              <Text style={styles.severityLabel}>{severity?.label}</Text>
            </View>

            <Text style={styles.sectionTitle}>AI Summary</Text>
            <Text style={styles.cardBody}>{triageResult.summary}</Text>

            {triageResult.transcript ? (
              <View>
                <Text style={styles.sectionTitle}>Voice Transcript</Text>
                <Text style={[styles.cardBody, { fontStyle: 'italic' }]}>"{triageResult.transcript}"</Text>
              </View>
            ) : null}

            {triageResult.injuries?.length > 0 && (
              <View>
                <Text style={styles.sectionTitle}>Detected Injuries</Text>
                {triageResult.injuries.map((inj, i) => <Text key={i} style={styles.listItem}>• {inj}</Text>)}
              </View>
            )}

            {triageResult.recommendations?.length > 0 && (
              <View>
                <Text style={styles.sectionTitle}>First Aid Recommendations</Text>
                {triageResult.recommendations.map((rec, i) => <Text key={i} style={styles.listItem}>• {rec}</Text>)}
              </View>
            )}

            <TouchableOpacity style={styles.resetButton} onPress={handleCancel}>
              <Text style={styles.resetButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}

        {phase === 'error' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Something went wrong</Text>
            <Text style={styles.cardBody}>{statusMsg}</Text>
            <TouchableOpacity style={styles.resetButton} onPress={handleCancel}>
              <Text style={styles.resetButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* LIVE TRACKING PHASE */}
        {phase === 'tracking' && incidentLoc && (
          <View style={{ flex: 1 }}>
            <View style={[styles.trackingStatusPill, {
              backgroundColor:
                trackingStatus === 'arrived'    ? '#34C759' :
                trackingStatus === 'accepted'   ? '#FF6B00' :
                trackingStatus === 'dispatched' ? '#0A84FF' : '#3A3A3C'
            }]}>
              <Text style={styles.trackingStatusText}>
                {trackingStatus === 'pending'    && '⏳ Searching for responders...'}
                {trackingStatus === 'accepted'   && '🚑 Responder en route!'}
                {trackingStatus === 'dispatched' && '🏥 Ambulance dispatched!'}
                {trackingStatus === 'arrived'    && '✅ Responder has arrived!'}
              </Text>
            </View>

            <View style={styles.trackingMapContainer}>
              <MapView
                style={StyleSheet.absoluteFillObject}
                provider={PROVIDER_DEFAULT}
                customMapStyle={MAP_DARK_STYLE}
                initialRegion={{
                  latitude: incidentLoc.coords.latitude,
                  longitude: incidentLoc.coords.longitude,
                  latitudeDelta: 0.04,
                  longitudeDelta: 0.04,
                }}
              >
                <Marker coordinate={{ latitude: incidentLoc.coords.latitude, longitude: incidentLoc.coords.longitude }} anchor={{ x: 0.5, y: 0.5 }}>
                  <View style={styles.userMarker} />
                </Marker>

                {responderCoords && (
                  <Marker coordinate={responderCoords} anchor={{ x: 0.5, y: 0.5 }}>
                    <View style={styles.ambulanceMarker}>
                      <Text style={{ fontSize: 20 }}>🚑</Text>
                    </View>
                  </Marker>
                )}
                {routeCoords && (
                  <Polyline
                    coordinates={routeCoords}
                    strokeColor="#0A84FF"
                    strokeWidth={4}
                    lineDashPattern={[8, 6]}
                  />
                )}
              </MapView>

              <View style={styles.trackingLegend}>
                <View style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: '#0A84FF' }]} />
                  <Text style={styles.legendLabel}>You</Text>
                </View>
                {responderCoords && (
                  <View style={styles.legendRow}>
                    <Text style={{ fontSize: 12 }}>🚑</Text>
                    <Text style={styles.legendLabel}>Responder</Text>
                  </View>
                )}
              </View>
            </View>

            {etaMinutes !== null && (
              <View style={[styles.card, { marginTop: 12, alignItems: 'center' }]}>
                <Text style={styles.sectionTitle}>Estimated Time of Arrival</Text>
                <Text style={{ fontSize: 36, fontWeight: '900', color: '#34C759', marginTop: 8 }}>
                  {etaMinutes} min
                </Text>
              </View>
            )}

            <TouchableOpacity style={[styles.resetButton, { marginTop: 12 }]} onPress={handleCancel}>
              <Text style={styles.resetButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
    zIndex: 20,
    backgroundColor: '#0A0A0F',
  },
  headerTitle: {
    color: '#FF2D55',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  closeBtn: {
    padding: 4,
  },
  offlineBanner: {
    backgroundColor: '#FF6B00',
    paddingVertical: 8,
    alignItems: 'center',
    zIndex: 100,
  },
  offlineBannerText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 30,
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#3A3A3C',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  cardBody: {
    fontSize: 16,
    color: '#AEAEB2',
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  listItem: {
    fontSize: 15,
    color: '#E5E5EA',
    marginBottom: 6,
    lineHeight: 22,
  },
  statusText: {
    fontSize: 17,
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
  },
  stopButton: {
    marginTop: 24,
    borderWidth: 2,
    borderColor: '#FF2D55',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  stopButtonText: {
    color: '#FF2D55',
    fontSize: 16,
    fontWeight: '800',
  },
  confirmButton: {
    marginTop: 24,
    backgroundColor: '#FF2D55',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  cancelButtonText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '600',
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    marginVertical: 20,
    gap: 10,
  },
  severityEmoji: {
    fontSize: 24,
  },
  severityLabel: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
  },
  resetButton: {
    marginTop: 24,
    backgroundColor: '#2C2C2E',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
  mapContainer: {
    width: '100%',
    height: 240,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
  },
  map: {
    flex: 1,
  },
  userMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#0A84FF',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  radarPulse: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(10, 132, 255, 0.4)',
    borderWidth: 1,
    borderColor: '#0A84FF',
  },
  // ─── Tracking phase styles ───
  trackingStatusPill: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 12,
  },
  trackingStatusText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  trackingMapContainer: {
    height: 320,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    position: 'relative',
  },
  ambulanceMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(10,10,15,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FF6B00',
  },
  trackingLegend: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(10,10,15,0.85)',
    borderRadius: 10,
    padding: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { color: '#FFF', fontSize: 12, fontWeight: '600' },
});
