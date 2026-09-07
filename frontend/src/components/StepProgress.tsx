import React from 'react';
import { useTranslation } from '../context/LanguageContext';

interface StepProgressProps {
  currentStep: 1 | 2 | 3;
  onStepClick: (step: 1 | 2 | 3) => void;
  hasVideo: boolean;
  hasExtracted: boolean;
}

export const StepProgress: React.FC<StepProgressProps> = ({
  currentStep,
  onStepClick,
  hasVideo,
  hasExtracted,
}) => {
  const { t } = useTranslation();

  const steps = [
    {
      num: 1 as const,
      title: t('step1Title'),
      subtitle: t('step1Subtitle'),
      isCompleted: hasVideo,
      isActive: currentStep === 1,
    },
    {
      num: 2 as const,
      title: t('step2Title'),
      subtitle: t('step2Subtitle'),
      isCompleted: hasExtracted,
      isActive: currentStep === 2,
    },
    {
      num: 3 as const,
      title: t('step3Title'),
      subtitle: t('step3Subtitle'),
      isCompleted: false,
      isActive: currentStep === 3,
    },
  ];

  return (
    <div className="w-full border border-zinc-800 bg-black p-2 font-mono">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {steps.map((s) => {
          const canClick = s.num === 1 || (s.num === 2 && hasVideo) || (s.num === 3 && hasExtracted);

          return (
            <button
              key={s.num}
              onClick={() => canClick && onStepClick(s.num)}
              disabled={!canClick}
              className={`p-3 text-left border transition-all flex items-center justify-between cursor-pointer ${
                s.isActive
                  ? 'border-white bg-white text-black font-bold shadow-md'
                  : s.isCompleted
                  ? 'border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500'
                  : 'border-zinc-900 bg-black text-zinc-600 opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] px-1 border ${s.isActive ? 'border-black text-black' : 'border-zinc-700 text-zinc-400'}`}>
                    0{s.num}
                  </span>
                  <span className="text-xs tracking-wide uppercase truncate">
                    {s.title}
                  </span>
                </div>
                <div className={`text-[11px] mt-0.5 truncate ${s.isActive ? 'text-black/80' : 'text-zinc-500'}`}>
                  {s.subtitle}
                </div>
              </div>

              <div className="shrink-0 text-xs">
                {s.isCompleted && (
                  <span className="px-1.5 py-0.5 border border-zinc-600 text-zinc-300 text-[10px]">
                    ✓ DONE
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
