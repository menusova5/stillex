import { ExtractionResult, ExtractionSettings, VideoMetadata } from '../types';
import { clientProbeVideo, clientExtractFrames } from './clientVideoProcessor';

const API_BASE = '';
let isBackendAvailable: boolean | null = null;

export async function checkHealth(): Promise<{ status: string; ffmpeg_available: boolean; ffprobe_available: boolean; engine_name?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${API_BASE}/api/health`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error('Backend not ready');
    const data = await res.json();
    isBackendAvailable = true;
    return { ...data, engine_name: 'FFmpeg 7.1 (Native)' };
  } catch {
    isBackendAvailable = false;
    return {
      status: 'client_engine',
      ffmpeg_available: true,
      ffprobe_available: true,
      engine_name: 'Browser WebEngine (Client-Side)',
    };
  }
}

export async function probeVideo(file: File): Promise<{ session_id: string; metadata: VideoMetadata; original_filename: string }> {
  if (isBackendAvailable === false) {
    const clientRes = await clientProbeVideo(file);
    return { ...clientRes, original_filename: file.name };
  }

  try {
    const formData = new FormData();
    formData.append('video', file);

    const res = await fetch(`${API_BASE}/api/probe`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      throw new Error('Server probe failed');
    }

    isBackendAvailable = true;
    return await res.json();
  } catch {
    isBackendAvailable = false;
    const clientRes = await clientProbeVideo(file);
    return { ...clientRes, original_filename: file.name };
  }
}

export async function extractFrames(
  sessionId: string | null,
  file: File | null,
  settings: ExtractionSettings,
  metadata?: VideoMetadata
): Promise<ExtractionResult> {
  if (isBackendAvailable === false || sessionId?.startsWith('client_') || !sessionId) {
    if (!file) throw new Error('Missing video file for browser extraction.');
    const meta = metadata || (await clientProbeVideo(file)).metadata;
    return clientExtractFrames(file, settings, meta);
  }

  try {
    const formData = new FormData();
    if (sessionId) {
      formData.append('session_id', sessionId);
    } else if (file) {
      formData.append('video', file);
    } else {
      throw new Error('Chýba video súbor alebo session.');
    }

    const types: string[] = [];
    if (settings.extractFirst) types.push('first');
    if (settings.extractLast) types.push('last');
    if (settings.extractMiddle) types.push('middle');
    if (settings.extractCustom) types.push('custom');

    formData.append('frame_types', types.join(','));
    if (settings.extractCustom) {
      formData.append('custom_mode', settings.customMode || 'seconds');
      if (settings.customMode === 'frame' && settings.customFrameNumber !== undefined) {
        formData.append('custom_frame', settings.customFrameNumber.toString());
      } else {
        formData.append('custom_time', settings.customTimeSec.toString());
      }
    }
    formData.append('output_format', settings.format);
    formData.append('quality', settings.quality.toString());
    formData.append('scale', settings.scale);

    if (settings.customPrefix && settings.customPrefix.trim()) {
      formData.append('custom_prefix', settings.customPrefix.trim());
    }
    if (settings.padToMultipleOf64) {
      formData.append('pad_to_multiple_of_64', 'true');
    }
    if (settings.includeManifest !== undefined) {
      formData.append('include_manifest', settings.includeManifest ? 'true' : 'false');
    }

    const res = await fetch(`${API_BASE}/api/extract`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      throw new Error('Server extraction failed');
    }

    return await res.json();
  } catch (err) {
    if (file && metadata) {
      return clientExtractFrames(file, settings, metadata);
    }
    throw err;
  }
}

export async function copyImageToClipboard(imageUrl: string): Promise<boolean> {
  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();

    // Clipboard API requires image/png
    if (blob.type === 'image/png') {
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob,
        }),
      ]);
      return true;
    } else {
      // Convert to png via canvas if webp or jpeg
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const blobUrl = URL.createObjectURL(blob);

      return new Promise((resolve) => {
        img.onload = async () => {
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          ctx?.drawImage(img, 0, 0);
          canvas.toBlob(async (pngBlob) => {
            if (pngBlob) {
              try {
                await navigator.clipboard.write([
                  new ClipboardItem({
                    'image/png': pngBlob,
                  }),
                ]);
                resolve(true);
              } catch (e) {
                console.error(e);
                resolve(false);
              }
            } else {
              resolve(false);
            }
            URL.revokeObjectURL(blobUrl);
          }, 'image/png');
        };
        img.onerror = () => {
          URL.revokeObjectURL(blobUrl);
          resolve(false);
        };
        img.src = blobUrl;
      });
    }
  } catch (err) {
    console.error('Kopírovanie zlyhalo:', err);
    return false;
  }
}
