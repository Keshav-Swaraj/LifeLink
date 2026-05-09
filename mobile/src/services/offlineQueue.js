import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const QUEUE_KEY = 'lifelink_offline_queue';

/**
 * Adds an emergency packet to the local offline queue.
 * @param {object} packet - The emergency data to queue
 */
export async function enqueueEmergency(packet) {
  const queue = await getQueue();
  queue.push({ ...packet, queuedAt: new Date().toISOString() });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  console.log('[OfflineQueue] Enqueued emergency. Queue size:', queue.length);
}

/**
 * Returns all queued emergency packets.
 */
export async function getQueue() {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

/**
 * Attempts to upload all queued emergencies to Supabase.
 * Successfully uploaded items are removed from the queue.
 * @returns {Promise<{synced: number, failed: number}>}
 */
export async function syncQueue() {
  const queue = await getQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  console.log('[OfflineQueue] Syncing', queue.length, 'queued emergencies...');

  const { data: { user } } = await supabase.auth.getUser();

  let synced = 0;
  let failed = 0;
  const remaining = [];

  for (const packet of queue) {
    try {
      const { queuedAt, ...dbPacket } = packet;
      
      // Inject user_id if missing to fix RLS for legacy queued items
      if (!dbPacket.user_id && user) {
        dbPacket.user_id = user.id;
      }

      const { error } = await supabase.from('emergencies').upsert(dbPacket, {
        onConflict: 'client_id',
        ignoreDuplicates: true,
      });

      if (error) {
        console.error('[OfflineQueue] Failed to sync packet:', error.message);
        failed++;
        remaining.push(packet);
      } else {
        synced++;
        console.log('[OfflineQueue] Synced packet:', packet.client_id);
      }
    } catch (err) {
      console.error('[OfflineQueue] Unexpected error:', err);
      failed++;
      remaining.push(packet);
    }
  }

  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  console.log(`[OfflineQueue] Done. Synced: ${synced}, Failed: ${failed}`);
  return { synced, failed };
}

/**
 * Clears the entire queue (use for debugging only).
 */
export async function clearQueue() {
  await AsyncStorage.removeItem(QUEUE_KEY);
}
