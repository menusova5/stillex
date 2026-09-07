import React, { createContext, useContext, useEffect, useState } from 'react';

interface TierContextType {
  isPro: boolean;
  dailyUsage: number;
  maxFreeDaily: number;
  remainingFree: number;
  canProcess: boolean;
  isPricingOpen: boolean;
  openPricing: () => void;
  closePricing: () => void;
  incrementUsage: () => void;
  activatePro: (licenseKey: string) => boolean;
  deactivatePro: () => void;
}

const TierContext = createContext<TierContextType | undefined>(undefined);

const getTodayKey = (): string => {
  const d = new Date();
  return `stillex_usage_${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const TierProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const maxFreeDaily = 10;

  const [isPro, setIsPro] = useState<boolean>(() => {
    return (
      localStorage.getItem('stillex_is_pro') === 'true' ||
      localStorage.getItem('frameforge_is_pro') === 'true'
    );
  });

  const [dailyUsage, setDailyUsage] = useState<number>(() => {
    const key = getTodayKey();
    const val = localStorage.getItem(key) || localStorage.getItem(key.replace('stillex', 'frameforge'));
    return val ? parseInt(val, 10) || 0 : 0;
  });

  const [isPricingOpen, setIsPricingOpen] = useState(false);

  // Sync usage to localStorage
  useEffect(() => {
    const key = getTodayKey();
    localStorage.setItem(key, dailyUsage.toString());
  }, [dailyUsage]);

  const remainingFree = Math.max(0, maxFreeDaily - dailyUsage);
  const canProcess = isPro || remainingFree > 0;

  const incrementUsage = () => {
    if (!isPro) {
      setDailyUsage((prev) => prev + 1);
    }
  };

  const activatePro = (licenseKey: string): boolean => {
    const cleaned = licenseKey.trim().toUpperCase();
    if (cleaned === 'CREATOR-PRO' || cleaned === 'PRO-2026' || cleaned.startsWith('PRO-')) {
      setIsPro(true);
      localStorage.setItem('stillex_is_pro', 'true');
      return true;
    }
    return false;
  };

  const deactivatePro = () => {
    setIsPro(false);
    localStorage.removeItem('stillex_is_pro');
    localStorage.removeItem('frameforge_is_pro');
  };

  return (
    <TierContext.Provider
      value={{
        isPro,
        dailyUsage,
        maxFreeDaily,
        remainingFree,
        canProcess,
        isPricingOpen,
        openPricing: () => setIsPricingOpen(true),
        closePricing: () => setIsPricingOpen(false),
        incrementUsage,
        activatePro,
        deactivatePro,
      }}
    >
      {children}
    </TierContext.Provider>
  );
};

export const useTier = () => {
  const context = useContext(TierContext);
  if (!context) {
    throw new Error('useTier must be used within a TierProvider');
  }
  return context;
};
