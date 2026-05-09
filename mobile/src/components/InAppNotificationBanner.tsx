import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import {EmergencyNotificationPayload} from '../services/notifications';

type InAppNotificationBannerProps = {
  payload: EmergencyNotificationPayload | null;
  onDismiss: () => void;
};

const SEVERITY_COLOR: Record<'red' | 'orange' | 'yellow', string> = {
  red: '#DC2626',
  orange: '#EA580C',
  yellow: '#CA8A04',
};

export default function InAppNotificationBanner({payload, onDismiss}: InAppNotificationBannerProps) {
  if (!payload) {
    return null;
  }

  const severity = payload.severity ?? 'yellow';
  const bannerColor = SEVERITY_COLOR[severity];

  return (
    <View style={styles.container} pointerEvents="box-none">
      <TouchableOpacity activeOpacity={0.92} onPress={onDismiss} style={[styles.banner, {borderColor: bannerColor}]}> 
        <Text style={styles.bannerTitle}>Emergency Alert ({severity.toUpperCase()})</Text>
        <Text style={styles.bannerBody} numberOfLines={2}>
          {payload.summary ?? 'Incoming emergency notification'}
        </Text>
        <Text style={styles.tapHint}>Tap to dismiss</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 12,
    zIndex: 40,
  },
  banner: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  bannerTitle: {
    color: '#F8FAFC',
    fontWeight: '900',
    fontSize: 15,
    marginBottom: 4,
  },
  bannerBody: {
    color: '#D1D5DB',
    fontSize: 13,
    lineHeight: 18,
  },
  tapHint: {
    marginTop: 8,
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
  },
});