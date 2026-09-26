/**
 * High-Efficiency Document Scanner & Image Optimizer.
 * Prepares pharmaceutical invoices for lightning-fast OCR while preserving crystal-clear character edges.
 * Handles JPG, PNG, WEBP, HEIC/HEIF, and clipboard pastes.
 */

export interface HighEfficiencyScanOptions {
  mode?: 'high_speed' | 'high_precision';
  rotation?: 0 | 90 | 180 | 270;
  autoEnhanceContrast?: boolean;
  sharpnessFilter?: boolean;
}

export async function compressImageDataUrl(
  input: File | string,
  maxWidth = 2400,
  maxHeight = 2400,
  quality = 0.92,
  autoEnhanceContrast = true,
  rotation = 0
): Promise<string> {
  return new Promise((resolve) => {
    const handleDataUrlReady = (dataUrl: string) => {
      if (!dataUrl) {
        resolve('');
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          let origW = img.width;
          let origH = img.height;

          // Swap width and height if rotated 90 or 270 degrees
          const isSideways = rotation === 90 || rotation === 270;
          let targetW = isSideways ? origH : origW;
          let targetH = isSideways ? origW : origH;

          if (targetW > maxWidth || targetH > maxHeight) {
            if (targetW > targetH) {
              targetH = Math.round((targetH * maxWidth) / targetW);
              targetW = maxWidth;
            } else {
              targetW = Math.round((targetW * maxHeight) / targetH);
              targetH = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }

          // Background fill for transparent PNG or camera frames
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, targetW, targetH);

          // Apply Rotation if user captured image sideways
          if (rotation !== 0) {
            ctx.save();
            ctx.translate(targetW / 2, targetH / 2);
            ctx.rotate((rotation * Math.PI) / 180);
            if (isSideways) {
              ctx.drawImage(img, -targetH / 2, -targetW / 2, targetH, targetW);
            } else {
              ctx.drawImage(img, -targetW / 2, -targetH / 2, targetW, targetH);
            }
            ctx.restore();
          } else {
            ctx.drawImage(img, 0, 0, targetW, targetH);
          }

          // Adaptive Document Contrast Enhancement
          // Accentuates faint thermal receipts, blue carbon copies, and dot-matrix printer lines
          if (autoEnhanceContrast) {
            try {
              const imgData = ctx.getImageData(0, 0, targetW, targetH);
              const d = imgData.data;
              const factor = 1.25; // 25% contrast punch
              for (let i = 0; i < d.length; i += 4) {
                // High efficiency luminance calculation: Y = 0.299R + 0.587G + 0.114B
                const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
                // Sharpen dark inks while whitening off-white invoice backgrounds
                if (lum < 160) {
                  d[i] = Math.max(0, d[i] * 0.88);
                  d[i + 1] = Math.max(0, d[i + 1] * 0.88);
                  d[i + 2] = Math.max(0, d[i + 2] * 0.88);
                } else if (lum > 215) {
                  d[i] = Math.min(255, d[i] * 1.05 + 10);
                  d[i + 1] = Math.min(255, d[i + 1] * 1.05 + 10);
                  d[i + 2] = Math.min(255, d[i + 2] * 1.05 + 10);
                } else {
                  d[i] = Math.min(255, Math.max(0, factor * (d[i] - 128) + 128));
                  d[i + 1] = Math.min(255, Math.max(0, factor * (d[i + 1] - 128) + 128));
                  d[i + 2] = Math.min(255, Math.max(0, factor * (d[i + 2] - 128) + 128));
                }
              }
              ctx.putImageData(imgData, 0, 0);
            } catch {
              // Non-fatal if canvas security restrictions occur
            }
          }

          const result = canvas.toDataURL('image/jpeg', quality);
          resolve(result);
        } catch {
          resolve(dataUrl);
        }
      };

      img.onerror = () => {
        resolve(dataUrl);
      };

      img.src = dataUrl;
    };

    if (typeof input === 'string') {
      handleDataUrlReady(input);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        let result = (e.target?.result as string) || '';
        if (/\.(heic|heif)$/i.test(input.name)) {
          if (result.startsWith('data:;') || result.startsWith('data:application/octet-stream;')) {
            result = result.replace(/^data:[^;]*;/, 'data:image/heic;');
          }
        }
        handleDataUrlReady(result);
      };
      reader.onerror = () => {
        resolve('');
      };
      reader.readAsDataURL(input);
    }
  });
}

/**
 * Rotates an existing image data URL by 90 degrees clockwise for rapid manual adjustment.
 */
export async function rotateImageDataUrl(dataUrl: string, degrees = 90): Promise<string> {
  return compressImageDataUrl(dataUrl, 2400, 2400, 0.92, false, degrees as any);
}
