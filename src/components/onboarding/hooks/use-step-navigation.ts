import { useCallback } from 'react';
import { OnboardingStep, useOnboarding } from '@/contexts/onboarding-context';
import { useSession } from 'next-auth/react';

// Define step sequences for different user states
const UNAUTHENTICATED_STEPS: OnboardingStep[] = ['upload', 'user-info', 'share', 'sign-up', 'complete'];
const AUTHENTICATED_STEPS: OnboardingStep[] = ['upload', 'share', 'complete'];

export function useStepNavigation() {
  const { currentStep, setCurrentStep } = useOnboarding();
  const { status } = useSession();

  // Get the appropriate step sequence based on auth status
  const steps = status === 'authenticated' ? AUTHENTICATED_STEPS : UNAUTHENTICATED_STEPS;
  const currentStepIndex = steps.indexOf(currentStep);

  const canGoBack = currentStepIndex > 0;
  const canGoForward = currentStepIndex < steps.length - 1;

  const goToNextStep = useCallback(() => {
    if (canGoForward) {
      setCurrentStep(steps[currentStepIndex + 1]);
    }
  }, [canGoForward, currentStepIndex, setCurrentStep, steps]);

  const goToPreviousStep = useCallback(() => {
    if (canGoBack) {
      setCurrentStep(steps[currentStepIndex - 1]);
    }
  }, [canGoBack, currentStepIndex, setCurrentStep, steps]);

  const goToStep = useCallback(
    (step: OnboardingStep) => {
      if (steps.includes(step)) {
        setCurrentStep(step);
      }
    },
    [setCurrentStep, steps]
  );

  return {
    currentStep,
    canGoBack,
    canGoForward,
    goToNextStep,
    goToPreviousStep,
    goToStep,
  };
}
