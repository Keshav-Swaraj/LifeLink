import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import {supabase} from '../lib/supabase';
import {firebaseApp} from '../lib/firebase';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

let Notifications: any = null;
if (!isExpoGo) {
  Notifications = require('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowAlert: false,
      shouldShowBanner: false,
      shouldShowList: false,
    }),
  });
}

export type EmergencyNotificationPayload = {
  emergency_id: string;
  severity?: 'red' | 'orange' | 'yellow';
  summary?: string;
  victim_lat?: number;
  victim_lng?: number;
};

type NotificationHandlers = {
  onForegroundNotification: (payload: EmergencyNotificationPayload) => void;
  onNotificationTap: (payload: EmergencyNotificationPayload) => void;
};

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  return undefined;
}

function extractPayload(data: any): EmergencyNotificationPayload | null {
  const emergencyId = typeof data?.emergency_id === 'string' ? data.emergency_id : undefined;
  if (!emergencyId) {
    return null;
  }

  const severity =
    data?.severity === 'red' || data?.severity === 'orange' || data?.severity === 'yellow'
      ? data.severity
      : undefined;

  return {
    emergency_id: emergencyId,
    severity,
    summary: typeof data?.summary === 'string' ? data.summary : undefined,
    victim_lat: toNumber(data?.victim_lat),
    victim_lng: toNumber(data?.victim_lng),
  };
}

async function persistTokenForLoggedInUser(fcmToken: string) {
  const {data, error} = await supabase.auth.getUser();
  if (error) {
    throw error;
  }

  const userId = data.user?.id;
  if (!userId) {
    return;
  }

  const {error: updateError} = await supabase
    .from('profiles')
    .update({fcm_token: fcmToken})
    .eq('id', userId);

  if (updateError) {
    throw updateError;
  }
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (isExpoGo || !Notifications) {
    console.warn('Push notifications are not supported in Expo Go. Skipping push token registration.');
    return null;
  }

  if (!Device.isDevice) {
    return null;
  }

  const existingPermission = await Notifications.getPermissionsAsync();
  let finalStatus = existingPermission.status;

  if (existingPermission.status !== 'granted') {
    const requestPermission = await Notifications.requestPermissionsAsync();
    finalStatus = requestPermission.status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  // Skip native token registration until Firebase is configured.
  if (!firebaseApp) {
    return null;
  }

  const devicePushToken = await Notifications.getDevicePushTokenAsync();
  return typeof devicePushToken.data === 'string' ? devicePushToken.data : null;
}

export async function initializeNotifications(handlers: NotificationHandlers): Promise<() => void> {
  if (isExpoGo || !Notifications) {
    return () => {};
  }

  try {
    const fcmToken = await registerForPushNotificationsAsync();
    if (fcmToken) {
      await persistTokenForLoggedInUser(fcmToken);
    }
  } catch (error) {
    console.error('Push setup failed', error);
  }

  const receivedSub = Notifications.addNotificationReceivedListener((notification: any) => {
    const payload = extractPayload(notification.request.content.data);
    if (!payload) {
      return;
    }

    handlers.onForegroundNotification(payload);
  });

  const responseSub = Notifications.addNotificationResponseReceivedListener((response: any) => {
    const payload = extractPayload(response.notification.request.content.data);
    if (!payload) {
      return;
    }

    handlers.onNotificationTap(payload);
  });

  const launchResponse = await Notifications.getLastNotificationResponseAsync();
  const launchPayload = launchResponse ? extractPayload(launchResponse.notification.request.content.data) : null;
  if (launchPayload) {
    handlers.onNotificationTap(launchPayload);
  }

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}