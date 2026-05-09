import React from 'react';
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  ToastAndroid,
  View,
} from 'react-native';
import {supabase} from '../lib/supabase';

export type AlertSeverity = 'red' | 'orange' | 'yellow';

type ResponderAlertRouteParams = {
  emergency_id?: string;
  emergencyId?: string;
  severity?: AlertSeverity;
  summary?: string;
  aiSummary?: string;
  victim_lat?: number | string;
  victim_lng?: number | string;
  victimLatitude?: number;
  victimLongitude?: number;
  scenePhotoUrls?: string[];
  alertTimestamp?: string | number | Date;
  distanceKm?: number;
  incidentTitle?: string;
  address?: string;
};

export type ResponderAlertScreenProps = {
  emergencyId?: string;
  severity?: AlertSeverity;
  aiSummary?: string;
  victimLatitude?: number;
  victimLongitude?: number;
  scenePhotoUrls?: string[];
  alertTimestamp?: string | number | Date;
  distanceKm?: number;
  address?: string;
  route?: any;
  navigation?: any;
  activeResponseRouteName?: string;
  homeRouteName?: string;
  incidentTitle?: string;
};

const SEVERITY_META: Record<
  AlertSeverity,
  {label: string; backgroundColor: string; borderColor: string; glowColor: string}
> = {
  red: {
    label: 'RED',
    backgroundColor: '#B91C1C',
    borderColor: '#FCA5A5',
    glowColor: 'rgba(239, 68, 68, 0.18)',
  },
  orange: {
    label: 'ORANGE',
    backgroundColor: '#C2410C',
    borderColor: '#FDBA74',
    glowColor: 'rgba(249, 115, 22, 0.18)',
  },
  yellow: {
    label: 'YELLOW',
    backgroundColor: '#A16207',
    borderColor: '#FDE68A',
    glowColor: 'rgba(234, 179, 8, 0.16)',
  },
};

const DEFAULT_REGION_DELTA = {
  latitudeDelta: 0.008,
  longitudeDelta: 0.008,
};

