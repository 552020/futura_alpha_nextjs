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
    <div className="flex justify-between space-x-2 pt-6">
      {showBackButton && (
        <Button variant="outline" onClick={onBack} disabled={isBackDisabled}>
          {backLabel}
        </Button>
      )}
      <div className="flex-1" />
      {currentStep !== 'sign-up' && (
        <Button onClick={onNext} disabled={isNextDisabled}>
          {nextLabel}
        </Button>
      )}
    </div>
  );
}
