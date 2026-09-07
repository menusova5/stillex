import React, { useEffect, useRef, useState } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';
import { SUPPORTED_LANGUAGES } from '../i18n/translations';

export const LanguageSwitcher: React.FC = () => {
  const { language, setLanguage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentOption = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1 border border-zinc-700 bg-black hover:bg-white hover:text-black text-xs font-mono text-zinc-300 transition-colors cursor-pointer"
        title="Change Language"
      >
        <span>[{currentOption.code.toUpperCase()}]</span>
        <span className="hidden sm:inline text-[11px] text-zinc-400">// {currentOption.nativeLabel}</span>
        <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 border border-zinc-600 bg-black shadow-2xl py-1 z-50">
          <div className="px-3 py-1 text-[10px] font-mono text-zinc-500 uppercase tracking-widest border-b border-zinc-800 flex items-center justify-between">
            <span>LOCALE // SELECT</span>
            <span>7_LANG</span>
          </div>

          <div className="max-h-64 overflow-y-auto py-0.5 font-mono text-xs">
            {SUPPORTED_LANGUAGES.map((option) => {
              const isSelected = option.code === language;
              return (
                <button
                  key={option.code}
                  onClick={() => {
                    setLanguage(option.code);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-1.5 flex items-center justify-between transition-colors text-left cursor-pointer ${
                    isSelected
                      ? 'bg-white text-black font-bold'
                      : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-zinc-500">[{option.code.toUpperCase()}]</span>
                    <span>{option.nativeLabel}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
