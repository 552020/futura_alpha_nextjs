import { Button } from '@/components/ui/button';
import { OnboardingStep } from '@/contexts/onboarding-context';

interface StepNavigationProps {
  currentStep: OnboardingStep;
  onNext?: () => void;
  onBack?: () => void;
  isNextDisabled?: boolean;
  isBackDisabled?: boolean;
  nextLabel?: string;
  backLabel?: string;
  showBackButton?: boolean;
}

export function StepNavigation({
  currentStep,
  onNext,
  onBack,
  isNextDisabled = false,
  isBackDisabled = false,
  nextLabel = 'Next',
  backLabel = 'Back',
  showBackButton = true,
}: StepNavigationProps) {
  return (
    <div className="flex justify-between space-x-2 pt-2 sm:pt-6 sticky bottom-0 bg-background border-t border-border/50 -mx-6 px-6 py-2 sm:border-t-0 sm:bg-transparent sm:sticky-0 sm:-mx-0 sm:px-0 sm:py-0">
      {showBackButton && (
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isBackDisabled}
          className="flex-shrink-0 text-sm sm:text-base px-3 sm:px-4 py-1.5 sm:py-2"
        >
          {backLabel}
        </Button>
      )}
      <div className="flex-1" />
      {currentStep !== 'sign-up' && (
        <Button
          onClick={onNext}
          disabled={isNextDisabled}
          className="flex-shrink-0 text-sm sm:text-base px-3 sm:px-4 py-1.5 sm:py-2"
        >
          {nextLabel}
        </Button>
      )}
    </div>
  );
}
