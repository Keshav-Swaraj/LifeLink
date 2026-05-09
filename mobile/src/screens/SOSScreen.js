import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  Vibration,
} from 'react-native';
import * as Location from 'expo-location';
import { useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import { useNavigation } from '@react-navigation/native';
import MapView, { Marker, Circle, UrlTile, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

const MAP_DARK_STYLE = [
  { "elementType": "geometry", "stylers": [{ "color": "#080808" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#4a4a4a" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#080808" }] },
  { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#111111" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#3d3d3d" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#0a0a0a" }] },
  { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#161616" }] },
  { "featureType": "road.arterial", "elementType": "geometry", "stylers": [{ "color": "#1e1e1e" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#242424" }] },
  { "featureType": "road.highway.controlled_access", "elementType": "geometry", "stylers": [{ "color": "#2a2a2a" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] }
];

export default function SOSScreen() {
  const { profile } = useAuth();
  const navigation = useNavigation();

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [location, setLocation] = useState(null);
  
  const [initialRegion] = useState({
    latitude: 20.5937,
    longitude: 78.9629,
    latitudeDelta: 10,
    longitudeDelta: 10,
  });

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const mapRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setLocation(loc);
          
          setTimeout(() => {
            if (mapRef.current) {
              mapRef.current.animateToRegion({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }, 2500); 
            }
          }, 800);

        } catch (err) {
          console.log("Could not fetch initial location", err);
        }
      }
    })();
  }, []);

  const mockUsers = useMemo(() => {
    const users = [];
    let idCounter = 0;

    if (location) {
      for (let i = 0; i < 5; i++) {
        users.push({
          id: idCounter++,
          lat: location.coords.latitude + (Math.random() - 0.5) * 0.08,
          lng: location.coords.longitude + (Math.random() - 0.5) * 0.08,
        });
      }
    }

    const bangaloreLat = 12.9716;
    const bangaloreLng = 77.5946;
    for (let i = 0; i < 40; i++) {
      users.push({
        id: idCounter++,
        lat: bangaloreLat + (Math.random() - 0.5) * 0.3,
        lng: bangaloreLng + (Math.random() - 0.5) * 0.3,
      });
    }

    for (let i = 0; i < 30; i++) {
      users.push({
        id: idCounter++,
        lat: (Math.random() - 0.5) * 160,
        lng: (Math.random() - 0.5) * 360,
      });
    }

    return users;
  }, [location]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  async function handleSOSPress() {
    const micStatus = await Audio.requestPermissionsAsync();
    const locStatus = await Location.requestForegroundPermissionsAsync();
    const camStatus = await requestCameraPermission();

    const allGranted = micStatus.granted && locStatus.granted && camStatus.granted;

    if (!allGranted) {
      Alert.alert(
        'Permissions Required',
        'LifeLink needs microphone, camera, and location access to send an accurate emergency alert. Please grant all permissions.',
        [{ text: 'OK' }]
      );
      return;
    }

    Vibration.vibrate([0, 500, 200, 500]);

    // Navigate to the dedicated Active SOS Screen
    navigation.navigate('ActiveSOSScreen');
  }

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#0A0A0F' : '#F2F2F7' }]}>
      <MapView ref={mapRef} style={styles.map} provider={PROVIDER_DEFAULT} customMapStyle={isDarkMode ? MAP_DARK_STYLE : []} initialRegion={initialRegion} showsUserLocation={false} showsMyLocationButton={false} showsCompass={false}>
        <UrlTile urlTemplate={isDarkMode ? "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png" : "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"} maximumZ={19} flipY={false} />
        {location ? <Circle center={{ latitude: location.coords.latitude, longitude: location.coords.longitude }} radius={2500} strokeColor="#0A84FF" strokeWidth={2} lineDashPattern={[6, 6]} fillColor={isDarkMode ? "rgba(10, 132, 255, 0.03)" : "rgba(10, 132, 255, 0.08)"} /> : null}
        {location ? <Marker coordinate={{ latitude: location.coords.latitude, longitude: location.coords.longitude }}><View style={styles.userLocationMarker}><View style={styles.userLocationInner} /></View></Marker> : null}
        {mockUsers.map(u => (
          <Marker key={u.id} coordinate={{ latitude: u.lat, longitude: u.lng }}><View style={styles.mockUserMarker}><View style={styles.mockUserMarkerInner} /></View></Marker>
        ))}
      </MapView>

      <View style={[styles.opaqueHeader, { backgroundColor: isDarkMode ? '#0A0A0F' : '#FFFFFF', borderBottomColor: isDarkMode ? '#2C2C2E' : '#E5E5EA' }]}>
        <View style={styles.headerLeft}>
          <Ionicons name="pulse" size={42} color="#FF2D55" style={{ marginRight: 10, marginTop: 4 }} />
          <View>
            <Text style={styles.appTitle}>LifeLink</Text>
            <Text style={styles.appSubtitle}>Golden Hour</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.userProfileBtn} onPress={() => navigation.navigate('UserProfileScreen')}>
          <Ionicons name="person-circle" size={44} color={isDarkMode ? "#FFF" : "#1C1C1E"} />
          <Text style={[styles.userFirstName, { color: isDarkMode ? '#E5E5EA' : '#1C1C1E' }]}>{profile?.full_name ? profile.full_name.split(' ')[0] : 'User'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomCenterBlock}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity style={styles.sosButton} onPress={handleSOSPress} activeOpacity={0.85}>
            <Text style={styles.sosButtonText}>SOS</Text>
          </TouchableOpacity>
        </Animated.View>
        <Text style={styles.tapHint}>Tap to trigger emergency alert</Text>
      </View>

      <TouchableOpacity style={[styles.themeToggleBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]} onPress={() => setIsDarkMode(!isDarkMode)}>
        <Ionicons name={isDarkMode ? "sunny" : "moon"} size={26} color={isDarkMode ? "#FFF" : "#1C1C1E"} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  opaqueHeader: {
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FF2D55',
    letterSpacing: 1,
  },
  appSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    letterSpacing: 1,
    fontWeight: '600',
  },
  userProfileBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  userFirstName: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  userLocationMarker: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  userLocationInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#D97706',
  },
  mockUserMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(52, 199, 89, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockUserMarkerInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34C759',
    borderWidth: 1,
    borderColor: '#FFF',
  },
  bottomCenterBlock: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  sosButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#FF2D55',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF2D55',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  sosButtonText: {
    fontSize: 42,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 4,
  },
  tapHint: {
    marginTop: 20,
    fontSize: 15,
    color: '#1C1C1E',
    fontWeight: '700',
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  themeToggleBtn: {
    position: 'absolute',
    bottom: 20, // Moved lower
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.3)',
  },
});
