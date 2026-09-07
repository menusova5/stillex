import React, { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  isLoading?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFilesSelected, isLoading = false }) => {
  const { t } = useTranslation();
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      onFilesSelected(files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      onFilesSelected(files);
      e.target.value = '';
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`relative group cursor-pointer border border-dashed p-10 sm:p-14 text-center transition-all font-mono ${
        isDragOver
          ? 'border-white bg-zinc-900 text-white'
          : 'border-zinc-700 bg-black hover:border-zinc-400 hover:bg-zinc-950 text-zinc-300'
      } ${isLoading ? 'pointer-events-none opacity-40' : ''}`}
    >
      {/* 4 Corner Crosshairs */}
      <span className="absolute top-1.5 left-2 text-[12px] text-zinc-600 select-none">+</span>
      <span className="absolute top-1.5 right-2 text-[12px] text-zinc-600 select-none">+</span>
      <span className="absolute bottom-1.5 left-2 text-[12px] text-zinc-600 select-none">+</span>
      <span className="absolute bottom-1.5 right-2 text-[12px] text-zinc-600 select-none">+</span>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/*,.mkv,.avi,.mov,.webm,.mp4,.flv,.wmv,.m4v,.ts,.mts,.prores"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
        <div className="w-12 h-12 border border-zinc-600 flex items-center justify-center text-zinc-300 group-hover:border-white group-hover:text-white transition-colors">
          <Upload className="w-5 h-5" />
        </div>

        <div>
          <h3 className="text-sm sm:text-base font-bold text-white tracking-wide uppercase">
            {t('dropZoneTitle')}
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            {t('dropZoneSubtitle')}
          </p>
        </div>

        {/* Clean supported formats bar */}
        <div className="pt-3 border-t border-zinc-800 w-full flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-zinc-500">
          <span>{t('supportedFormats')}</span>
          <span className="text-zinc-300 font-bold">MP4 • MOV (ProRes) • MKV • WebM • AVI</span>
        </div>
      </div>
    </div>
  );
};
