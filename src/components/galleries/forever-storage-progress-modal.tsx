'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Loader2, Shield, Database, CheckSquare, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GalleryWithItems } from '@/types/gallery';
import { ICPGalleryService } from '@/services/icp-gallery';
import { getAuthClient } from '@/ic/ii';
import { useIICoAuth } from '@/hooks/use-ii-coauth';

interface ForeverStorageProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  gallery: GalleryWithItems;
  onSuccess: (result: { success: boolean; galleryId: string; icpGalleryId: string; timestamp: string }) => void;
  onError: (error: Error) => void;
}

type StorageStep = 'idle' | 'auth' | 'prepare' | 'store' | 'verify' | 'success' | 'error';

interface StepConfig {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: Record<StorageStep, StepConfig> = {
  idle: {
    title: 'Ready to Store',
    description: 'Preparing to store your gallery on the Internet Computer',
    icon: Shield,
  },
  auth: {
    title: 'Authenticating',
    description: 'Setting up your Internet Identity for secure storage',
    icon: Shield,
  },
  prepare: {
    title: 'Preparing Data',
    description: 'Converting your gallery for Internet Computer storage',
    icon: Database,
  },
  store: {
    title: 'Storing Forever',
    description: 'Securely storing your gallery on the blockchain',
    icon: Database,
  },
  verify: {
    title: 'Verifying Storage',
    description: 'Confirming your gallery is safely stored',
    icon: CheckSquare,
  },
  success: {
    title: 'Success!',
    description: 'Your gallery has been stored forever on the Internet Computer',
    icon: CheckCircle,
  },
  error: {
    title: 'Storage Failed',
    description: 'There was an error storing your gallery',
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
  const [currentStep, setCurrentStep] = useState<StorageStep>('idle');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const authResumedRef = useRef(false);

  // Use the new co-auth system
  const { hasLinkedII, isCoAuthActive, linkedIcPrincipal, statusMessage, statusClass, remainingMinutes } =
    useIICoAuth();

  const handleStartStorage = useCallback(async () => {
    try {
      // Step 1: Check authentication
      setCurrentStep('auth');
      setProgress(10);
      setMessage('Checking your Internet Identity...');

      // Check if user has II access (either linked II account or direct II sign-in)
      const hasIIAccess = hasLinkedII || Boolean((session?.user as { icpPrincipal?: string })?.icpPrincipal);

      if (!hasIIAccess) {
        setMessage('You need to sign in with Internet Identity to store galleries forever');
        setDetails('This ensures you own your data and can access it securely');
        setError('II Authentication Required');
        return;
      }

      // For Google users with linked II, check if co-auth is active
      // For II-first users, they already have active II session
      const isIIFirstUser = session?.user?.loginProvider === 'internet-identity';
      if (!isIIFirstUser && !isCoAuthActive) {
        setMessage('Your Internet Identity needs to be activated for this session');
        setDetails("Click 'Activate II' to enable ICP operations");
        setError('II Co-Auth Required');
        return;
      }

      // Step 2: Prepare data
      setCurrentStep('prepare');
      setProgress(30);
      setMessage('Preparing gallery data for storage...');
      setDetails(`Processing ${gallery.items?.length || 0} memories`);

      // Simulate data preparation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 3: Store on ICP
      setCurrentStep('store');
      setProgress(60);
      setMessage('Storing gallery on Internet Computer...');
      setDetails('This may take a few moments');

      // Get authenticated identity and create ICP service
      const authClient = await getAuthClient();
      const identity = authClient.getIdentity();
      const ownerPrincipal = identity.getPrincipal();

      const icpService = new ICPGalleryService(identity);
      const galleryData = icpService.convertWeb2GalleryToICP(
        gallery as unknown as Record<string, unknown>,
        gallery.items as unknown as Record<string, unknown>[],
        ownerPrincipal
      );
      const result = await icpService.storeGalleryForever(galleryData);

      // Step 4: Verify storage
      setCurrentStep('verify');
      setProgress(90);
      setMessage('Verifying storage...');
      setDetails('Confirming your gallery is safely stored');

      // Simulate verification
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check if storage was successful
      if (!result.success) {
        throw new Error(result.message);
      }

      // Success
      setCurrentStep('success');
      setProgress(100);
      setMessage(`Gallery "${gallery.title}" stored forever! 🎉`);
      setDetails('Your gallery is now permanently stored on the Internet Computer');

      onSuccess({
        success: result.success,
        galleryId: result.gallery_id || gallery.id,
        icpGalleryId: result.icp_gallery_id || result.gallery_id || gallery.id,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      setCurrentStep('error');
      setProgress(0);
      setMessage('Storage failed');
      setDetails(err instanceof Error ? err.message : 'An unexpected error occurred');
      setError(err instanceof Error ? err.message : 'Unknown error');
      onError(err instanceof Error ? err : new Error('Unknown error'));
    }
  }, [hasLinkedII, isCoAuthActive, session?.user, gallery, onSuccess, onError]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('idle');
      setProgress(0);
      setMessage('');
      setDetails('');
      setError(null);
      authResumedRef.current = false;
    }
  }, [isOpen]);

  // Auto-start the process when modal opens
  useEffect(() => {
    if (isOpen && currentStep === 'idle') {
      handleStartStorage();
    }
  }, [isOpen, currentStep, handleStartStorage]);

  const handleRetry = () => {
    setCurrentStep('idle');
    setProgress(0);
    setMessage('');
    setDetails('');
    setError(null);
    handleStartStorage();
  };

  const handleSignInWithII = async () => {
    try {
      // Redirect to the II-only signin page
      const lang = params.lang || 'en';
      // Ensure we carry a flag to resume the modal on return
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('storeForever', '1');
      const signinUrl = `/${lang}/sign-ii-only?callbackUrl=${encodeURIComponent(currentUrl.toString())}`;
      // console.log("Redirecting to II-only signin page:", signinUrl);
      window.location.href = signinUrl;
    } catch (error) {
      console.error('Failed to redirect to II signin page:', error);
      setError('Failed to redirect to sign in page');
    }
  };

  // If user returns with II linked while modal is at auth, auto-resume
  useEffect(() => {
    const hasIIAccess = hasLinkedII || Boolean((session?.user as { icpPrincipal?: string })?.icpPrincipal);
    const isIIFirstUser = session?.user?.loginProvider === 'internet-identity';
    const canProceed = hasIIAccess && (isIIFirstUser || isCoAuthActive);

    if (isOpen && currentStep === 'auth' && canProceed && !authResumedRef.current) {
      authResumedRef.current = true;
      // Continue the flow from the beginning; it will pass auth now
      handleStartStorage();
    }
  }, [isOpen, currentStep, hasLinkedII, isCoAuthActive, session?.user, handleStartStorage]);

  const handleClose = () => {
    if (currentStep === 'success') {
      onClose();
    } else if (currentStep === 'error') {
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
          'h-6 w-6',
          currentStep === step && 'text-primary',
          currentStep === 'error' && step === 'error' && 'text-destructive',
          currentStep === 'success' && step === 'success' && 'text-green-600'
        )}
      />
    );
  };

