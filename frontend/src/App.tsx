import React, { useEffect, useState, useRef } from 'react';
import { DropZone } from './components/DropZone';
import { MetadataHUD } from './components/MetadataHUD';
import { SettingsPanel } from './components/SettingsPanel';
import { FramePreview } from './components/FramePreview';
import { FrameZoomModal } from './components/FrameZoomModal';
import { BatchList } from './components/BatchList';
import { StepProgress } from './components/StepProgress';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { PricingModal } from './components/PricingModal';
import { LanguageProvider, useTranslation } from './context/LanguageContext';
import { TierProvider, useTier } from './context/TierContext';
import { BatchItem, ExtractedFrame, ExtractionResult, ExtractionSettings, VideoMetadata } from './types';
import { checkHealth, extractFrames, probeVideo } from './utils/api';

const AppContent: React.FC = () => {
  const { t } = useTranslation();
  const { isPro, dailyUsage, maxFreeDaily, canProcess, incrementUsage, openPricing } = useTier();

  const [isServerHealthy, setIsServerHealthy] = useState<boolean | null>(null);

  // Active state
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);

  // Stepper state
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Batch queue
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  // Loading & error
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [tierNotice, setTierNotice] = useState<string | null>(null);

  // Zoom modal
  const [zoomedFrame, setZoomedFrame] = useState<ExtractedFrame | null>(null);

  // Extraction Settings
  const [settings, setSettings] = useState<ExtractionSettings>({
    format: 'png',
    quality: 100,
    scale: 'original',
    extractFirst: true,
    extractLast: true,
    extractMiddle: false,
    extractCustom: false,
    customTimeSec: 0,
    customPrefix: '',
    padToMultipleOf64: false,
    includeManifest: true,
  });

  // Section references for smooth scrolling
  const uploadSectionRef = useRef<HTMLDivElement>(null);
  const configSectionRef = useRef<HTMLDivElement>(null);
  const exportSectionRef = useRef<HTMLDivElement>(null);

  const [engineName, setEngineName] = useState<string>('Detecting...');

  useEffect(() => {
    checkHealth()
      .then((res) => {
        setIsServerHealthy(res.ffmpeg_available && res.ffprobe_available);
        setEngineName(res.engine_name || (res.status === 'client_engine' ? 'Browser WebEngine' : 'FFmpeg 7.1'));
      })
      .catch(() => {
        setIsServerHealthy(true);
        setEngineName('Browser WebEngine');
      });
  }, []);

  const scrollToSection = (sectionRef: React.RefObject<HTMLDivElement | null>) => {
    setTimeout(() => {
      if (sectionRef.current) {
        sectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 120);
  };

  const handleUploadVideo = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setLoadingStep(t('loadingProbe'));

    try {
      const probeRes = await probeVideo(file);
      setMetadata(probeRes.metadata);
      setCurrentSessionId(probeRes.session_id);
      setCurrentFile(file);

      if (probeRes.metadata.duration_seconds > 0) {
        setSettings((prev) => ({
          ...prev,
          customTimeSec: parseFloat((probeRes.metadata.duration_seconds / 2).toFixed(2)),
        }));
      }

      // Step 2 + auto-scroll
      setCurrentStep(2);
      scrollToSection(configSectionRef);

      return probeRes;
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Video analysis failed.');
      throw err;
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleExtractFrames = async () => {
    if (!currentSessionId && !currentFile) return;

    if (!canProcess) {
      setError(`Daily free limit reached (${maxFreeDaily}/${maxFreeDaily}). Upgrade to Creator Pro for unlimited extractions.`);
      openPricing();
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadingStep(t('loadingExtract'));

    try {
      const extractRes = await extractFrames(currentSessionId, currentFile, settings, metadata || undefined);
      setResult(extractRes);
      incrementUsage();

      if (selectedBatchId) {
        setBatchItems((prev) =>
          prev.map((item) =>
            item.id === selectedBatchId
              ? { ...item, result: extractRes, status: 'completed' }
              : item
          )
        );
      }

      // Step 3 + auto-scroll
      setCurrentStep(3);
      scrollToSection(exportSectionRef);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Frame extraction failed.');
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleFilesSelected = async (files: File[]) => {
    if (files.length === 0) return;
    setTierNotice(null);

    if (!canProcess) {
      setError(`Daily free limit reached (${maxFreeDaily}/${maxFreeDaily}). Upgrade to Creator Pro for unlimited extractions.`);
      openPricing();
      return;
    }

    // Free tier limitation: Only 1 video at a time
    if (!isPro && files.length > 1) {
      setTierNotice(
        `Free tier processes 1 video at a time. Processing first video "${files[0].name}". Upgrade to Creator Pro for multi-file batch processing.`
      );
      files = [files[0]];
    }

    if (files.length === 1) {
      const file = files[0];
      const newItem: BatchItem = {
        id: Math.random().toString(36).substring(2, 9),
        file,
        status: 'analyzing',
      };
      setBatchItems([newItem]);
      setSelectedBatchId(newItem.id);

      try {
        const probeRes = await handleUploadVideo(file);
        setBatchItems([
          {
            ...newItem,
            status: 'ready',
            sessionId: probeRes.session_id,
            metadata: probeRes.metadata,
          },
        ]);
      } catch (err: any) {
        setBatchItems([
          {
            ...newItem,
            status: 'error',
            error: err.message,
          },
        ]);
      }
    } else {
      // Pro multi-file batch
      const newBatchItems: BatchItem[] = files.map((file) => ({
        id: Math.random().toString(36).substring(2, 9),
        file,
        status: 'queued',
      }));
      setBatchItems(newBatchItems);
      setSelectedBatchId(newBatchItems[0].id);

      const firstFile = newBatchItems[0].file;
      try {
        const probeRes = await handleUploadVideo(firstFile);
        setBatchItems((prev) =>
          prev.map((it, idx) =>
            idx === 0
              ? {
                  ...it,
                  status: 'ready',
                  sessionId: probeRes.session_id,
                  metadata: probeRes.metadata,
                }
              : it
          )
        );
      } catch (err: any) {
        setBatchItems((prev) =>
          prev.map((it, idx) =>
            idx === 0 ? { ...it, status: 'error', error: err.message } : it
          )
        );
      }
    }
  };

  const handleSelectBatchItem = (id: string) => {
    setSelectedBatchId(id);
    const item = batchItems.find((it) => it.id === id);
    if (item) {
      setCurrentFile(item.file);
      if (item.sessionId) setCurrentSessionId(item.sessionId);
      if (item.metadata) {
        setMetadata(item.metadata);
        setCurrentStep(item.result ? 3 : 2);
      }
      if (item.result) setResult(item.result);
      if (item.error) setError(item.error);
      else setError(null);
    }
  };

  const handleStepClick = (step: 1 | 2 | 3) => {
    setCurrentStep(step);
    if (step === 1) scrollToSection(uploadSectionRef);
    if (step === 2) scrollToSection(configSectionRef);
    if (step === 3) scrollToSection(exportSectionRef);
  };

  const handleClearAll = () => {
    setCurrentFile(null);
    setCurrentSessionId(null);
    setMetadata(null);
    setResult(null);
    setBatchItems([]);
    setSelectedBatchId(null);
    setError(null);
    setTierNotice(null);
    setCurrentStep(1);
    scrollToSection(uploadSectionRef);
  };

  return (
    <div className="min-h-screen bg-black text-zinc-200 flex flex-col font-mono selection:bg-white selection:text-black">
      {/* Clean Technical Navbar */}
      <header className="border-b border-zinc-800 bg-black sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-widest text-white uppercase text-sm">
              STILLEX
            </span>
            <span className="text-zinc-600">/</span>
            <span className="text-xs text-zinc-300">
              Start & End Frame Extractor
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Tier & Quota Button */}
            <button
              onClick={openPricing}
              className={`px-2 py-1 text-[11px] border transition-colors cursor-pointer ${
                isPro
                  ? 'border-white bg-white text-black font-bold'
                  : 'border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-white hover:text-white'
              }`}
            >
              {isPro ? '[ PRO UNLIMITED ]' : `[ FREE: ${dailyUsage}/${maxFreeDaily} ]`}
            </button>

            <div className="hidden md:flex items-center px-2 py-1 border border-zinc-800 text-[10px]">
              <span className="text-zinc-500 mr-1.5">ENGINE:</span>
              <span className={isServerHealthy ? 'text-white font-bold' : 'text-zinc-600'}>
                {engineName}
              </span>
            </div>

            <LanguageSwitcher />

            {metadata && (
              <button
                onClick={handleClearAll}
                className="px-2.5 py-1 border border-zinc-700 hover:border-white text-zinc-300 hover:text-white transition-colors cursor-pointer text-xs uppercase"
              >
                [ {t('newVideo')} ]
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 sm:py-8 space-y-8">
        {/* Stepper Progress */}
        <StepProgress
          currentStep={currentStep}
          onStepClick={handleStepClick}
          hasVideo={metadata !== null}
          hasExtracted={result !== null}
        />

        {/* Global Loading Banner */}
        {isLoading && (
          <div className="p-3.5 border border-white bg-black text-xs flex items-center justify-between text-white font-bold">
            <span>[ RUNNING ] {loadingStep}</span>
            <span className="text-zinc-400 font-normal">Please wait...</span>
          </div>
        )}

        {/* Tier / Upgrade Notice Banner */}
        {tierNotice && (
          <div className="p-3.5 border border-zinc-700 bg-zinc-950 text-xs flex flex-wrap items-center justify-between gap-3 text-zinc-300">
            <div>
              <span className="text-white font-bold">[!] NOTE:</span> {tierNotice}
            </div>
            <button
              onClick={openPricing}
              className="px-3 py-1 bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase border border-white cursor-pointer transition-colors"
            >
              [ Upgrade to Creator Pro ]
            </button>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="p-3.5 border border-white bg-black text-white text-xs space-y-1">
            <div className="font-bold">[ {t('errorTitle')} ]</div>
            <div className="text-zinc-400">{error}</div>
          </div>
        )}

        {/* STEP 1: UPLOAD VIDEO */}
        <section ref={uploadSectionRef} id="step-upload" className="space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white uppercase">
                01. {t('step1Title')}
              </span>
            </div>
            <span className="text-zinc-500 text-[11px]">{t('step1Subtitle')}</span>
          </div>

          <DropZone onFilesSelected={handleFilesSelected} isLoading={isLoading} />

          <BatchList
            items={batchItems}
            selectedId={selectedBatchId}
            onSelect={handleSelectBatchItem}
            onClear={handleClearAll}
          />
        </section>

        {/* STEP 2: SPECS & SETTINGS */}
        {metadata && (
          <section ref={configSectionRef} id="step-config" className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white uppercase">
                  02. {t('step2Title')}
                </span>
              </div>
              <span className="text-zinc-500 text-[11px]">{t('step2Subtitle')}</span>
            </div>

            <MetadataHUD metadata={metadata} />

            <SettingsPanel
              settings={settings}
              onChange={setSettings}
              onApply={handleExtractFrames}
              metadata={metadata}
              isLoading={isLoading}
            />
          </section>
        )}

        {/* STEP 3: EXTRACTED FRAMES */}
        {result && (
          <section ref={exportSectionRef} id="step-export" className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white uppercase">
                  03. {t('step3Title')}
                </span>
              </div>
              <span className="text-zinc-500 text-[11px]">{t('step3Subtitle')}</span>
            </div>

            <FramePreview result={result} onZoomFrame={(f) => setZoomedFrame(f)} />
          </section>
        )}
      </main>

      {/* Frame Full-Res Zoom Modal */}
      {zoomedFrame && result && (
        <FrameZoomModal
          frame={zoomedFrame}
          onClose={() => setZoomedFrame(null)}
          resolution={result.metadata.resolution}
        />
      )}

      {/* Pricing & Subscription Modal */}
      <PricingModal />

      {/* Clean Technical Footer */}
      <footer className="border-t border-zinc-800 py-4 text-xs text-zinc-500 mt-auto bg-black font-mono">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <span>{t('footerPrivacy')}</span>
            <span className="text-zinc-700">|</span>
            <span>{t('footerTech')}</span>
          </div>

          <div className="flex items-center gap-2 justify-center">
            <button
              onClick={openPricing}
              className="text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-600 px-2 py-0.5 text-[11px] cursor-pointer"
            >
              [ Creator Pro ]
            </button>
            <a
              href="https://buymeacoffee.com"
              target="_blank"
              rel="noreferrer"
              className="text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-600 px-2 py-0.5 text-[11px]"
            >
              [ ☕ Buy Me a Coffee ]
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <TierProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </TierProvider>
  );
};
