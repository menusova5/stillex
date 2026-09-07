import React from 'react';
import { ExtractionSettings, VideoMetadata } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { useTier } from '../context/TierContext';

interface SettingsPanelProps {
  settings: ExtractionSettings;
  onChange: (newSettings: ExtractionSettings) => void;
  onApply: () => void;
  metadata?: VideoMetadata;
  isLoading?: boolean;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onChange,
  onApply,
  metadata,
  isLoading = false,
}) => {
  const { t } = useTranslation();
  const { isPro, openPricing } = useTier();
  const maxDuration = metadata ? metadata.duration_seconds : 60;
  const [presetApplied, setPresetApplied] = React.useState(false);

  const applyAiPreset = () => {
    onChange({
      ...settings,
      format: 'png',
      quality: 100,
      scale: 'original',
      extractFirst: true,
      extractLast: true,
      extractMiddle: false,
      extractCustom: false,
    });
    setPresetApplied(true);
    setTimeout(() => setPresetApplied(false), 2500);
  };

  return (
    <div className="border border-zinc-800 bg-black p-5 font-mono relative space-y-5">
      {/* Corner Registration Crosshairs */}
      <span className="absolute top-1.5 left-2 text-[10px] text-zinc-600 select-none">+</span>
      <span className="absolute top-1.5 right-2 text-[10px] text-zinc-600 select-none">+</span>
      <span className="absolute bottom-1.5 left-2 text-[10px] text-zinc-600 select-none">+</span>
      <span className="absolute bottom-1.5 right-2 text-[10px] text-zinc-600 select-none">+</span>

      <div className="flex items-center justify-between pb-2 border-b border-zinc-800 text-xs">
        <span className="text-white font-bold tracking-wider uppercase">
          {t('settingsTitle')}
        </span>

        {/* Interactive AI Workflow Preset Button with Hover Tooltip */}
        <div className="relative group/preset">
          <button
            type="button"
            onClick={applyAiPreset}
            className={`px-2.5 py-1 text-[11px] border transition-all cursor-pointer font-bold ${
              presetApplied
                ? 'border-white bg-white text-black'
                : 'border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-white hover:text-white hover:bg-zinc-900'
            }`}
          >
            {presetApplied ? t('aiPresetApplied') : t('aiPresetButton')}
          </button>

          {/* Hover Information Box */}
          <div className="absolute right-0 top-full mt-1.5 w-80 p-2.5 bg-black border border-white text-[11px] text-zinc-200 z-30 opacity-0 group-hover/preset:opacity-100 pointer-events-none transition-opacity duration-150 shadow-2xl">
            <div className="font-bold text-white mb-1 uppercase tracking-wider flex items-center justify-between border-b border-zinc-800 pb-1">
              <span>AI Video / Image Preset</span>
              <span className="text-[10px] text-zinc-400">[1-CLICK]</span>
            </div>
            <p className="text-zinc-300 leading-relaxed mt-1">
              {t('aiPresetTooltip')}
            </p>
            <div className="mt-2 text-[10px] text-zinc-500 pt-1 border-t border-zinc-900">
              CLICK TO APPLY: PNG Lossless • 1:1 Scale • Start & End
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Column 1: Target Frames */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            1. {t('targetFrames')}
          </div>
          <div className="space-y-2 text-xs">
            <label className="flex items-center gap-2.5 cursor-pointer text-zinc-200 hover:text-white select-none">
              <input
                type="checkbox"
                checked={settings.extractFirst}
                onChange={(e) => onChange({ ...settings, extractFirst: e.target.checked })}
                className="w-4 h-4 accent-white cursor-pointer"
              />
              <span className="font-semibold">{t('startFrame')}</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer text-zinc-200 hover:text-white select-none">
              <input
                type="checkbox"
                checked={settings.extractLast}
                onChange={(e) => onChange({ ...settings, extractLast: e.target.checked })}
                className="w-4 h-4 accent-white cursor-pointer"
              />
              <span className="font-semibold">{t('endFrame')}</span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer text-zinc-400 hover:text-white select-none">
              <input
                type="checkbox"
                checked={settings.extractMiddle}
                onChange={(e) => onChange({ ...settings, extractMiddle: e.target.checked })}
                className="w-4 h-4 accent-white cursor-pointer"
              />
              <span>{t('midFrame')}</span>
            </label>

            {/* Custom Frame (PRO feature) */}
            <div className="flex items-center justify-between">
              <label
                onClick={(e) => {
                  if (!isPro) {
                    e.preventDefault();
                    openPricing();
                  }
                }}
                className={`flex items-center gap-2.5 select-none ${
                  isPro ? 'cursor-pointer text-zinc-300 hover:text-white' : 'cursor-pointer opacity-70 text-zinc-400'
                }`}
              >
                <input
                  type="checkbox"
                  disabled={!isPro}
                  checked={isPro && settings.extractCustom}
                  onChange={(e) => isPro && onChange({ ...settings, extractCustom: e.target.checked })}
                  className="w-4 h-4 accent-white cursor-pointer disabled:opacity-50"
                />
                <span>{t('customFrame')}</span>
              </label>

              {!isPro && (
                <button
                  type="button"
                  onClick={openPricing}
                  className="text-[9px] px-1 border border-zinc-700 text-zinc-400 hover:border-white hover:text-white cursor-pointer"
                >
                  PRO
                </button>
              )}
            </div>
          </div>

          {isPro && settings.extractCustom && (
            <div className="pt-2 pl-4 space-y-2 border-l border-zinc-700 bg-zinc-950/60 p-2">
              {/* Toggle Mode: Seconds vs Frame Number */}
              <div className="grid grid-cols-2 gap-1 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => onChange({ ...settings, customMode: 'seconds' })}
                  className={`py-1 border text-center transition-colors cursor-pointer ${
                    (settings.customMode || 'seconds') === 'seconds'
                      ? 'border-white bg-white text-black'
                      : 'border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white'
                  }`}
                >
                  [ {t('modeSeconds')} ]
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...settings,
                      customMode: 'frame',
                      customFrameNumber:
                        settings.customFrameNumber ??
                        Math.floor((metadata ? metadata.total_frames : 60) / 2),
                    })
                  }
                  className={`py-1 border text-center transition-colors cursor-pointer ${
                    settings.customMode === 'frame'
                      ? 'border-white bg-white text-black'
                      : 'border-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-white'
                  }`}
                >
                  [ {t('modeFrame')} ]
                </button>
              </div>

              {/* Mode A: Seconds */}
              {(settings.customMode || 'seconds') === 'seconds' && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>{t('customTime')}: {settings.customTimeSec.toFixed(2)}s</span>
                    <span>Max: {maxDuration.toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={maxDuration}
                    step="0.04"
                    value={settings.customTimeSec}
                    onChange={(e) =>
                      onChange({ ...settings, customTimeSec: parseFloat(e.target.value) })
                    }
                    className="w-full accent-white h-1 bg-zinc-800 cursor-pointer"
                  />
                </div>
              )}

              {/* Mode B: Exact Frame Number */}
              {settings.customMode === 'frame' && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>
                      {t('customFrameNum')}: #{settings.customFrameNumber ?? 0}
                    </span>
                    <span>Total: {metadata ? metadata.total_frames : '—'}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={metadata ? Math.max(0, metadata.total_frames - 1) : 100}
                    step="1"
                    value={settings.customFrameNumber ?? 0}
                    onChange={(e) =>
                      onChange({ ...settings, customFrameNumber: parseInt(e.target.value, 10) })
                    }
                    className="w-full accent-white h-1 bg-zinc-800 cursor-pointer"
                  />
                  <div className="text-[10px] text-zinc-500">
                    Calculated PTS: ~
                    {((settings.customFrameNumber ?? 0) / (metadata?.fps || 30)).toFixed(3)}s
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Column 2: Format & Quality */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            2. {t('formatTitle')}
          </div>
          <div className="space-y-1.5 text-xs">
            {[
              { id: 'png', name: 'PNG', badge: 'Lossless (AI)', desc: t('formatPngDesc') },
              { id: 'webp', name: 'WebP', badge: 'Compact', desc: t('formatWebpDesc') },
              { id: 'jpg', name: 'JPEG', badge: 'Standard', desc: t('formatJpgDesc') },
            ].map((fmt) => (
              <div
                key={fmt.id}
                onClick={() => onChange({ ...settings, format: fmt.id as any })}
                className={`p-2.5 border cursor-pointer flex items-center justify-between transition-all ${
                  settings.format === fmt.id
                    ? 'border-white bg-white text-black font-bold'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-600'
                }`}
              >
                <div>
                  <div className="text-xs font-bold">[{fmt.name}]</div>
                  <div className={`text-[10px] mt-0.5 ${settings.format === fmt.id ? 'text-black/75' : 'text-zinc-500'}`}>
                    {fmt.desc}
                  </div>
                </div>
                <span className="text-[10px] px-1 border border-current shrink-0 ml-2">
                  {fmt.badge}
                </span>
              </div>
            ))}
          </div>

          {settings.format !== 'png' && (
            <div className="pt-2 space-y-1 text-xs">
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span>{t('qualitySlider')}:</span>
                <span className="font-bold text-white">{settings.quality}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                value={settings.quality}
                onChange={(e) => onChange({ ...settings, quality: parseInt(e.target.value) })}
                className="w-full accent-white h-1 bg-zinc-800 cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Column 3: Resolution & Action Button */}
        <div className="space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
              3. {t('resolutionTitle')}
            </div>
            <select
              value={settings.scale}
              onChange={(e) => onChange({ ...settings, scale: e.target.value as any })}
              className="w-full bg-zinc-950 border border-zinc-700 p-2.5 text-xs text-white focus:outline-none focus:border-white font-mono cursor-pointer"
            >
              <option value="original">
                {t('nativeRes')} {metadata ? `(${metadata.resolution})` : ''}
              </option>
              <option value="4k">{t('res4k')}</option>
              <option value="1080p">{t('res1080p')}</option>
              <option value="720p">{t('res720p')}</option>
              <option value="square_1024">{t('resSquare')}</option>
            </select>
          </div>

          {/* Primary Action Button */}
          <div className="pt-3">
            <button
              onClick={onApply}
              disabled={isLoading || (!settings.extractFirst && !settings.extractLast && !settings.extractMiddle && !settings.extractCustom)}
              className="w-full py-3.5 px-4 bg-white hover:bg-zinc-200 text-black font-bold text-sm tracking-wider uppercase border border-white transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-2 shadow-lg"
            >
              {isLoading ? (
                <span>[ {t('processingButton')} ]</span>
              ) : (
                <span>[ ▷ {t('extractButton')} ]</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Pro Features Section */}
      <div className="pt-3 border-t border-zinc-900 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        {/* Custom Prefix */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-zinc-400">Custom Filename Prefix:</span>
            {!isPro && (
              <button
                type="button"
                onClick={openPricing}
                className="text-[9px] px-1 border border-zinc-700 text-zinc-400 hover:border-white hover:text-white cursor-pointer"
              >
                PRO
              </button>
            )}
          </div>
          <input
            type="text"
            disabled={!isPro}
            value={settings.customPrefix || ''}
            onChange={(e) => onChange({ ...settings, customPrefix: e.target.value })}
            placeholder={isPro ? "e.g. scene01_take02" : "Locked (Creator Pro)"}
            className="w-full bg-zinc-950 border border-zinc-800 disabled:opacity-50 px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-white font-mono placeholder:text-zinc-600"
          />
        </div>

        {/* Smart Padding */}
        <div className="flex items-center gap-2 pt-4 sm:pt-5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              disabled={!isPro}
              checked={!!settings.padToMultipleOf64}
              onChange={(e) => onChange({ ...settings, padToMultipleOf64: e.target.checked })}
              className="w-3.5 h-3.5 accent-white disabled:opacity-50 cursor-pointer"
            />
            <span className="text-zinc-300 text-xs">Smart Aspect Padding (64px)</span>
          </label>
          {!isPro && (
            <button
              type="button"
              onClick={openPricing}
              className="text-[9px] px-1 border border-zinc-700 text-zinc-400 hover:border-white hover:text-white cursor-pointer"
            >
              PRO
            </button>
          )}
        </div>

        {/* Manifest JSON in ZIP */}
        <div className="flex items-center gap-2 pt-4 sm:pt-5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={settings.includeManifest !== false}
              onChange={(e) => onChange({ ...settings, includeManifest: e.target.checked })}
              className="w-3.5 h-3.5 accent-white cursor-pointer"
            />
            <span className="text-zinc-300 text-xs">Include metadata.json in ZIP</span>
          </label>
        </div>
      </div>
    </div>
  );
};
