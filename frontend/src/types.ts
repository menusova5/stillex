export interface VideoMetadata {
  filename: string;
  filesize_bytes: number;
  filesize_formatted: string;
  duration_seconds: number;
  duration_formatted: string;
  width: number;
  height: number;
  resolution: string;
  aspect_ratio: string;
  fps: number;
  total_frames: number;
  video_codec: string;
  video_codec_long: string;
  profile: string;
  pixel_format: string;
  bit_depth: string;
  bitrate_bps: number;
  bitrate_formatted: string;
  container_format: string;
  container_long: string;
  has_audio: boolean;
  audio_codec: string | null;
}

export interface ExtractedFrame {
  type: 'first' | 'last' | 'middle' | 'custom';
  label: string;
  filename: string;
  url: string;
  timestamp_seconds: number;
  timestamp_formatted: string;
  filesize_bytes: number;
  filesize_formatted: string;
  format: string;
}

export interface ExtractionSettings {
  format: 'png' | 'webp' | 'jpg';
  quality: number;
  scale: 'original' | '4k' | '1080p' | '720p' | 'square_1024';
  extractFirst: boolean;
  extractLast: boolean;
  extractMiddle: boolean;
  extractCustom: boolean;
  customMode?: 'seconds' | 'frame';
  customTimeSec: number;
  customFrameNumber?: number;
  customPrefix?: string;
  padToMultipleOf64?: boolean;
  includeManifest?: boolean;
}

export interface ExtractionResult {
  session_id: string;
  metadata: VideoMetadata;
  frames: ExtractedFrame[];
  zip_url: string;
  manifest_url?: string;
  settings_used: {
    format: string;
    quality: number;
    scale: string;
    custom_prefix?: string;
    pad_to_multiple_of_64?: boolean;
  };
}

export interface BatchItem {
  id: string;
  file: File;
  status: 'queued' | 'analyzing' | 'ready' | 'extracting' | 'completed' | 'error';
  sessionId?: string;
  metadata?: VideoMetadata;
  result?: ExtractionResult;
  error?: string;
  progress?: number;
}
