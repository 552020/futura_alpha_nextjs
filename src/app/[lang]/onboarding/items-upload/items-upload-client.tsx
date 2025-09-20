'use client';

import { useState } from 'react';
import { useInterface } from '@/contexts/interface-context';
import { useRouter } from 'next/navigation';
import { OnboardModal } from '@/components/onboarding/onboard-modal';
// import { ItemUploadButton } from "@/components/memory/item-upload-button";
import { ItemUploadButton } from '@/components/memory/item-upload-button';
import { Dictionary } from '@/utils/dictionaries';

// Hardcoded constants for this component
const COMPONENT_PATH = 'items-upload';
const VARIATION = 'wedding-memory';
const DOUBLE_BUTTON = true; // Set to false for original design, true for toggle buttons
const WITH_SUBTITLE = false; // Set to false for wedding vertical

interface ItemsUploadClientProps {
  lang: string;
  dict: Dictionary;
}

export default function ItemsUploadClient({ lang, dict }: ItemsUploadClientProps) {
  const router = useRouter();
  const { setMode } = useInterface();
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [uploadMode, setUploadMode] = useState<'folder' | 'files'>('folder'); // eslint-disable-line @typescript-eslint/no-unused-vars

  const handleUploadSuccess = () => {
    setShowOnboardModal(true);
  };

  const handleModalClose = () => {
    setShowOnboardModal(false);
  };

  const handleOnboardingComplete = () => {
    setShowOnboardModal(false);
    setMode('app');
    router.push(`/${lang}/onboarding/profile`);
  };

  const copy = dict[COMPONENT_PATH]?.variations?.[VARIATION];

  if (!copy) {
    throw new Error(`Missing dictionary entries for ${COMPONENT_PATH} variation ${VARIATION}`);
  }

  return (
    <div className="w-full max-w-[95%] sm:max-w-[90%] lg:max-w-[85%] mx-auto px-4 py-8 flex flex-col gap-16">
      {/* Title and subtitle container */}
      <div className="max-w-4xl">
        <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold mb-8 tracking-tight">{copy.title}</h1>
        {WITH_SUBTITLE && <p className="text-xl sm:text-2xl text-muted-foreground">{copy.subtitle}</p>}
      </div>

      {/* Component buttons - only shown when DOUBLE_BUTTON is true */}
      {DOUBLE_BUTTON && (
        <div className="flex justify-center gap-4 mb-8">
          <ItemUploadButton isOnboarding variant="album-button" mode="folder" onSuccess={handleUploadSuccess} />
          <ItemUploadButton isOnboarding variant="one-shot-button" mode="files" onSuccess={handleUploadSuccess} />
        </div>
      )}

      {/* Upload button container - only shown when DOUBLE_BUTTON is false */}
      {!DOUBLE_BUTTON && (
        <div className="flex justify-center">
          <ItemUploadButton isOnboarding variant="large-icon" mode="folder" onSuccess={handleUploadSuccess} />
        </div>
      )}

      {/* Onboarding Modal */}
      <OnboardModal isOpen={showOnboardModal} onClose={handleModalClose} onComplete={handleOnboardingComplete} />
    </div>
  );
}
