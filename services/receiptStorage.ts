import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { processImageToBase64 } from '../utils/imageProcessor';

/**
 * Uploads a receipt image directly to Supabase Storage ('receipts' bucket)
 * Returns the permanent HTTPS Public URL.
 */
export async function uploadReceiptImage(
  rawUri: string,
  txId?: string
): Promise<string> {
  const fileId = txId || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const fileName = `${fileId}_${Date.now()}.jpg`;
  const filePath = `receipts/${fileName}`;

  try {
    // 1. Process & Compress image via Universal Canvas / ImageManipulator
    const base64DataUrl = await processImageToBase64(rawUri, {
      maxWidth: 1200,
      quality: 0.75,
    });

    // 2. Convert to Blob for Supabase Storage Upload
    let uploadBody: Blob | ArrayBuffer;
    if (Platform.OS === 'web') {
      const fetchRes = await fetch(base64DataUrl);
      uploadBody = await fetchRes.blob();
    } else {
      // Native (Android / iOS): convert Base64 to ArrayBuffer / Uint8Array
      const base64Content = base64DataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
      const byteCharacters = atob(base64Content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      uploadBody = byteArray.buffer;
    }

    // 3. Upload to Supabase Storage bucket 'receipts'
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('receipts')
      .upload(filePath, uploadBody, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (!uploadError && uploadData) {
      // 4. Retrieve Public URL
      const { data: urlData } = supabase.storage
        .from('receipts')
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        return urlData.publicUrl;
      }
    } else {
      console.warn('Supabase bucket upload error, fallback to Base64:', uploadError);
    }

    // Fallback: If bucket is not yet created or failed, return the compressed Base64 Data URL
    return base64DataUrl;
  } catch (err) {
    console.warn('uploadReceiptImage error:', err);
    // Ultimate fallback
    return rawUri;
  }
}
