import React, { useState } from 'react';
import { ExtractedFrame } from '../types';
import { copyImageToClipboard } from '../utils/api';
import { useTranslation } from '../context/LanguageContext';

interface FrameZoomModalProps {
  frame: ExtractedFrame | null;
  onClose: () => void;
  resolution: string;
}

export const FrameZoomModal: React.FC<FrameZoomModalProps> = ({ frame, onClose, resolution }) => {
  const { t } = useTranslation();
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isCopied, setIsCopied] = useState(false);

  if (!frame) return null;

  const handleCopy = async () => {
    const success = await copyImageToClipboard(frame.url);
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoomLevel(1);

  return (
    <div
      className="fixed inset-0 z-50 bg-black flex flex-col p-3 font-mono"
      onClick={onClose}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between pb-2 border-b border-zinc-800 text-xs text-white z-10 bg-black"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <span className="text-zinc-500">// INSPECTION_VIEWPORT:</span>
          <span className="text-white font-bold">{frame.label.toUpperCase()}</span>
          <span className="text-[10px] text-zinc-500 border border-zinc-800 px-1">
            {frame.timestamp_formatted} • {resolution} • {frame.filesize_formatted}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Zoom controls */}
          <div className="flex items-center border border-zinc-700 bg-black text-xs">
            <button
              onClick={handleZoomOut}
              className="px-2 py-0.5 hover:bg-white hover:text-black border-r border-zinc-800"
            >
              [-]
            </button>
            <span className="px-2 text-[10px] text-zinc-300">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="px-2 py-0.5 hover:bg-white hover:text-black border-r border-zinc-800"
            >
              [+]
            </button>
            <button
              onClick={handleResetZoom}
              className="px-2 py-0.5 hover:bg-white hover:text-black text-[10px]"
            >
              1:1
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="px-2.5 py-1 border border-zinc-700 bg-black hover:bg-white hover:text-black text-xs font-bold transition-colors cursor-pointer"
          >
            {isCopied ? '[ ✓ COPIED ]' : '[ COPY ]'}
          </button>

          <a
            href={frame.url}
            download={frame.filename}
            className="px-2.5 py-1 border border-white bg-white text-black font-bold text-xs hover:bg-zinc-200 transition-colors"
          >
            [ DOWNLOAD ]
          </a>

          <button
            onClick={onClose}
            className="px-2 py-1 border border-zinc-700 bg-black text-zinc-400 hover:text-white hover:border-white text-xs cursor-pointer ml-1"
          >
            [ ESC / × ]
          </button>
        </div>
      </div>

      {/* Grid Canvas Viewport */}
      <div
        className="flex-1 flex items-center justify-center overflow-auto p-4 relative cursor-crosshair tech-grid"
        onClick={onClose}
      >
        <div
          className="transition-transform duration-75 ease-out border border-zinc-700"
          style={{ transform: `scale(${zoomLevel})` }}
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={frame.url}
            alt={frame.label}
            className="max-h-[85vh] max-w-[90vw] object-contain block"
          />
        </div>
      </div>
    </div>
  );
};
