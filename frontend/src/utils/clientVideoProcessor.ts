import JSZip from 'jszip';
import { ExtractedFrame, ExtractionResult, ExtractionSettings, VideoMetadata } from '../types';

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function formatDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00.000';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

function formatFilesize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export function clientProbeVideo(file: File): Promise<{ session_id: string; metadata: VideoMetadata }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);

    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const cleanup = () => {
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(objectUrl);
    };

    video.onloadedmetadata = () => {
      const width = video.videoWidth || 1920;
      const height = video.videoHeight || 1080;
      const duration = video.duration || 1;

      const divisor = gcd(Math.round(width), Math.round(height));
      const aspectX = Math.round(width / divisor);
      const aspectY = Math.round(height / divisor);
      const aspectRatio = (aspectX <= 32 && aspectY <= 32) ? `${aspectX}:${aspectY}` : `${(width / height).toFixed(2)}:1`;

      const fps = 30; // standard browser estimated fps
      const totalFrames = Math.max(1, Math.round(duration * fps));

      const ext = file.name.split('.').pop()?.toUpperCase() || 'VIDEO';

      const metadata: VideoMetadata = {
        filename: file.name,
        filesize_bytes: file.size,
        filesize_formatted: formatFilesize(file.size),
        duration_seconds: duration,
        duration_formatted: formatDuration(duration),
        resolution: `${width} × ${height}`,
        width,
        height,
        aspect_ratio: aspectRatio,
        fps,
        total_frames: totalFrames,
        video_codec: `${ext} (Browser Decoded)`,
        video_codec_long: `${ext} Video (HTML5 Media Engine)`,
        profile: 'Client-Side Hardware Accelerated',
        pixel_format: 'rgba (8-bit sRGB)',
        bit_depth: '8-bit',
        bitrate_bps: Math.round((file.size * 8) / Math.max(0.1, duration)),
        bitrate_formatted: `${Math.round((file.size * 8) / Math.max(0.1, duration) / 1000)} kbps`,
        container_format: ext.toLowerCase(),
        container_long: `${ext} Media Container`,
        has_audio: false,
        audio_codec: null,
      };

      const sessionId = 'client_' + Math.random().toString(36).substring(2, 10);
      cleanup();
      resolve({ session_id: sessionId, metadata });
    };

    video.onerror = () => {
      cleanup();
      reject(new Error(`Failed to decode video "${file.name}". Please ensure your browser supports this format.`));
    };

    video.src = objectUrl;
  });
}

