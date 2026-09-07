import React, { useState } from 'react';
import { ExtractedFrame, ExtractionResult } from '../types';
import { copyImageToClipboard } from '../utils/api';
import { useTranslation } from '../context/LanguageContext';

interface FramePreviewProps {
  result: ExtractionResult;
  onZoomFrame: (frame: ExtractedFrame) => void;
}

export const FramePreview: React.FC<FramePreviewProps> = ({ result, onZoomFrame }) => {
  const { t } = useTranslation();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (frame: ExtractedFrame) => {
    const success = await copyImageToClipboard(frame.url);
    if (success) {
      setCopiedId(frame.filename);
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      alert('Clipboard copy failed. Please download the file directly.');
    }
  };

  const startFrame = result.frames.find((f) => f.type === 'first');
  const endFrame = result.frames.find((f) => f.type === 'last');
  const otherFrames = result.frames.filter((f) => f.type !== 'first' && f.type !== 'last');

  return (
    <div className="space-y-4 font-mono">
      {/* Top Banner & Batch ZIP Action */}
      <div className="border border-zinc-700 bg-black p-4 flex flex-wrap items-center justify-between gap-4 relative">
        <span className="absolute top-1 left-2 text-[10px] text-zinc-600 select-none">+</span>
        <span className="absolute bottom-1 right-2 text-[10px] text-zinc-600 select-none">+</span>

        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-white uppercase">
            <span>{t('previewHeader')}</span>
            <span className="text-xs text-zinc-400 font-normal">
              [{result.metadata.resolution} • {result.settings_used.format}]
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            {t('previewSubtext')}
          </p>
        </div>

        <div>
          <a
            href={result.zip_url}
            download
            className="px-4 py-2 border border-white bg-white hover:bg-zinc-200 text-black font-bold text-xs tracking-wider uppercase transition-colors inline-block"
          >
            [ 🗄 {t('downloadZip')} ]
          </a>
        </div>
      </div>

      {/* Direct AI Ecosystem & Affiliate Partners */}
      <div className="p-2.5 border border-zinc-800 bg-zinc-950 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="text-zinc-500 text-[11px]">
          // DIRECT AI INTEGRATIONS:
        </span>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <a
            href="https://klingai.com"
            target="_blank"
            rel="noreferrer"
            className="px-2 py-0.5 border border-zinc-800 hover:border-white text-zinc-300 hover:text-white transition-colors"
          >
            [ ↗ Kling AI ]
          </a>
          <a
            href="https://runwayml.com"
            target="_blank"
            rel="noreferrer"
            className="px-2 py-0.5 border border-zinc-800 hover:border-white text-zinc-300 hover:text-white transition-colors"
          >
            [ ↗ Runway Gen-3 ]
          </a>
          <a
            href="https://lumalabs.ai/dream-machine"
            target="_blank"
            rel="noreferrer"
            className="px-2 py-0.5 border border-zinc-800 hover:border-white text-zinc-300 hover:text-white transition-colors"
          >
            [ ↗ Luma Dream Machine ]
          </a>
          <a
            href="https://www.topazlabs.com"
            target="_blank"
            rel="noreferrer"
            className="px-2 py-0.5 border border-zinc-800 hover:border-white text-zinc-300 hover:text-white transition-colors"
          >
            [ ↗ Topaz 8K Upscale ]
          </a>
        </div>
      </div>

      {/* Side-by-Side: Start Frame & End Frame */}
      {startFrame && endFrame && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Start Frame */}
          <TechnicalFrameCard
            frame={startFrame}
            badgeText={t('startFrameBadge')}
            timeCode="00:00:00.000"
            isCopied={copiedId === startFrame.filename}
            onCopy={() => handleCopy(startFrame)}
            onZoom={() => onZoomFrame(startFrame)}
            resolution={result.metadata.resolution}
          />

          {/* End Frame */}
          <TechnicalFrameCard
            frame={endFrame}
            badgeText={t('endFrameBadge')}
            timeCode={endFrame.timestamp_formatted}
            isCopied={copiedId === endFrame.filename}
            onCopy={() => handleCopy(endFrame)}
            onZoom={() => onZoomFrame(endFrame)}
            resolution={result.metadata.resolution}
          />
        </div>
      )}

      {/* Other frames */}
      {otherFrames.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            {t('additionalFrames')}:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {otherFrames.map((frame) => (
              <TechnicalFrameCard
                key={frame.filename}
                frame={frame}
                badgeText={frame.type.toUpperCase()}
                timeCode={frame.timestamp_formatted}
                isCopied={copiedId === frame.filename}
                onCopy={() => handleCopy(frame)}
                onZoom={() => onZoomFrame(frame)}
                resolution={result.metadata.resolution}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface TechnicalFrameCardProps {
  frame: ExtractedFrame;
  badgeText: string;
  timeCode: string;
  isCopied: boolean;
  onCopy: () => void;
  onZoom: () => void;
  resolution: string;
}

const TechnicalFrameCard: React.FC<TechnicalFrameCardProps> = ({
  frame,
  badgeText,
  timeCode,
  isCopied,
  onCopy,
  onZoom,
  resolution,
}) => {
  const { t } = useTranslation();

  return (
    <div className="border border-zinc-700 bg-black flex flex-col group font-mono relative">
      {/* Corner crosshairs */}
      <span className="absolute -top-1.5 -left-1 text-[10px] text-zinc-500 select-none z-10">+</span>
      <span className="absolute -top-1.5 -right-1 text-[10px] text-zinc-500 select-none z-10">+</span>
      <span className="absolute -bottom-1.5 -left-1 text-[10px] text-zinc-500 select-none z-10">+</span>
      <span className="absolute -bottom-1.5 -right-1 text-[10px] text-zinc-500 select-none z-10">+</span>

      {/* Header bar */}
      <div className="px-3 py-2 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold">{badgeText}</span>
          <span className="text-zinc-400">[{timeCode}]</span>
        </div>

        <div className="text-zinc-400 text-xs">
          <span>{frame.filesize_formatted}</span>
        </div>
      </div>

      {/* Viewport Image */}
      <div
        className="relative aspect-video bg-black flex items-center justify-center overflow-hidden cursor-crosshair border-b border-zinc-800"
        onClick={onZoom}
      >
        <img
          src={frame.url}
          alt={frame.label}
          className="w-full h-full object-contain"
        />

        {/* Hover inspect label */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center bg-black/40">
          <span className="px-3 py-1.5 border border-white bg-black text-white text-xs font-bold uppercase tracking-wider">
            [ ⌖ {t('zoomInspect')} ]
          </span>
        </div>

        {/* Resolution tag */}
        <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black text-[10px] text-zinc-300 border border-zinc-800">
          {resolution}
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-2.5 bg-zinc-950 grid grid-cols-2 gap-2 text-xs">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCopy();
          }}
          className={`py-2 px-3 border text-xs font-bold transition-colors cursor-pointer text-center ${
            isCopied
              ? 'border-white bg-white text-black'
              : 'border-zinc-700 bg-black text-zinc-200 hover:border-white hover:text-white'
          }`}
        >
          {isCopied ? `[ ✓ ${t('copied')} ]` : `[ 📋 ${t('copyClipboard')} ]`}
        </button>

        <a
          href={frame.url}
          download={frame.filename}
          onClick={(e) => e.stopPropagation()}
          className="py-2 px-3 border border-zinc-700 bg-black hover:border-white text-zinc-200 hover:text-white text-xs font-bold transition-colors text-center cursor-pointer"
        >
          [ 💾 {t('downloadSingle')} ]
        </a>
      </div>
    </div>
  );
};
