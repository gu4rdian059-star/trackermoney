import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { processImageToBase64 } from '../utils/imageProcessor';

/**
 * Universal Base64 to Uint8Array decoder (cross-platform safe, no atob / Buffer dependency)
 */
function base64ToUint8Array(base64Str: string): Uint8Array {
  const cleanBase64 = base64Str
    .replace(/^data:image\/[a-z0-9-+.]+;base64,/, '')
    .replace(/[\s\r\n]+/g, '');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }

  let padding = 0;
  if (cleanBase64.endsWith('==')) padding = 2;
  else if (cleanBase64.endsWith('=')) padding = 1;

  const byteLength = Math.floor((cleanBase64.length * 3) / 4) - padding;
  const bytes = new Uint8Array(byteLength);

  let p = 0;
  for (let i = 0; i < cleanBase64.length; i += 4) {
    const enc1 = lookup[cleanBase64.charCodeAt(i)];
    const enc2 = lookup[cleanBase64.charCodeAt(i + 1)];
    const enc3 = lookup[cleanBase64.charCodeAt(i + 2)];
    const enc4 = lookup[cleanBase64.charCodeAt(i + 3)];

    bytes[p++] = (enc1 << 2) | (enc2 >> 4);
    if (p < byteLength) bytes[p++] = ((enc2 & 15) << 4) | (enc3 >> 2);
    if (p < byteLength) bytes[p++] = ((enc3 & 3) << 6) | enc4;
  }
  return bytes;
}

/**
 * Uploads a receipt image directly to Supabase Storage ('receipts' bucket)
 * Returns the permanent HTTPS Public URL or compressed Base64 Data URL.
 */
export async function uploadReceiptImage(
  rawUri: string,
  txId?: string
): Promise<string> {
  if (!rawUri) return '';

  // If already a valid public HTTPS URL, no re-upload needed
  if (rawUri.startsWith('http://') || rawUri.startsWith('https://')) {
    return rawUri;
  }

  const fileId = txId || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const fileName = `${fileId}_${Date.now()}.jpg`;

  try {
    // 1. Process & Compress image via Universal Canvas / ImageManipulator
    const base64DataUrl = await processImageToBase64(rawUri, {
      maxWidth: 1200,
      quality: 0.8,
    });

    if (!base64DataUrl || !base64DataUrl.startsWith('data:image/')) {
      return base64DataUrl || rawUri;
    }

    // 2. Convert to binary payload for Supabase Storage Upload
    let uploadBody: Blob | ArrayBuffer | Uint8Array;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const fetchRes = await fetch(base64DataUrl);
        uploadBody = await fetchRes.blob();
      } catch {
        const bytes = base64ToUint8Array(base64DataUrl);
        uploadBody = bytes;
      }
    } else {
      // Native (Android / iOS): convert Base64 to ArrayBuffer safely
      const bytes = base64ToUint8Array(base64DataUrl);
      uploadBody = bytes;
    }

    // 3. Upload directly to Supabase Storage bucket 'receipts'
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(fileName, uploadBody, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (!uploadError && uploadData) {
      // 4. Retrieve Public URL
      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      if (urlData?.publicUrl) {
        return urlData.publicUrl;
      }
    } else {
      console.warn('Supabase bucket upload notice, falling back to permanent Base64:', uploadError);
    }

    // Fallback: Return the compressed Base64 Data URL (guaranteed permanent display)
    return base64DataUrl;
  } catch (err) {
    console.warn('uploadReceiptImage error, using fallback:', err);
    return rawUri;
  }
}