export async function clientExtractFrames(
  file: File,
  settings: ExtractionSettings,
  metadata: VideoMetadata
): Promise<ExtractionResult> {
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'auto';
  video.muted = true;
  video.playsInline = true;
  video.src = objectUrl;

  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve();
    video.onerror = () => reject(new Error('Failed to load video stream for frame extraction.'));
  });

  const duration = video.duration || metadata.duration_seconds || 1;
  const fps = metadata.fps || 30;

  // Determine targets to extract
  const targets: Array<{ type: 'first' | 'last' | 'middle' | 'custom'; label: string; time: number; suffix: string }> = [];

  if (settings.extractFirst) {
    targets.push({
      type: 'first',
      label: 'Start Frame',
      time: 0.0,
      suffix: 'start_frame_stillex',
    });
  }

  if (settings.extractLast) {
    // Seek slightly before end to avoid black buffer on some video containers
    const endTime = Math.max(0, duration - 0.033);
    targets.push({
      type: 'last',
      label: 'End Frame',
      time: endTime,
      suffix: 'end_frame_stillex',
    });
  }

  if (settings.extractMiddle) {
    targets.push({
      type: 'middle',
      label: 'Mid Frame (50%)',
      time: duration / 2,
      suffix: 'mid_frame_stillex',
    });
  }

  if (settings.extractCustom) {
    let customTime = 0;
    let customLabel = 'Custom Frame';

    if (settings.customMode === 'frame' && settings.customFrameNumber !== undefined) {
      customTime = Math.max(0, Math.min(duration, settings.customFrameNumber / fps));
      customLabel = `Custom Frame #${settings.customFrameNumber} (${formatDuration(customTime)})`;
    } else {
      customTime = Math.max(0, Math.min(duration, settings.customTimeSec || 0));
      customLabel = `Custom Frame (${formatDuration(customTime)})`;
    }

    targets.push({
      type: 'custom',
      label: customLabel,
      time: customTime,
      suffix: 'custom_frame_stillex',
    });
  }

  if (targets.length === 0) {
    targets.push({
      type: 'first',
      label: 'Start Frame',
      time: 0.0,
      suffix: 'start_frame_stillex',
    });
  }

  // Base prefix
  const rawBase = settings.customPrefix && settings.customPrefix.trim()
    ? settings.customPrefix.trim()
    : file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
  const safeBase = rawBase.replace(/[^a-zA-Z0-9_-]/g, '_') || 'video';

  const format = settings.format.toLowerCase();
  const mimeType = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';
  const qualityParam = (format === 'png') ? undefined : Math.max(0.5, Math.min(1.0, settings.quality / 100));

  const extractedFrames: ExtractedFrame[] = [];
  const zip = new JSZip();

  // Helper to seek and capture
  const seekAndCapture = (targetTime: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const handleSeeked = () => {
        video.removeEventListener('seeked', handleSeeked);

        // Determine output dimensions
        let drawWidth = video.videoWidth || metadata.width;
        let drawHeight = video.videoHeight || metadata.height;

        if (settings.scale === '4k') {
          const ratio = Math.min(3840 / drawWidth, 2160 / drawHeight, 1);
          drawWidth = Math.round(drawWidth * ratio);
          drawHeight = Math.round(drawHeight * ratio);
        } else if (settings.scale === '1080p') {
          const ratio = Math.min(1920 / drawWidth, 1080 / drawHeight, 1);
          drawWidth = Math.round(drawWidth * ratio);
          drawHeight = Math.round(drawHeight * ratio);
        } else if (settings.scale === '720p') {
          const ratio = Math.min(1280 / drawWidth, 720 / drawHeight, 1);
          drawWidth = Math.round(drawWidth * ratio);
          drawHeight = Math.round(drawHeight * ratio);
        } else if (settings.scale === 'square_1024') {
          const ratio = Math.min(1024 / drawWidth, 1024 / drawHeight, 1);
          drawWidth = Math.round(drawWidth * ratio);
          drawHeight = Math.round(drawHeight * ratio);
        }

        let canvasWidth = drawWidth;
        let canvasHeight = drawHeight;
        let offsetX = 0;
        let offsetY = 0;

        if (settings.padToMultipleOf64) {
          canvasWidth = Math.ceil(drawWidth / 64) * 64;
          canvasHeight = Math.ceil(drawHeight / 64) * 64;
          offsetX = Math.floor((canvasWidth - drawWidth) / 2);
          offsetY = Math.floor((canvasHeight - drawHeight) / 2);
        }

        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          reject(new Error('Canvas 2D context unavailable.'));
          return;
        }

        if (settings.padToMultipleOf64) {
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);

        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to encode frame to blob.'));
          },
          mimeType,
          qualityParam
        );
      };

      video.addEventListener('seeked', handleSeeked, { once: true });
      video.currentTime = Math.max(0, Math.min(duration, targetTime));
    });
  };

  for (const t of targets) {
    const blob = await seekAndCapture(t.time);
    const filename = `${safeBase}_${t.suffix}.${format}`;
    const frameUrl = URL.createObjectURL(blob);

    extractedFrames.push({
      type: t.type,
      label: t.label,
      filename,
      url: frameUrl,
      timestamp_seconds: t.time,
      timestamp_formatted: formatDuration(t.time),
      filesize_bytes: blob.size,
      filesize_formatted: formatFilesize(blob.size),
      format: format.toUpperCase(),
    });

    zip.file(filename, blob);
  }

  // Cleanup video element
  video.removeAttribute('src');
  video.load();
  URL.revokeObjectURL(objectUrl);

  // Manifest JSON
  const manifestData = {
    generator: 'STILLEX Browser Engine',
    video_source: file.name,
    export_prefix: safeBase,
    metadata,
    frames: extractedFrames.map((f) => ({
      type: f.type,
      label: f.label,
      filename: f.filename,
      timestamp_seconds: f.timestamp_seconds,
      timestamp_formatted: f.timestamp_formatted,
      filesize: f.filesize_formatted,
      format: f.format,
    })),
    settings: {
      format: format.toUpperCase(),
      quality: settings.quality,
      scale: settings.scale,
      pad_to_multiple_of_64: !!settings.padToMultipleOf64,
    },
    ai_conditioning_notes: {
      runway_gen3: 'Use start_frame_stillex for first frame, end_frame_stillex for last frame conditioning.',
      kling_ai: 'Supports 1:1, 16:9, 9:16 Start and End frame interpolation.',
      luma_dream_machine: 'Use start_frame_stillex and end_frame_stillex in Keyframes mode.',
      comfyui: 'Load with LoadImage node directly into VAEEncode for latent interpolation.',
    },
  };

  if (settings.includeManifest !== false) {
    zip.file('manifest.json', JSON.stringify(manifestData, null, 2));
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const zipUrl = URL.createObjectURL(zipBlob);

  const manifestBlob = new Blob([JSON.stringify(manifestData, null, 2)], { type: 'application/json' });
  const manifestUrl = URL.createObjectURL(manifestBlob);

  return {
    session_id: 'client_' + Math.random().toString(36).substring(2, 10),
    metadata,
    frames: extractedFrames,
    zip_url: zipUrl,
    manifest_url: manifestUrl,
    settings_used: {
      format: format.toUpperCase(),
      quality: settings.quality,
      scale: settings.scale,
      custom_prefix: safeBase,
      pad_to_multiple_of_64: !!settings.padToMultipleOf64,
    },
  };
}
