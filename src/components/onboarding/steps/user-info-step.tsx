import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOnboarding } from "@/contexts/onboarding-context";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { StepContainer } from "../common/step-container";
import { StepNavigation } from "../common/step-navigation";

interface UserInfoStepProps {
  withImage?: boolean;
  collectEmail?: boolean;
  onNext: () => void;
  onBack: () => void;
  isReadOnly?: boolean;
}

export function UserInfoStep({
  withImage = false,
  collectEmail = true,
  onNext,
  onBack,
  isReadOnly = false,
}: UserInfoStepProps) {
  const {
    userData,
    updateUserData,
    files: [lastUploadedFile],
    currentStep,
  } = useOnboarding();

  // Local state for input values
  const [localName, setLocalName] = useState(userData.name);
  const [localEmail, setLocalEmail] = useState(userData.email);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Sync local state with context when userData changes
  useEffect(() => {
    if (currentStep === "user-info") {
      setLocalName(userData.name);
      setLocalEmail(userData.email);
    }
  }, [currentStep, userData.name, userData.email]);

  // Focus for name field
  useEffect(() => {
    if (currentStep === "user-info" && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [currentStep, localName]);

  // Focus for email field
  useEffect(() => {
    if (currentStep === "user-info" && emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, [currentStep, localEmail]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    const isValid = emailRegex.test(email);
    // console.log("Email validation:", { email, isValid });
    return isValid;
  };

  const handleEventBasedNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalName(newValue);
    updateUserData({ name: newValue });
  };

  const handleEventBasedEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // console.log("Email changed:", newValue);
    setLocalEmail(newValue);
    updateUserData({ email: newValue });
  };

  const handleNext = () => {
    if (collectEmail && !validateEmail(localEmail)) {
      return;
    }
    onNext();
  };

  // Add debug log for button state
  const isNextDisabled = collectEmail && !validateEmail(localEmail);
  // console.log("Button state:", {
  //   collectEmail,
  //   localEmail,
  //   isValid: validateEmail(localEmail),
  //   isNextDisabled,
  // });

  return (
    // <StepContainer title="Tell us about yourself" description="Help us personalize your experience">
    <StepContainer>
      {withImage && lastUploadedFile && (
        <div className="relative w-full aspect-square max-w-xs mx-auto overflow-hidden rounded-md">
          <Image
            src={lastUploadedFile.url}
            alt="Uploaded memory"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 400px"
            priority
          />
        </div>
      )}

      <div className="space-y-4 py-4">
        {!withImage && (
          <div className="pt-4">
            <p className="text-5xl font-bold">How should we call you?</p>
            {userData.uploadedFileCount && userData.uploadedFileCount > 1 && (
              <p className="text-sm text-muted-foreground mt-2">
                Great! You&apos;ve uploaded {userData.uploadedFileCount} files.
              </p>
            )}
            <p className="text-sm text-muted-foreground italic mt-3">
              We need at least your name to let you retrieve your memory for the case you don&apos;t want to sign in.
            </p>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            ref={nameInputRef}
            id="name"
            name="name"
            value={localName}
            onChange={handleEventBasedNameChange}
            placeholder="Enter your name"
            readOnly={isReadOnly}
          />
        </div>

        {collectEmail && (
          <div className="space-y-2">
            <Label htmlFor="email">Your Email</Label>
            <Input
              ref={emailInputRef}
              id="email"
              name="email"
              type="email"
              value={localEmail}
              onChange={handleEventBasedEmailChange}
              placeholder="Enter your email"
              readOnly={isReadOnly}
            />
            {!validateEmail(localEmail) && <p className="text-sm text-red-500">Please enter a valid email address</p>}
          </div>
        )}
      </div>
      <StepNavigation currentStep={currentStep} onNext={handleNext} onBack={onBack} isNextDisabled={isNextDisabled} />
    </StepContainer>
  );
}
