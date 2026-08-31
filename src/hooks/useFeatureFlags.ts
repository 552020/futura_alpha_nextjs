'use client';

import { useState, useEffect } from 'react';
import { fatLogger } from '@/lib/logger';

const FEATURE_FLAGS_KEY = 'futura_feature_flags';

interface FeatureFlags {
  showRatingAndHideFeatures: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  showRatingAndHideFeatures: false,
};

export function useFeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    // Load flags from localStorage on mount
    try {
      const stored = localStorage.getItem(FEATURE_FLAGS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setFlags({ ...DEFAULT_FLAGS, ...parsed });
      }
    } catch (error) {
      fatLogger.error('Failed to load feature flags from localStorage', 'fe', {
        error,
      });
    }
  }, []);

  const updateFlag = (key: keyof FeatureFlags, value: boolean) => {
    const newFlags = { ...flags, [key]: value };
    setFlags(newFlags);

    if (isClient) {
      try {
        localStorage.setItem(FEATURE_FLAGS_KEY, JSON.stringify(newFlags));
      } catch (error) {
        fatLogger.error('Failed to save feature flags to localStorage', 'fe', {
          error,
        });
      }
    }
  };

  return {
    flags,
    updateFlag,
    isClient,
  };
}
