import React from 'react';
import { VideoMetadata } from '../types';
import { useTranslation } from '../context/LanguageContext';

interface MetadataHUDProps {
  metadata: VideoMetadata;
}

export const MetadataHUD: React.FC<MetadataHUDProps> = ({ metadata }) => {
  const { t } = useTranslation();

  return (
    <div className="border border-zinc-800 bg-black p-4 font-mono relative space-y-3">
      {/* Corner Registration Crosshairs */}
      <span className="absolute top-1.5 left-2 text-[10px] text-zinc-600 select-none">+</span>
      <span className="absolute top-1.5 right-2 text-[10px] text-zinc-600 select-none">+</span>
      <span className="absolute bottom-1.5 left-2 text-[10px] text-zinc-600 select-none">+</span>
      <span className="absolute bottom-1.5 right-2 text-[10px] text-zinc-600 select-none">+</span>

      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-zinc-500 font-bold">[FILE]</span>
          <span className="text-white font-bold tracking-tight truncate max-w-sm sm:max-w-md">
            {metadata.filename}
          </span>
          <span className="text-[10px] text-zinc-400 px-1 border border-zinc-800 uppercase">
            {metadata.container_format.split(',')[0]}
          </span>
        </div>

        <div className="text-zinc-400 text-xs">
          <span>{metadata.filesize_formatted}</span>
          <span className="mx-2 text-zinc-700">|</span>
          <span className="text-zinc-300">FFmpeg 7.1 Verified</span>
        </div>
      </div>

      {/* 4 Clear High-Density Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {/* Resolution */}
        <div className="p-3 border border-zinc-800 bg-zinc-950">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
            {t('resolution')}
          </div>
          <div className="text-sm font-bold text-white font-mono">
            {metadata.resolution}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">
            {t('aspectRatio')}: {metadata.aspect_ratio}
          </div>
        </div>

        {/* Video Codec */}
        <div className="p-3 border border-zinc-800 bg-zinc-950">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
            {t('codec')}
          </div>
          <div className="text-sm font-bold text-white font-mono truncate">
            {metadata.video_codec}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5 truncate">
            {metadata.profile || 'Standard Profile'}
          </div>
        </div>

        {/* Duration & FPS */}
        <div className="p-3 border border-zinc-800 bg-zinc-950">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
            {t('duration')} & {t('fps')}
          </div>
          <div className="text-sm font-bold text-white font-mono">
            {metadata.duration_formatted}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">
            {metadata.fps} fps ({metadata.total_frames} frames)
          </div>
        </div>

        {/* Bitrate & Color */}
        <div className="p-3 border border-zinc-800 bg-zinc-950">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">
            {t('colorDepth')} & {t('bitrate')}
          </div>
          <div className="text-sm font-bold text-white font-mono">
            {metadata.bit_depth}
          </div>
          <div className="text-[11px] text-zinc-400 mt-0.5">
            {metadata.bitrate_formatted}
          </div>
        </div>
      </div>
    </div>
  );
};
