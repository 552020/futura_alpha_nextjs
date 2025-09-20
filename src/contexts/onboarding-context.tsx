'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Add these constants at the top of the file
const ONBOARDING_STATE_KEY = 'onboarding_state';
const ONBOARDING_STEP_KEY = 'onboarding_step';

export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed';

export interface TempFile {
  url: string;
  file: File;
  uploadedAt: Date;
  memoryId?: string;
  fileType?: string; // MIME type of the file
}

export type OnboardingStep = 'upload' | 'user-info' | 'share' | 'sign-up' | 'complete';

interface OnboardingContextType {
  files: TempFile[];
  addFile: (file: TempFile) => void;
  removeFile: (url: string) => void;
  clearFiles: () => void;
  currentStep: OnboardingStep;
  setCurrentStep: (step: OnboardingStep) => void;
  onboardingStatus: OnboardingStatus;
  setOnboardingStatus: (status: OnboardingStatus) => void;
  userData: {
    name: string;
    email: string;
    recipientName: string;
    recipientEmail: string;
    relationship: string;
    familyRelationship: string;
    allUserId?: string;
    isTemporary: boolean;
    memoryId?: string;
    uploadedFileCount?: number;
  };
  updateUserData: (data: Partial<OnboardingContextType['userData']>) => void;
  clearOnboardingState: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [files, setFiles] = useState<TempFile[]>([]);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('upload');
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus>('not_started');
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    recipientName: '',
    recipientEmail: '',
    relationship: '',
    familyRelationship: '',
    isTemporary: true,
    allUserId: undefined as string | undefined,
    memoryId: undefined as string | undefined,
    uploadedFileCount: undefined as number | undefined,
  });

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem(ONBOARDING_STATE_KEY);
    const savedStep = localStorage.getItem(ONBOARDING_STEP_KEY);

    if (savedState && savedStep) {
      try {
        const state = JSON.parse(savedState);
        if (state.userData) {
          setUserData(state.userData);
        }
        if (state.onboardingStatus) {
          setOnboardingStatus(state.onboardingStatus);
        }
        if (savedStep as OnboardingStep) {
          setCurrentStep(savedStep as OnboardingStep);
        }
      } catch (error) {
        console.error('Error loading onboarding state:', error);
      }
    }
  }, []);

  // Save state to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem(
        ONBOARDING_STATE_KEY,
        JSON.stringify({
          userData,
          onboardingStatus,
        })
      );
      localStorage.setItem(ONBOARDING_STEP_KEY, currentStep);
    } catch (error) {
      console.error('Error saving onboarding state:', error);
    }
  }, [currentStep, userData, onboardingStatus]);

  // Update user data - using functional update pattern
  const updateUserData = useCallback(
    (update: Partial<typeof userData> | ((prev: typeof userData) => Partial<typeof userData>)) => {
      setUserData(prev => ({
        ...prev,
        ...(typeof update === 'function' ? update(prev) : update),
      }));
    },
    []
  );

  // Add a file
  const addFile = useCallback((file: TempFile) => {
    setFiles(prev => {
      const newFiles = [...prev, file];
      return newFiles;
    });
  }, []);

  // Remove a file by URL
  const removeFile = useCallback((url: string) => {
    // Revoke the object URL to prevent memory leaks
    URL.revokeObjectURL(url);
    setFiles(prev => {
      const newFiles = prev.filter(f => f.url !== url);
      return newFiles;
    });
  }, []);

  // Clear all files
  const clearFiles = useCallback(() => {
    // Revoke all object URLs
    files.forEach(file => URL.revokeObjectURL(file.url));
    setFiles([]);
  }, [files]);

  // Clear onboarding state
  const clearOnboardingState = () => {
    localStorage.removeItem(ONBOARDING_STATE_KEY);
    localStorage.removeItem(ONBOARDING_STEP_KEY);
  };

  return (
    <OnboardingContext.Provider
      value={{
        files,
        addFile,
        removeFile,
        clearFiles,
        currentStep,
        setCurrentStep,
        onboardingStatus,
        setOnboardingStatus,
        userData,
        updateUserData,
        clearOnboardingState,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error('useOnboarding must be used within OnboardingProvider');
  return context;
};
