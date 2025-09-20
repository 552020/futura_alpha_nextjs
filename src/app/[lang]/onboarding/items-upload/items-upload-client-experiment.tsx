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

interface ItemsUploadClientProps {
  lang: string;
  dict: Dictionary;
}

export default function ItemsUploadClientExperiment({ lang, dict }: ItemsUploadClientProps) {
  const router = useRouter();
  const { setMode } = useInterface();
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [uploadMode, setUploadMode] = useState<'folder' | 'files'>('folder');

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
      {/* Title with embedded toggle buttons */}
      <div className="max-w-4xl">
        <h1 className="text-6xl sm:text-7xl lg:text-8xl font-bold mb-8 tracking-tight">
          Upload your{' '}
          <button
            onClick={() => setUploadMode('folder')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              uploadMode === 'folder'
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            album
          </button>{' '}
          or pick the{' '}
          <button
            onClick={() => setUploadMode('files')}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              uploadMode === 'files'
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            one shot
          </button>{' '}
          you love the most
        </h1>
      </div>

      {/* Plus button */}
      <div className="flex justify-center">
        <ItemUploadButton isOnboarding variant="large-icon" mode={uploadMode} onSuccess={handleUploadSuccess} />
      </div>

      {/* Onboarding Modal */}
      <OnboardModal isOpen={showOnboardModal} onClose={handleModalClose} onComplete={handleOnboardingComplete} />
    </div>
  );
}
