import React, { useState } from 'react';
import { useTier } from '../context/TierContext';
import { useTranslation } from '../context/LanguageContext';

export const PricingModal: React.FC = () => {
  const { isPro, isPricingOpen, closePricing, activatePro, deactivatePro, dailyUsage, maxFreeDaily } = useTier();
  const { t } = useTranslation();

  const [inputKey, setInputKey] = useState('');
  const [keyError, setKeyError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isPricingOpen) return null;

  const handleActivate = (e: React.FormEvent) => {
    e.preventDefault();
    setKeyError(null);
    setSuccessMessage(null);

    if (!inputKey.trim()) {
      setKeyError('Please enter a license key.');
      return;
    }

    const ok = activatePro(inputKey);
    if (ok) {
      setSuccessMessage('Creator Pro successfully activated! Enjoy unlimited features.');
      setInputKey('');
    } else {
      setKeyError('Invalid license key. Try demo key: CREATOR-PRO');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 font-mono animate-in fade-in duration-150"
      onClick={closePricing}
    >
      <div
        className="w-full max-w-2xl border border-zinc-700 bg-black p-5 sm:p-7 relative text-zinc-200 space-y-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Corner registration marks */}
        <span className="absolute top-1.5 left-2 text-[10px] text-zinc-600 select-none">+</span>
        <span className="absolute top-1.5 right-2 text-[10px] text-zinc-600 select-none">+</span>
        <span className="absolute bottom-1.5 left-2 text-[10px] text-zinc-600 select-none">+</span>
        <span className="absolute bottom-1.5 right-2 text-[10px] text-zinc-600 select-none">+</span>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div>
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest block">
              // SUBSCRIPTION & ACCESS TIERS
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">
              STILLEX CREATOR PRO
            </h2>
          </div>

          <button
            onClick={closePricing}
            className="px-2 py-1 border border-zinc-700 hover:border-white text-zinc-400 hover:text-white text-xs cursor-pointer"
          >
            [ ESC / × ]
          </button>
        </div>

        {/* Comparison Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Free Tier */}
          <div className="border border-zinc-800 bg-zinc-950 p-4 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
                <span className="font-bold text-white uppercase">FREE TIER</span>
                <span className="text-[11px] text-zinc-400">$0 / forever</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Ideal for individual creators and single shot conditioning.
              </p>
              <ul className="space-y-1.5 text-[11px] text-zinc-300 pt-2 border-t border-zinc-900">
                <li>• 1 video extraction at a time</li>
                <li>• Max 10 videos per day ({dailyUsage}/{maxFreeDaily} used today)</li>
                <li>• 100% Lossless PNG / WebP quality</li>
                <li>• Zero watermarks, full resolution</li>
              </ul>
            </div>

            <div className="pt-2">
              <button
                disabled
                className="w-full py-2 border border-zinc-800 bg-zinc-900 text-zinc-500 text-[11px] font-bold uppercase tracking-wider select-none"
              >
                {!isPro ? '[ CURRENT PLAN ]' : '[ FREE ACTIVE ]'}
              </button>
            </div>
          </div>

          {/* Creator Pro Tier */}
          <div className="border border-white bg-black p-4 flex flex-col justify-between space-y-4 shadow-xl relative">
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
                <span className="font-bold text-white uppercase">CREATOR PRO</span>
                <span className="text-[11px] font-bold text-white">$9 / mo or $29 Lifetime</span>
              </div>
              <p className="text-[11px] text-zinc-300">
                Built for AI video power-users, animators & VFX studios.
              </p>
              <ul className="space-y-1.5 text-[11px] text-zinc-200 pt-2 border-t border-zinc-800">
                <li>✓ <strong>Unlimited Multi-Video Batch</strong> queue processing</li>
                <li>✓ <strong>Unlimited Daily Extractions</strong> (No 10/day limit)</li>
                <li>✓ <strong>Custom Frame Extraction</strong> (Exact frame # or second)</li>
                <li>✓ <strong>Custom Filename Prefix</strong> for editing pipelines</li>
                <li>✓ <strong>AI Smart-Padding</strong> (Multiples of 64px for ComfyUI)</li>
                <li>✓ <strong>metadata.json Manifest</strong> included in ZIP</li>
                <li>✓ Standalone offline desktop & ComfyUI node access</li>
              </ul>
            </div>

            <div className="pt-2">
              {isPro ? (
                <button
                  onClick={deactivatePro}
                  className="w-full py-2 border border-zinc-600 bg-zinc-950 text-zinc-300 hover:text-white hover:border-white text-[11px] font-bold uppercase tracking-wider cursor-pointer"
                >
                  [ ✓ PRO ACTIVE - REVERT TO FREE ]
                </button>
              ) : (
                <button
                  onClick={() => {
                    activatePro('CREATOR-PRO');
                    setSuccessMessage('Creator Pro activated via instant trial!');
                  }}
                  className="w-full py-2 border border-white bg-white hover:bg-zinc-200 text-black text-[11px] font-bold uppercase tracking-wider cursor-pointer transition-colors shadow-sm"
                >
                  [ ▷ UPGRADE TO CREATOR PRO ]
                </button>
              )}
            </div>
          </div>
        </div>

        {/* License Key Activation Box */}
        <div className="p-4 border border-zinc-800 bg-zinc-950 space-y-2.5">
          <div className="text-xs font-bold text-white uppercase tracking-wider">
            // ACTIVATE LICENSE KEY
          </div>
          <form onSubmit={handleActivate} className="flex gap-2">
            <input
              type="text"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="ENTER KEY (e.g. CREATOR-PRO)"
              className="flex-1 bg-black border border-zinc-700 px-3 py-2 text-xs text-white uppercase focus:outline-none focus:border-white font-mono placeholder:text-zinc-600"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-white hover:bg-zinc-200 text-black font-bold text-xs uppercase border border-white transition-colors cursor-pointer shrink-0"
            >
              [ ACTIVATE ]
            </button>
          </form>

          {keyError && (
            <div className="text-[11px] text-zinc-400 font-mono">
              [!] {keyError}
            </div>
          )}

          {successMessage && (
            <div className="text-[11px] text-white font-bold font-mono">
              [✓] {successMessage}
            </div>
          )}

          <div className="text-[10px] text-zinc-500">
            Purchased via Gumroad or LemonSqueezy? Enter your license key above to unlock all pro features immediately. Demo key: <code className="text-zinc-300">CREATOR-PRO</code>.
          </div>
        </div>

        {/* Tip Jar / Coffee Support */}
        <div className="pt-2 border-t border-zinc-900 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500">
          <span>// CREATOR SUSTAINABILITY INITIATIVE</span>
          <a
            href="https://buymeacoffee.com"
            target="_blank"
            rel="noreferrer"
            className="text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-500 px-2 py-1 transition-colors"
          >
            [ ☕ Buy Me a Coffee / Support Tool ]
          </a>
        </div>
      </div>
    </div>
  );
};
