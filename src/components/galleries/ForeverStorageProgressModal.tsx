"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Loader2, Shield, Database, CheckSquare, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GalleryWithItems } from "@/types/gallery";

interface ForeverStorageProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  gallery: GalleryWithItems;
  onSuccess: (result: { success: boolean; galleryId: string; icpGalleryId: string; timestamp: string }) => void;
  onError: (error: Error) => void;
}

type StorageStep = "idle" | "auth" | "prepare" | "store" | "verify" | "success" | "error";

interface StepConfig {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: Record<StorageStep, StepConfig> = {
  idle: {
    title: "Ready to Store",
    description: "Preparing to store your gallery on the Internet Computer",
    icon: Shield,
  },
  auth: {
    title: "Authenticating",
    description: "Setting up your Internet Identity for secure storage",
    icon: Shield,
  },
  prepare: {
    title: "Preparing Data",
    description: "Converting your gallery for Internet Computer storage",
    icon: Database,
  },
  store: {
    title: "Storing Forever",
    description: "Securely storing your gallery on the blockchain",
    icon: Database,
  },
  verify: {
    title: "Verifying Storage",
    description: "Confirming your gallery is safely stored",
    icon: CheckSquare,
  },
  success: {
    title: "Success!",
    description: "Your gallery has been stored forever on the Internet Computer",
    icon: CheckCircle,
  },
  error: {
    title: "Storage Failed",
    description: "There was an error storing your gallery",
    icon: XCircle,
  },
};

export function ForeverStorageProgressModal({
  isOpen,
  onClose,
  gallery,
  onSuccess,
  onError,
}: ForeverStorageProgressModalProps) {
  const { data: session } = useSession();
  const params = useParams<{ lang: string }>();
  const [currentStep, setCurrentStep] = useState<StorageStep>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);

  const hasIIPrincipal = Boolean((session?.user as { icpPrincipal?: string })?.icpPrincipal);

