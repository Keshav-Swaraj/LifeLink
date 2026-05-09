import React from 'react';
import {
  Alert,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {supabase} from '../lib/supabase';

type ResponderStatus = 'on_the_way' | 'arrived' | 'resolved';

type ActiveResponseRouteParams = {
  emergencyId: string;
  aiSummary: string;
  photoUrls: string[];
  address: string;
  victimLatitude: number;
  victimLongitude: number;
  responderLatitude: number;
  responderLongitude: number;
  initialStep?: 1 | 2 | 3 | 4;
};

export type ActiveResponseScreenProps = Partial<ActiveResponseRouteParams> & {
  route?: any;
  navigation?: any;
};

const STEP_CONFIG: Array<{
  id: 1 | 2 | 3 | 4;
  title: string;
  statusValue?: ResponderStatus;
}> = [
  {id: 1, title: 'Accepted'},
  {id: 2, title: 'On the Way', statusValue: 'on_the_way'},
  {id: 3, title: 'Arrived at Scene', statusValue: 'arrived'},
  {id: 4, title: 'Handed to Hospital / Resolved', statusValue: 'resolved'},
];

export default function ActiveResponseScreen(props: ActiveResponseScreenProps) {
  const params = props.route?.params;

  const emergencyId = params?.emergencyId ?? props.emergencyId ?? '';
  const aiSummary = params?.aiSummary ?? props.aiSummary ?? 'No AI summary available.';
  const photoUrls = params?.photoUrls ?? props.photoUrls ?? [];
  const address = params?.address ?? props.address ?? 'Address unavailable';
  const victimLatitude = params?.victimLatitude ?? props.victimLatitude ?? 19.076;
  const victimLongitude = params?.victimLongitude ?? props.victimLongitude ?? 72.8777;
  const responderLatitude = params?.responderLatitude ?? props.responderLatitude ?? 19.079;
  const responderLongitude = params?.responderLongitude ?? props.responderLongitude ?? 72.88;
  const initialStep = params?.initialStep ?? props.initialStep ?? 1;

  const [currentStep, setCurrentStep] = React.useState<1 | 2 | 3 | 4>(initialStep);
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false);

  const victimCoordinates = `${victimLatitude.toFixed(4)}, ${victimLongitude.toFixed(4)}`;
  const responderCoordinates = `${responderLatitude.toFixed(4)}, ${responderLongitude.toFixed(4)}`;

  const updateResponderStatus = React.useCallback(
    async (targetStep: 1 | 2 | 3 | 4) => {
      if (!emergencyId) {
        Alert.alert('Missing emergency', 'Emergency ID is required to update status.');
        return;
      }

      const targetConfig = STEP_CONFIG[targetStep - 1];
      if (!targetConfig?.statusValue) {
        setCurrentStep(targetStep);
        return;
      }

      setIsUpdatingStatus(true);

      try {
        const {error} = await supabase
          .from('emergencies')
          .update({responder_status: targetConfig.statusValue})
          .eq('id', emergencyId);

        if (error) {
          throw error;
        }

        setCurrentStep(targetStep);
      } catch (error) {
        Alert.alert('Status update failed', error instanceof Error ? error.message : 'Please try again.');
      } finally {
        setIsUpdatingStatus(false);
      }
    },
    [emergencyId],
  );

  const handleAdvanceStatus = React.useCallback(async () => {
    if (isUpdatingStatus || currentStep >= 4) {
      return;
    }

    const nextStep = (currentStep + 1) as 2 | 3 | 4;
    await updateResponderStatus(nextStep);
  }, [currentStep, isUpdatingStatus, updateResponderStatus]);

  const handleStepPress = React.useCallback(
    async (stepId: 1 | 2 | 3 | 4) => {
      if (isUpdatingStatus) {
        return;
      }

      if (stepId === currentStep) {
        return;
      }

      if (stepId !== currentStep + 1) {
        return;
      }

      await updateResponderStatus(stepId);
    },
    [currentStep, isUpdatingStatus, updateResponderStatus],
  );

  const handleGetDirections = React.useCallback(async () => {
    const destination = `${victimLatitude},${victimLongitude}`;
    const googleMapsWebUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;

    if (Platform.OS === 'android') {
      const androidUrl = `google.navigation:q=${encodeURIComponent(destination)}`;
      const canOpenAndroidUrl = await Linking.canOpenURL(androidUrl);

      await Linking.openURL(canOpenAndroidUrl ? androidUrl : googleMapsWebUrl);
      return;
    }

    if (Platform.OS === 'ios') {
      const iosGoogleMapsUrl = `comgooglemaps://?daddr=${encodeURIComponent(destination)}&directionsmode=driving`;
      const canOpenIosGoogleMaps = await Linking.canOpenURL(iosGoogleMapsUrl);

      await Linking.openURL(canOpenIosGoogleMaps ? iosGoogleMapsUrl : googleMapsWebUrl);
      return;
    }

    await Linking.openURL(googleMapsWebUrl);
  }, [victimLatitude, victimLongitude]);

  const nextStepLabel = currentStep < 4 ? STEP_CONFIG[currentStep].title : 'Resolved';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Active Emergency Response</Text>
        <Text style={styles.etaText}>ETA: ~5 min</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>AI SUMMARY</Text>
        <Text style={styles.bodyText}>{aiSummary}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>ADDRESS</Text>
        <Text style={styles.bodyText}>{address}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>LIVE MAP</Text>
        <View style={styles.mapFrame}>
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapPlaceholderTitle}>Map preview unavailable in Expo Go</Text>
            <Text style={styles.mapLine}>Victim: {victimCoordinates}</Text>
            <Text style={styles.mapLine}>Responder: {responderCoordinates}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.directionsButton} onPress={handleGetDirections} activeOpacity={0.9}>
          <Text style={styles.directionsButtonText}>GET DIRECTIONS</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>SCENE PHOTOS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
          {photoUrls.map((photoUrl, index) => (
            <View key={`${photoUrl}-${index}`} style={styles.photoWrap}>
              <Image source={{uri: photoUrl}} style={styles.photo} />
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>STATUS TRACKER</Text>
        <View style={styles.stepList}>
          {STEP_CONFIG.map(step => {
            const isDone = step.id <= currentStep;
            const isNext = step.id === currentStep + 1;
            const isCurrent = step.id === currentStep;

            return (
              <TouchableOpacity
                key={step.id}
                style={[
                  styles.stepItem,
                  isDone && styles.stepDone,
                  isCurrent && styles.stepCurrent,
                  isNext && styles.stepNext,
                ]}
                activeOpacity={0.9}
                disabled={isUpdatingStatus || (!isNext && !isCurrent)}
                onPress={() => {
                  void handleStepPress(step.id);
                }}
              >
                <View style={[styles.stepDot, isDone && styles.stepDotDone]} />
                <Text style={styles.stepText}>{step.id}. {step.title}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.updateButton, (isUpdatingStatus || currentStep >= 4) && styles.updateButtonDisabled]}
          onPress={() => {
            void handleAdvanceStatus();
          }}
          activeOpacity={0.9}
          disabled={isUpdatingStatus || currentStep >= 4}
        >
          <Text style={styles.updateButtonText}>
            {isUpdatingStatus ? 'UPDATING...' : currentStep >= 4 ? 'CASE RESOLVED' : `UPDATE STATUS: ${nextStepLabel.toUpperCase()}`}
          </Text>
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
  heroCard: {
    backgroundColor: '#111113',
    borderColor: '#27272A',
    borderWidth: 1,
    borderRadius: 24,
    padding: 18,
  },
  heroTitle: {
    color: '#F8FAFC',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  etaText: {
    color: '#22C55E',
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
    letterSpacing: 1.4,
    fontWeight: '800',
    marginBottom: 10,
  },
  bodyText: {
    color: '#E4E4E7',
    fontSize: 16,
    lineHeight: 24,
  },
  mapFrame: {
    borderRadius: 18,
    overflow: 'hidden',
    borderColor: '#2A2A2E',
    borderWidth: 1,
    height: 220,
  },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#17171B',
    padding: 18,
  },
  mapPlaceholderTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  mapLine: {
    color: '#D4D4D8',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 4,
  },
  directionsButton: {
    backgroundColor: '#1D4ED8',
    borderColor: '#60A5FA',
    borderWidth: 1,
    borderRadius: 16,
    marginTop: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  directionsButtonText: {
    color: '#EFF6FF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  photoRow: {
    gap: 10,
  },
  photoWrap: {
    width: 138,
    height: 100,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A2E',
    backgroundColor: '#1A1A1E',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  stepList: {
    gap: 10,
  },
  stepItem: {
    borderWidth: 1,
    borderColor: '#2A2A2E',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#17171A',
  },
  stepDone: {
    borderColor: '#16A34A',
    backgroundColor: '#0F1D15',
  },
  stepCurrent: {
    borderColor: '#F97316',
    backgroundColor: '#241A13',
  },
  stepNext: {
    borderColor: '#3B82F6',
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: '#52525B',
  },
  stepDotDone: {
    backgroundColor: '#22C55E',
  },
  stepText: {
    color: '#F4F4F5',
    fontSize: 14,
    fontWeight: '700',
  },
  updateButton: {
    marginTop: 14,
    backgroundColor: '#B91C1C',
    borderColor: '#F87171',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  updateButtonDisabled: {
    opacity: 0.7,
  },
  updateButtonText: {
    color: '#FEF2F2',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
});