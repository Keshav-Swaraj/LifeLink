import { supabase } from '../lib/supabase';
import { enqueueEmergency } from './offlineQueue';
import 'react-native-url-polyfill/auto';

/**
 * Uploads an array of photo URIs to Supabase Storage.
 * Returns an array of public/signed URLs.
 * @param {string[]} photoUris
 * @param {string} emergencyId
 * @returns {Promise<string[]>}
 */
export async function uploadPhotos(photoUris, emergencyId) {
  const urls = [];
  for (let i = 0; i < photoUris.length; i++) {
    const uri = photoUris[i];
    const fileName = `${emergencyId}/photo_${i + 1}.jpg`;

    // Fetch the image as a blob
    const response = await fetch(uri);
    const blob = await response.blob();

    const { error } = await supabase.storage
      .from('emergency-media')
      .upload(fileName, blob, { contentType: 'image/jpeg', upsert: true });

    if (error) {
      console.error(`[EmergencyService] Failed to upload photo ${i + 1}:`, error.message);
    } else {
      // Get a signed URL valid for 1 hour
      const { data } = await supabase.storage
        .from('emergency-media')
        .createSignedUrl(fileName, 3600);
      if (data?.signedUrl) urls.push(data.signedUrl);
    }
  }
  return urls;
}

/**
 * Submits a complete emergency packet to Supabase.
 * Falls back to offline queue if network is unavailable.
 *
 * @param {object} packet - The structured emergency data
 * @param {boolean} isOnline
 */
export async function submitEmergency(packet, isOnline) {
  if (!isOnline) {
    console.log('[EmergencyService] Offline — adding to local queue.');
    await enqueueEmergency(packet);
    return { queued: true };
  }

  const { data, error } = await supabase
    .from('emergencies')
    .upsert(packet, { onConflict: 'client_id', ignoreDuplicates: true })
    .select()
    .single();

  if (error) {
    // Network call failed — fall back to queue
    console.error('[EmergencyService] Insert failed, queuing:', error.message);
    await enqueueEmergency(packet);
    return { queued: true };
  }

  return { queued: false, data };
}
