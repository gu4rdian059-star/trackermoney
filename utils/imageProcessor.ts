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
  if (!rawUri) return '';

  const maxWidth = options?.maxWidth || 1024;
  const quality = options?.quality ?? 0.75;
  const rotate = options?.rotate || 0;
  const flipH = options?.flipH || false;

  // 1. WEB & PWA Engine (Pure HTML5 Canvas + FileReader Fallback)
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    // A. Canvas Conversion (supports resize, rotate, flip, quality compression)
    try {
      const base64Result = await new Promise<string>((resolve, reject) => {
        const img = new (window as any).Image();

        // ONLY set crossOrigin on remote http/https URLs.
        // Setting crossOrigin on blob: or data: breaks image loading in Safari/Chrome!
        if (rawUri.startsWith('http://') || rawUri.startsWith('https://')) {
          img.crossOrigin = 'anonymous';
        }

        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            let w = img.naturalWidth || img.width || 800;
            let h = img.naturalHeight || img.height || 600;

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
              throw new Error('Canvas 2D context not available');
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
        img.src = rawUri;
      });

      if (base64Result && base64Result.startsWith('data:image/')) {
        return base64Result;
      }
    } catch (webErr) {
      console.warn('Canvas image conversion failed, attempting FileReader fallback:', webErr);
    }

    // B. Web FileReader Fallback (Guaranteed to convert blob: to permanent Base64)
    try {
      if (rawUri.startsWith('blob:') || rawUri.startsWith('http')) {
        const response = await fetch(rawUri);
        const blob = await response.blob();
        const fallbackBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === 'string') {
              resolve(reader.result);
            } else {
              reject(new Error('FileReader result is not a string'));
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        if (fallbackBase64 && fallbackBase64.startsWith('data:image/')) {
          return fallbackBase64;
        }
      }
    } catch (fallbackErr) {
      console.warn('FileReader fallback failed:', fallbackErr);
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