  const handleStartStorage = useCallback(async () => {
    try {
      // Step 1: Check authentication
      setCurrentStep("auth");
      setProgress(10);
      setMessage("Checking your Internet Identity...");

      if (!hasIIPrincipal) {
        setMessage("You need to sign in with Internet Identity to store galleries forever");
        setDetails("This ensures you own your data and can access it securely");
        setError("Authentication required");
        return;
      }

      // Step 2: Prepare data
      setCurrentStep("prepare");
      setProgress(30);
      setMessage("Preparing gallery data for storage...");
      setDetails(`Processing ${gallery.items?.length || 0} memories`);

      // Simulate data preparation
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Step 3: Store on ICP
      setCurrentStep("store");
      setProgress(60);
      setMessage("Storing gallery on Internet Computer...");
      setDetails("This may take a few moments");

      // TODO: Replace with actual ICP storage call
      const result = await storeGalleryOnICP(gallery);

      // Step 4: Verify storage
      setCurrentStep("verify");
      setProgress(90);
      setMessage("Verifying storage...");
      setDetails("Confirming your gallery is safely stored");

      // Simulate verification
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Success
      setCurrentStep("success");
      setProgress(100);
      setMessage(`Gallery "${gallery.title}" stored forever! 🎉`);
      setDetails("Your gallery is now permanently stored on the Internet Computer");

      onSuccess(result);
    } catch (err) {
      setCurrentStep("error");
      setProgress(0);
      setMessage("Storage failed");
      setDetails(err instanceof Error ? err.message : "An unexpected error occurred");
      setError(err instanceof Error ? err.message : "Unknown error");
      onError(err instanceof Error ? err : new Error("Unknown error"));
    }
  }, [hasIIPrincipal, gallery, onSuccess, onError]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep("idle");
      setProgress(0);
      setMessage("");
      setDetails("");
      setError(null);
    }
  }, [isOpen]);

  // Auto-start the process when modal opens
  useEffect(() => {
    if (isOpen && currentStep === "idle") {
      handleStartStorage();
    }
  }, [isOpen, currentStep, handleStartStorage]);

  const handleRetry = () => {
    setCurrentStep("idle");
    setProgress(0);
    setMessage("");
    setDetails("");
    setError(null);
    handleStartStorage();
  };

  const handleSignInWithII = async () => {
    try {
      // Redirect to the II-only signin page
      const lang = params.lang || "en";
      const signinUrl = `/${lang}/sign-ii-only?callbackUrl=${encodeURIComponent(window.location.href)}`;
      console.log("Redirecting to II-only signin page:", signinUrl);
      window.location.href = signinUrl;
    } catch (error) {
      console.error("Failed to redirect to II signin page:", error);
      setError("Failed to redirect to sign in page");
    }
  };

  const handleClose = () => {
    if (currentStep === "success") {
      onClose();
    } else if (currentStep === "error") {
      onClose();
    } else {
      // Ask for confirmation if in progress
      if (confirm("Are you sure you want to cancel? Your gallery won't be stored.")) {
        onClose();
      }
    }
  };

  const getStepIcon = (step: StorageStep) => {
    const Icon = STEPS[step].icon;
    return (
      <Icon
        className={cn(
          "h-6 w-6",
          currentStep === step && "text-primary",
          currentStep === "error" && step === "error" && "text-destructive",
          currentStep === "success" && step === "success" && "text-green-600"
        )}
      />
    );
  };

  const getPrimaryButton = () => {
    switch (currentStep) {
      case "idle":
        return {
          text: "Start Storage",
          action: handleStartStorage,
          disabled: false,
        };
      case "auth":
        if (!hasIIPrincipal) {
          return {
            text: "Sign in with Internet Identity",
            action: handleSignInWithII,
            disabled: false,
          };
        }
        return {
          text: "Continue",
          action: () => {},
          disabled: true,
        };
      case "error":
        return {
          text: "Try Again",
          action: handleRetry,
          disabled: false,
        };
      case "success":
        return {
          text: "Close",
          action: onClose,
          disabled: false,
        };
      default:
        return {
          text: "Processing...",
          action: () => {},
          disabled: true,
        };
    }
  };

  const primaryButton = getPrimaryButton();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStepIcon(currentStep)}
            Store Gallery Forever
          </DialogTitle>
          <p className="text-sm text-muted-foreground">Gallery: {gallery.title}</p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Current Step */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {currentStep === "auth" && !hasIIPrincipal ? (
                <AlertCircle className="h-4 w-4 text-yellow-500" />
              ) : currentStep === "error" ? (
                <XCircle className="h-4 w-4 text-destructive" />
              ) : currentStep === "success" ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              )}
              <span className="font-medium">{STEPS[currentStep].title}</span>
            </div>
            <p className="text-sm text-muted-foreground">{STEPS[currentStep].description}</p>
          </div>

          {/* Status Message */}
          {message && (
            <Alert>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {/* Details */}
          {details && <p className="text-xs text-muted-foreground">{details}</p>}

          {/* Error Details */}
          {error && currentStep === "error" && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* II Status */}
          {currentStep === "auth" && (
            <div className="flex items-center gap-2">
              <Badge variant={hasIIPrincipal ? "default" : "secondary"}>
                {hasIIPrincipal ? "Internet Identity Connected" : "Internet Identity Required"}
              </Badge>
            </div>
          )}

          {/* Success Details */}
          {currentStep === "success" && (
            <div className="rounded-lg bg-green-50 p-3">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Gallery stored successfully!</span>
              </div>
              <p className="mt-1 text-xs text-green-600">
                Your gallery is now permanently stored on the Internet Computer blockchain.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={primaryButton.action} disabled={primaryButton.disabled} className="flex-1">
            {primaryButton.disabled && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {primaryButton.text}
          </Button>

          {currentStep !== "success" && currentStep !== "error" && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// TODO: Replace with actual ICP storage implementation
async function storeGalleryOnICP(
  gallery: GalleryWithItems
): Promise<{ success: boolean; galleryId: string; icpGalleryId: string; timestamp: string }> {
  // Simulate ICP storage
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Simulate success
  return {
    success: true,
    galleryId: gallery.id,
    icpGalleryId: `icp_${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
}