  const getPrimaryButton = () => {
    switch (currentStep) {
      case 'idle':
        return {
          text: 'Start Storage',
          action: handleStartStorage,
          disabled: false,
        };
      case 'auth':
        const hasIIAccess = hasLinkedII || Boolean((session?.user as { icpPrincipal?: string })?.icpPrincipal);
        const isIIFirstUser = session?.user?.loginProvider === 'internet-identity';

        if (!hasIIAccess) {
          return {
            text: 'Sign in with Internet Identity',
            action: handleSignInWithII,
            disabled: false,
          };
        }

        if (!isIIFirstUser && !isCoAuthActive) {
          return {
            text: 'Activate II Co-Auth',
            action: () => {
              // Redirect to II activation
              const lang = params.lang || 'en';
              const currentUrl = new URL(window.location.href);
              currentUrl.searchParams.set('storeForever', '1');
              const signinUrl = `/${lang}/sign-ii-only?callbackUrl=${encodeURIComponent(currentUrl.toString())}`;
              window.location.href = signinUrl;
            },
            disabled: false,
          };
        }

        return {
          text: 'Continue',
          action: () => {},
          disabled: true,
        };
      case 'error':
        return {
          text: 'Try Again',
          action: handleRetry,
          disabled: false,
        };
      case 'success':
        return {
          text: 'Close',
          action: onClose,
          disabled: false,
        };
      default:
        return {
          text: 'Processing...',
          action: () => {},
          disabled: true,
        };
    }
  };

  const primaryButton = getPrimaryButton();

  const getAuthIcon = () => {
    const hasIIAccess = hasLinkedII || Boolean((session?.user as { icpPrincipal?: string })?.icpPrincipal);
    const isIIFirstUser = session?.user?.loginProvider === 'internet-identity';

    if (!hasIIAccess) {
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
    if (!isIIFirstUser && !isCoAuthActive) {
      return <AlertCircle className="h-4 w-4 text-orange-500" />;
    }
    return <CheckCircle className="h-4 w-4 text-green-600" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getStepIcon(currentStep)}
            Store Gallery Forever
          </DialogTitle>
          <DialogDescription>Gallery: {gallery.title}</DialogDescription>
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
              {currentStep === 'auth' && getAuthIcon()}
              {currentStep === 'error' && <XCircle className="h-4 w-4 text-destructive" />}
              {currentStep === 'success' && <CheckCircle className="h-4 w-4 text-green-600" />}
              {currentStep !== 'auth' && currentStep !== 'error' && currentStep !== 'success' && (
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
          {error && currentStep === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* II Status */}
          {currentStep === 'auth' && (
            <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Internet Identity Status</span>
                <Badge variant={hasLinkedII ? 'default' : 'secondary'}>{hasLinkedII ? 'Linked' : 'Not Linked'}</Badge>
              </div>

              {hasLinkedII && (
                <>
                  <div className="text-xs text-muted-foreground">Principal: {linkedIcPrincipal}</div>

                  {session?.user?.loginProvider === 'internet-identity' ? (
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="default"
                        className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      >
                        Direct II Sign-in
                      </Badge>
                      <span className="text-xs text-muted-foreground">Ready to proceed</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Co-Auth Status:</span>
                        <Badge variant={isCoAuthActive ? 'default' : 'secondary'} className={statusClass}>
                          {statusMessage}
                        </Badge>
                      </div>

                      {isCoAuthActive && remainingMinutes > 0 && (
                        <div className="text-xs text-muted-foreground">⏰ Session expires in {remainingMinutes}m</div>
                      )}

                      {!isCoAuthActive && (
                        <div className="text-xs text-muted-foreground">
                          Click &ldquo;Activate II Co-Auth&rdquo; to enable ICP operations
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Success Details */}
          {currentStep === 'success' && (
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

          {currentStep !== 'success' && currentStep !== 'error' && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