function formatElapsedTime(alertTimestamp: string | number | Date): string {
  const timestamp = new Date(alertTimestamp).getTime();
  const now = Date.now();
  const elapsedMinutes = Math.max(0, Math.floor((now - timestamp) / 60000));

  if (elapsedMinutes < 1) {
    return 'just now';
  }

  if (elapsedMinutes < 60) {
    return `${elapsedMinutes} min ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) {
    return `${elapsedHours} hr${elapsedHours > 1 ? 's' : ''} ago`;
  }

  const elapsedDays = Math.floor(elapsedHours / 24);
  return `${elapsedDays} day${elapsedDays > 1 ? 's' : ''} ago`;
}

function SeverityBadge({severity}: {severity: AlertSeverity}) {
  const meta = SEVERITY_META[severity];

  return (
    <View style={[styles.severityBadge, {backgroundColor: meta.backgroundColor, borderColor: meta.borderColor}]}> 
      <Text style={styles.severityBadgeText}>{meta.label}</Text>
    </View>
  );
}

async function getCurrentUserId(): Promise<string> {
  const {data, error} = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  const userId = data.user?.id;
  if (!userId) {
    throw new Error('No authenticated responder found.');
  }

  return userId;
}

function showPassedToast(message: string) {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
    return;
  }

  Alert.alert('LifeLink', message);
}

export default function ResponderAlertScreen({
  emergencyId,
  severity,
  aiSummary,
  victimLatitude,
  victimLongitude,
  scenePhotoUrls,
  alertTimestamp,
  distanceKm,
  address,
  route,
  navigation,
  activeResponseRouteName = 'ActiveResponseScreen',
  homeRouteName = 'Home',
  incidentTitle = 'Incoming Emergency Alert',
}: ResponderAlertScreenProps) {
  const routeParams = route?.params;

  const resolvedEmergencyId = routeParams?.emergency_id ?? routeParams?.emergencyId ?? emergencyId ?? '';
  const resolvedSeverity = routeParams?.severity ?? severity ?? 'yellow';
  const resolvedSummary = routeParams?.summary ?? routeParams?.aiSummary ?? aiSummary ?? 'No summary available yet.';
  const resolvedVictimLatitude =
    routeParams?.victimLatitude ??
    (typeof routeParams?.victim_lat === 'string' ? Number(routeParams.victim_lat) : routeParams?.victim_lat) ??
    victimLatitude ??
    19.076;
  const resolvedVictimLongitude =
    routeParams?.victimLongitude ??
    (typeof routeParams?.victim_lng === 'string' ? Number(routeParams.victim_lng) : routeParams?.victim_lng) ??
    victimLongitude ??
    72.8777;
  const resolvedPhotoUrls = routeParams?.scenePhotoUrls ?? scenePhotoUrls ?? [];
  const resolvedAlertTimestamp = routeParams?.alertTimestamp ?? alertTimestamp ?? new Date().toISOString();
  const resolvedDistanceKm = routeParams?.distanceKm ?? distanceKm ?? 0.8;
  const resolvedIncidentTitle = routeParams?.incidentTitle ?? incidentTitle;
  const resolvedAddress = routeParams?.address ?? address ?? 'Address unavailable';

  const severityMeta = SEVERITY_META[resolvedSeverity];
  const elapsedLabel = formatElapsedTime(resolvedAlertTimestamp);
  const distanceLabel = `${resolvedDistanceKm.toFixed(1)} km away`;
  const [isAccepting, setIsAccepting] = React.useState(false);
  const [isRejecting, setIsRejecting] = React.useState(false);

  const coordinatesLabel = `${resolvedVictimLatitude.toFixed(4)}, ${resolvedVictimLongitude.toFixed(4)}`;

  const handleAccept = React.useCallback(async () => {
    if (isAccepting || isRejecting) {
      return;
    }

    setIsAccepting(true);

    try {
      if (!resolvedEmergencyId) {
        throw new Error('Emergency ID missing in alert payload.');
      }

      const responderId = await getCurrentUserId();

      const {error} = await supabase
        .from('emergencies')
        .update({responder_id: responderId, status: 'accepted'})
        .eq('id', resolvedEmergencyId);

      if (error) {
        throw error;
      }

      navigation?.navigate(activeResponseRouteName, {
        emergencyId: resolvedEmergencyId,
        aiSummary: resolvedSummary,
        photoUrls: resolvedPhotoUrls,
        address: resolvedAddress,
        victimLatitude: resolvedVictimLatitude,
        victimLongitude: resolvedVictimLongitude,
      });
    } catch (error) {
      Alert.alert('Unable to accept alert', error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setIsAccepting(false);
    }
  }, [
    activeResponseRouteName,
    isAccepting,
    isRejecting,
    navigation,
    resolvedAddress,
    resolvedEmergencyId,
    resolvedPhotoUrls,
    resolvedSummary,
    resolvedVictimLatitude,
    resolvedVictimLongitude,
  ]);

  const handleReject = React.useCallback(async () => {
    if (isAccepting || isRejecting) {
      return;
    }

    setIsRejecting(true);

    try {
      if (!resolvedEmergencyId) {
        throw new Error('Emergency ID missing in alert payload.');
      }

      const responderId = await getCurrentUserId();

      const {data: emergencyRow, error: readError} = await supabase
        .from('emergencies')
        .select('rejected_by')
        .eq('id', resolvedEmergencyId)
        .single();

      if (readError) {
        throw readError;
      }

      const previousRejectedBy = Array.isArray(emergencyRow?.rejected_by) ? emergencyRow.rejected_by : [];
      const nextRejectedBy = previousRejectedBy.includes(responderId)
        ? previousRejectedBy
        : [...previousRejectedBy, responderId];

      const {error: updateError} = await supabase
        .from('emergencies')
        .update({rejected_by: nextRejectedBy})
        .eq('id', resolvedEmergencyId);

      if (updateError) {
        throw updateError;
      }

      showPassedToast('Alert passed to next responder');
      navigation?.navigate(homeRouteName);
    } catch (error) {
      Alert.alert('Unable to pass alert', error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setIsRejecting(false);
    }
  }, [homeRouteName, isAccepting, isRejecting, navigation, resolvedEmergencyId]);

  const isBusy = isAccepting || isRejecting;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={[styles.alertGlow, {backgroundColor: severityMeta.glowColor}]} />
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.kicker}>RESPONDER ALERT</Text>
            <Text style={styles.title}>{resolvedIncidentTitle}</Text>
          </View>
          <SeverityBadge severity={resolvedSeverity} />
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaPill}>
            <Text style={styles.metaPillLabel}>Distance</Text>
            <Text style={styles.metaPillValue}>{distanceLabel}</Text>
          </View>
          <View style={styles.metaPill}>
            <Text style={styles.metaPillLabel}>Received</Text>
            <Text style={styles.metaPillValue}>{elapsedLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>AI SUMMARY</Text>
        <Text style={styles.summaryText}>{resolvedSummary}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>ADDRESS</Text>
        <Text style={styles.summaryText}>{resolvedAddress}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>LOCATION PREVIEW</Text>
        <View style={styles.mapFrame}>
          <View style={styles.mapPlaceholder}>
            <View style={styles.mapMarker} />
            <Text style={styles.mapPlaceholderTitle}>Map preview unavailable in Expo Go</Text>
            <Text style={styles.mapPlaceholderText}>{coordinatesLabel}</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>SCENE PHOTOS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
          {resolvedPhotoUrls.map((photoUrl, index) => (
            <View key={`${photoUrl}-${index}`} style={styles.photoWrap}>
              <Image source={{uri: photoUrl}} style={styles.photo} />
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.actionButton, styles.rejectButton, isBusy && styles.disabledButton]}
          onPress={handleReject}
          disabled={isBusy}
        >
          <Text style={styles.rejectButtonText}>{isRejecting ? 'REJECTING...' : 'REJECT'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.actionButton, styles.acceptButton, isBusy && styles.disabledButton]}
          onPress={handleAccept}
          disabled={isBusy}
        >
          <Text style={styles.acceptButtonText}>{isAccepting ? 'ACCEPTING...' : 'ACCEPT'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 28,
    gap: 14,
  },
  header: {
    backgroundColor: '#111113',
    borderColor: '#27272A',
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
    overflow: 'hidden',
  },
  alertGlow: {
    position: 'absolute',
    right: -12,
    top: -12,
    width: 120,
    height: 120,
    borderRadius: 999,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  kicker: {
    color: '#F87171',
    fontSize: 12,
    letterSpacing: 1.8,
    fontWeight: '700',
    marginBottom: 6,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    maxWidth: 240,
  },
  severityBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  severityBadgeText: {
    color: '#FFF7ED',
    fontWeight: '900',
    letterSpacing: 1.2,
    fontSize: 13,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  metaPill: {
    flex: 1,
    backgroundColor: '#18181B',
    borderColor: '#2A2A2E',
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  metaPillLabel: {
    color: '#A1A1AA',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 4,
  },
  metaPillValue: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#111113',
    borderColor: '#27272A',
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
  },
  sectionLabel: {
    color: '#F87171',
    fontSize: 12,
    letterSpacing: 1.6,
    fontWeight: '800',
    marginBottom: 12,
  },
  summaryText: {
    color: '#E4E4E7',
    fontSize: 16,
    lineHeight: 24,
  },
  mapFrame: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2E',
    height: 190,
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#17171B',
    padding: 18,
  },
  mapMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EF4444',
    marginBottom: 12,
    borderWidth: 4,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  mapPlaceholderTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  mapPlaceholderText: {
    color: '#A1A1AA',
    fontSize: 13,
    textAlign: 'center',
  },
  photoRow: {
    gap: 12,
  },
  photoWrap: {
    width: 132,
    height: 96,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2E',
    backgroundColor: '#1A1A1E',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  actionButton: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  acceptButton: {
    backgroundColor: '#15803D',
    borderColor: '#22C55E',
  },
  rejectButton: {
    backgroundColor: '#7F1D1D',
    borderColor: '#EF4444',
  },
  disabledButton: {
    opacity: 0.7,
  },
  acceptButtonText: {
    color: '#F0FDF4',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  rejectButtonText: {
    color: '#FEF2F2',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
});