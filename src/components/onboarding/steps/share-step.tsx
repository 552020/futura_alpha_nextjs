import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOnboarding } from "@/contexts/onboarding-context";
import { useEffect, useRef, useState } from "react";
import { StepContainer } from "../common/step-container";
import { StepNavigation } from "../common/step-navigation";

interface ShareStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function ShareStep({ onNext, onBack }: ShareStepProps) {
  const { userData, updateUserData, currentStep } = useOnboarding();

  const [localRecipientName, setLocalRecipientName] = useState(userData.recipientName);
  const [localRecipientEmail, setLocalRecipientEmail] = useState(userData.recipientEmail);
  const [lastFocusedField, setLastFocusedField] = useState<string | null>(null);

  const recipientNameRef = useRef<HTMLInputElement>(null);
  const recipientEmailRef = useRef<HTMLInputElement>(null);

  // Add this useEffect to maintain focus for recipient fields
  useEffect(() => {
    if (currentStep === "share" && lastFocusedField) {
      if (lastFocusedField === "recipientName" && recipientNameRef.current) {
        recipientNameRef.current.focus();
      } else if (lastFocusedField === "recipientEmail" && recipientEmailRef.current) {
        recipientEmailRef.current.focus();
      }
    }
  }, [currentStep, localRecipientName, localRecipientEmail, lastFocusedField]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    const isValid = emailRegex.test(email);
    // console.log("Recipient email validation:", { email, isValid });
    return isValid;
  };

  const handleRecipientNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalRecipientName(newValue);
    updateUserData({ recipientName: newValue });
  };

  const handleRecipientEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // console.log("Recipient email changed:", newValue);
    setLocalRecipientEmail(newValue);
    updateUserData({ recipientEmail: newValue });
  };

  const handleNext = () => {
    if (!validateEmail(localRecipientEmail)) {
      return;
    }
    onNext();
  };

  // Add debug log for button state
  const isNextDisabled = !validateEmail(localRecipientEmail);
  // console.log("Share step button state:", {
  //   localRecipientEmail,
  //   isValid: validateEmail(localRecipientEmail),
  //   isNextDisabled,
  // });

  return (
    <StepContainer>
      <div className="pt-4">
        <p className="text-4xl font-bold mb-8">Let&apos;s share your memory with someone special!</p>
        <p className="text-xl text-muted-foreground mb-8 italic">
          Tell us about the person you want to share this memory with.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="recipientName">Their Name</Label>
          <Input
            ref={recipientNameRef}
            id="recipientName"
            name="recipientName"
            value={localRecipientName}
            onChange={handleRecipientNameChange}
            onFocus={() => setLastFocusedField("recipientName")}
            placeholder="Enter their name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="recipientEmail">Their Email</Label>
          <Input
            ref={recipientEmailRef}
            id="recipientEmail"
            name="recipientEmail"
            type="email"
            value={localRecipientEmail}
            onChange={handleRecipientEmailChange}
            onFocus={() => setLastFocusedField("recipientEmail")}
            placeholder="Enter their email"
          />
          {!validateEmail(localRecipientEmail) && (
            <p className="text-sm text-red-500">Please enter a valid email address</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="relationship">Your Relationship</Label>
          <Select
            value={userData.relationship}
            onValueChange={(value) => {
              // If changing away from family, clear the family relationship
              if (value !== "family" && userData.familyRelationship) {
                updateUserData({
                  relationship: value,
                  familyRelationship: undefined,
                });
              } else {
                updateUserData({ relationship: value });
              }
            }}
          >
            <SelectTrigger id="relationship">
              <SelectValue placeholder="How do you know this person?" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="family">Family</SelectItem>
              <SelectItem value="friend">Friend</SelectItem>
              <SelectItem value="partner">Partner</SelectItem>
              <SelectItem value="colleague">Colleague</SelectItem>
              <SelectItem value="acquaintance">Acquaintance</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Conditional family relationship selector */}
        {userData.relationship === "family" && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top duration-300">
            <Label htmlFor="familyRelationship">Family Relationship</Label>
            <Select
              value={userData.familyRelationship}
              onValueChange={(value) => updateUserData({ familyRelationship: value })}
            >
              <SelectTrigger id="familyRelationship">
                <SelectValue placeholder="What is your family relationship?" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="parent">Parent</SelectItem>
                <SelectItem value="child">Child</SelectItem>
                <SelectItem value="sibling">Sibling</SelectItem>
                <SelectItem value="grandparent">Grandparent</SelectItem>
                <SelectItem value="grandchild">Grandchild</SelectItem>
                <SelectItem value="aunt-uncle">Aunt/Uncle</SelectItem>
                <SelectItem value="niece-nephew">Niece/Nephew</SelectItem>
                <SelectItem value="cousin">Cousin</SelectItem>
                <SelectItem value="other-family">Other Family Member</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <StepNavigation currentStep={currentStep} onNext={handleNext} onBack={onBack} isNextDisabled={isNextDisabled} />
    </StepContainer>
  );
}
