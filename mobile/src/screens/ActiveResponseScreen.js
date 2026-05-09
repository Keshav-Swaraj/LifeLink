/**
 * ActiveResponseScreen.js
 * 
 * Screen for the RESPONDER after they accept an emergency.
 * - Shows victim location on a live map
 * - Broadcasts responder's own GPS to Supabase every 3 seconds
 * - Victim can see the responder's marker moving on their map
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, Animated,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

const MAP_DARK_STYLE = [
  { "elementType": "geometry", "stylers": [{ "color": "#080808" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#4a4a4a" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#080808" }] },
  { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#161616" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#242424" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] },
];

export default function ActiveResponseScreen({ route }) {
  const navigation = useNavigation();
  const {
    emergencyId,
    aiSummary,
    photoUrls = [],
    address,
    victimLatitude,
    victimLongitude,
  } = route?.params ?? {};

  const [responderLocation, setResponderLocation] = useState(null);
  const [status, setStatus] = useState('accepted'); // accepted → arrived
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [locationSub, setLocationSub] = useState(null);

  const mapRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for victim marker
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.6, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Start watching responder's location and broadcasting to Supabase
  useEffect(() => {
    let intervalId = null;
    let lastCoords = null;

    async function startTracking() {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== 'granted') return;

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 2000,
          distanceInterval: 5,
        },
        (loc) => {
          lastCoords = loc.coords;
          setResponderLocation(loc.coords);
        }
      );
      setLocationSub(sub);

      // Broadcast to Supabase every 3 seconds
      intervalId = setInterval(async () => {
        if (!lastCoords || !emergencyId) return;
        try {
          await supabase
            .from('emergencies')
            .update({
              responder_lat: lastCoords.latitude,
              responder_lng: lastCoords.longitude,
              responder_heading: lastCoords.heading ?? 0,
            })
            .eq('id', emergencyId);
        } catch (e) {
          console.warn('[ActiveResponse] GPS broadcast failed:', e.message);
        }
      }, 3000);
    }

    startTracking();

    return () => {
      if (locationSub) locationSub.remove();
      if (intervalId) clearInterval(intervalId);
    };
  }, [emergencyId]);

  // Fit map to show both markers when both are available
  useEffect(() => {
    if (mapRef.current && responderLocation && victimLatitude && victimLongitude) {
      mapRef.current.fitToCoordinates(
        [
          { latitude: responderLocation.latitude, longitude: responderLocation.longitude },
          { latitude: victimLatitude, longitude: victimLongitude },
        ],
        { edgePadding: { top: 80, right: 60, bottom: 80, left: 60 }, animated: true }
      );
    }
  }, [responderLocation]);

  async function handleMarkArrived() {
    try {
      await supabase
        .from('emergencies')
        .update({ status: 'arrived' })
        .eq('id', emergencyId);
      setStatus('arrived');
      Alert.alert('Marked as Arrived', 'The victim has been notified that you have arrived.');
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  }

  async function handleResolve() {
    try {
      await supabase
        .from('emergencies')
        .update({ status: 'resolved' })
        .eq('id', emergencyId);
      navigation.navigate('SOSScreen');
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  }

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const initialRegion = victimLatitude && victimLongitude ? {
    latitude: victimLatitude,
    longitude: victimLongitude,
    latitudeDelta: 0.03,
    longitudeDelta: 0.03,
  } : { latitude: 20.5937, longitude: 78.9629, latitudeDelta: 5, longitudeDelta: 5 };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>RESPONDING TO EMERGENCY</Text>
          <Text style={styles.headerTimer}>⏱ {formatTime(elapsedSeconds)}</Text>
        </View>
        <View style={[styles.statusPill, status === 'arrived' && styles.statusPillGreen]}>
          <Text style={styles.statusPillText}>
            {status === 'accepted' ? '🚑 EN ROUTE' : '✅ ARRIVED'}
          </Text>
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFillObject}
          provider={PROVIDER_DEFAULT}
          customMapStyle={MAP_DARK_STYLE}
          initialRegion={initialRegion}
        >
          {/* Victim marker */}
          {victimLatitude && victimLongitude && (
            <>
              <Marker coordinate={{ latitude: victimLatitude, longitude: victimLongitude }}>
                <Animated.View style={[styles.victimPulseRing, { transform: [{ scale: pulseAnim }] }]} />
              </Marker>
              <Marker coordinate={{ latitude: victimLatitude, longitude: victimLongitude }} anchor={{ x: 0.5, y: 0.5 }}>
                <View style={styles.victimMarker}>
                  <Ionicons name="person" size={14} color="#FFF" />
                </View>
              </Marker>
            </>
          )}

          {/* Responder (me) marker */}
          {responderLocation && (
            <Marker coordinate={{ latitude: responderLocation.latitude, longitude: responderLocation.longitude }} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.responderMarker}>
                <Text style={{ fontSize: 20 }}>🚑</Text>
              </View>
            </Marker>
          )}

          {/* Route line between responder and victim */}
          {responderLocation && victimLatitude && victimLongitude && (
            <Polyline
              coordinates={[
                { latitude: responderLocation.latitude, longitude: responderLocation.longitude },
                { latitude: victimLatitude, longitude: victimLongitude },
              ]}
              strokeColor="#0A84FF"
              strokeWidth={2}
              lineDashPattern={[8, 6]}
            />
          )}
        </MapView>

        {/* Map legend */}
        <View style={styles.mapLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FF2D55' }]} />
            <Text style={styles.legendText}>Victim</Text>
          </View>
          <View style={styles.legendItem}>
            <Text style={{ fontSize: 12 }}>🚑</Text>
            <Text style={styles.legendText}>You</Text>
          </View>
        </View>
      </View>

      {/* Bottom panel */}
      <ScrollView style={styles.bottomPanel} contentContainerStyle={{ padding: 20 }}>
        {/* AI Summary */}
        <Text style={styles.sectionLabel}>AI EMERGENCY SUMMARY</Text>
        <Text style={styles.summaryText}>{aiSummary || 'No summary available.'}</Text>

        {/* Address */}
        {address ? (
          <>
            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>📍 VICTIM LOCATION</Text>
            <Text style={styles.summaryText}>{address}</Text>
          </>
        ) : null}

        {/* Actions */}
        <View style={styles.actionRow}>
          {status === 'accepted' && (
            <TouchableOpacity style={styles.arrivedBtn} onPress={handleMarkArrived}>
              <Ionicons name="checkmark-circle" size={20} color="#FFF" />
              <Text style={styles.arrivedBtnText}>I've Arrived</Text>
            </TouchableOpacity>
          )}
          {status === 'arrived' && (
            <TouchableOpacity style={[styles.arrivedBtn, { backgroundColor: '#2C2C2E' }]} onPress={handleResolve}>
              <Ionicons name="flag" size={20} color="#FFF" />
              <Text style={styles.arrivedBtnText}>Mark Resolved & Exit</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  header: {
    paddingTop: 52,
    paddingBottom: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0A0A0F',
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2E',
    zIndex: 10,
  },
  headerLabel: { color: '#FF2D55', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  headerTimer: { color: '#FFF', fontSize: 22, fontWeight: '900', marginTop: 2 },
  statusPill: {
    backgroundColor: '#FF6B00',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
  },
  statusPillGreen: { backgroundColor: '#34C759' },
  statusPillText: { color: '#FFF', fontWeight: '800', fontSize: 12, letterSpacing: 1 },
  mapContainer: { flex: 1, position: 'relative' },
  mapLegend: {
    position: 'absolute', top: 12, left: 12,
    backgroundColor: 'rgba(10,10,15,0.85)',
    borderRadius: 12, padding: 10, gap: 8,
    borderWidth: 1, borderColor: '#2C2C2E',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  victimPulseRing: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(255,45,85,0.25)',
    borderWidth: 2, borderColor: '#FF2D55',
  },
  victimMarker: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#FF2D55',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFF',
  },
  responderMarker: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(10,10,15,0.8)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#0A84FF',
  },
  bottomPanel: { maxHeight: 260, backgroundColor: '#0A0A0F' },
  sectionLabel: {
    fontSize: 11, fontWeight: '800', color: '#8E8E93',
    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8,
  },
  summaryText: { color: '#E5E5EA', fontSize: 15, lineHeight: 22 },
  actionRow: { marginTop: 20, gap: 12 },
  arrivedBtn: {
    backgroundColor: '#34C759',
    borderRadius: 16, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 10,
  },
  arrivedBtnText: { color: '#FFF', fontSize: 17, fontWeight: '800' },
});
