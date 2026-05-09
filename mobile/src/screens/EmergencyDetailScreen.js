import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function EmergencyDetailScreen({ route, navigation }) {
  const { emergency } = route.params;
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handleAccept() {
    setLoading(true);
    try {
      // 1. Create response record
      const { error: resError } = await supabase
        .from('emergency_responses')
        .insert({
          emergency_id: emergency.id,
          responder_id: user.id,
          status: 'accepted',
        });

      if (resError) throw resError;

      // 2. Update emergency status
      const { error: emError } = await supabase
        .from('emergencies')
        .update({ status: 'dispatched' })
        .eq('id', emergency.id);

      if (emError) throw emError;

      Alert.alert('Accepted', 'You have been dispatched to this emergency.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  const severityColor = {
    red: '#FF2D55',
    orange: '#FF6B00',
    yellow: '#FFD60A',
  }[emergency.severity] || '#3A3A3C';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>

        <View style={[styles.badge, { backgroundColor: severityColor }]}>
          <Text style={styles.badgeText}>{(emergency.severity || 'UNKNOWN').toUpperCase()}</Text>
        </View>

        <Text style={styles.title}>Emergency Details</Text>
        <Text style={styles.timeText}>
          Reported at {new Date(emergency.created_at).toLocaleString()}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Analysis</Text>
          <Text style={styles.summaryText}>{emergency.ai_summary}</Text>
        </View>

        {emergency.photo_urls?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Scene Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoList}>
              {emergency.photo_urls.map((url, i) => (
                <Image key={i} source={{ uri: url }} style={styles.photo} />
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Likely Injuries</Text>
          {emergency.ai_injuries?.map((inj, i) => (
            <Text key={i} style={styles.listItem}>• {inj}</Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Risks & Recommendations</Text>
          {emergency.ai_risks?.map((risk, i) => (
            <Text key={i} style={styles.listItem}>⚠️ {risk}</Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <Text style={styles.locationText}>📍 {emergency.address || 'Location captured'}</Text>
          <Text style={styles.coordsText}>
            Lat: {emergency.latitude.toFixed(6)}, Lon: {emergency.longitude.toFixed(6)}
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.acceptBtn} 
          onPress={handleAccept}
          disabled={loading || emergency.status === 'dispatched'}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.acceptBtnText}>
              {emergency.status === 'dispatched' ? 'Already Dispatched' : 'Accept Emergency'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  scroll: {
    padding: 24,
    paddingTop: 60,
  },
  backBtn: {
    marginBottom: 20,
  },
  backBtnText: {
    color: '#FF2D55',
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  badgeText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#636366',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 16,
    color: '#E5E5EA',
    lineHeight: 24,
  },
  listItem: {
    fontSize: 15,
    color: '#AEAEB2',
    marginBottom: 8,
    lineHeight: 22,
  },
  photoList: {
    flexDirection: 'row',
  },
  photo: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#1C1C1E',
  },
  locationText: {
    fontSize: 16,
    color: '#E5E5EA',
    marginBottom: 4,
  },
  coordsText: {
    fontSize: 13,
    color: '#636366',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 40,
    backgroundColor: '#0A0A0F',
    borderTopWidth: 1,
    borderTopColor: '#1C1C1E',
  },
  acceptBtn: {
    backgroundColor: '#FF2D55',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#FF2D55',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  acceptBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
});
