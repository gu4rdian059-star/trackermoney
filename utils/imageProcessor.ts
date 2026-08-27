import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Universal Image Processor
 * Converts any image (Blob URL, File URL, Content URI, etc.) into a compressed,
 * self-contained Base64 JPEG string (data:image/jpeg;base64,...)
 * that persists permanently across sessions on Web, PWA (Add to Home Screen), Android, and iOS.
 */
export async function processImageToBase64(
  rawUri: string,
  options?: {
    maxWidth?: number;
    quality?: number;
    rotate?: number;
    flipH?: boolean;
  }
): Promise<string> {
  const maxWidth = options?.maxWidth || 1024;
  const quality = options?.quality || 0.72;
  const rotate = options?.rotate || 0;
  const flipH = options?.flipH || false;

  // 1. WEB & PWA Engine (Pure HTML5 Canvas - Guaranteed Base64 string)
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      let sourceUrl = rawUri;
      let blobUrlToRevoke: string | null = null;

      // If needed, fetch into an object URL for clean canvas rendering
      if (rawUri.startsWith('blob:') || rawUri.startsWith('http')) {
        try {
          const response = await fetch(rawUri);
          const blob = await response.blob();
          sourceUrl = URL.createObjectURL(blob);
          blobUrlToRevoke = sourceUrl;
        } catch {
          sourceUrl = rawUri;
        }
      }

      const base64Result = await new Promise<string>((resolve, reject) => {
        const img = new (window as any).Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            let w = img.naturalWidth || img.width;
            let h = img.naturalHeight || img.height;

            // Scale down if larger than maxWidth while keeping aspect ratio
            if (w > maxWidth || h > maxWidth) {
              if (w > h) {
                h = Math.round((h * maxWidth) / w);
                w = maxWidth;
              } else {
                w = Math.round((w * maxWidth) / h);
                h = maxWidth;
              }
            }

            // Handle 90/270 rotation dimension swap
            if (rotate === 90 || rotate === 270) {
              canvas.width = h;
              canvas.height = w;
            } else {
              canvas.width = w;
              canvas.height = h;
            }

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              throw new Error('Canvas context not available');
            }

            ctx.translate(canvas.width / 2, canvas.height / 2);
            if (flipH) {
              ctx.scale(-1, 1);
            }
            if (rotate) {
              ctx.rotate((rotate * Math.PI) / 180);
            }

            ctx.drawImage(img, -w / 2, -h / 2, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(dataUrl);
          } catch (err) {
            reject(err);
          }
        };

        img.onerror = (err: any) => reject(err);
        img.src = sourceUrl;
      });

      if (blobUrlToRevoke) {
        try {
          URL.revokeObjectURL(blobUrlToRevoke);
        } catch {}
      }

      if (base64Result && base64Result.startsWith('data:image/')) {
        return base64Result;
      }
    } catch (webErr) {
      console.warn('Web canvas image processing failed, trying fallback:', webErr);
    }
  }

  // 2. NATIVE Engine (Android & iOS via ImageManipulator)
  try {
    const actions: ImageManipulator.Action[] = [{ resize: { width: maxWidth } }];
    if (flipH) {
      actions.push({ flip: ImageManipulator.FlipType.Horizontal });
    }
    if (rotate) {
      actions.push({ rotate });
    }

    const manipResult = await ImageManipulator.manipulateAsync(
      rawUri,
      actions,
      {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: true,
      }
    );

    if (manipResult.base64) {
      return `data:image/jpeg;base64,${manipResult.base64}`;
    }
    return manipResult.uri;
  } catch (nativeErr) {
    console.warn('Native ImageManipulator processing failed:', nativeErr);
    return rawUri;
  }
}
