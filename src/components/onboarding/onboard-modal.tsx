import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useOnboarding } from '@/contexts/onboarding-context';
import { useToast } from '@/hooks/use-toast';
import { UserInfoStep } from './steps/user-info-step';
import { ShareStep } from './steps/share-step';
import { SignUpStep } from './steps/sign-up-step';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface OnboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function OnboardModal({ isOpen, onClose }: OnboardModalProps) {
  const { currentStep, setCurrentStep, userData, setOnboardingStatus, files, updateUserData } = useOnboarding();
  const { toast } = useToast();
  const { data: session, status } = useSession();

  // Only show modal for steps that should be in the modal
  const modalSteps = ['user-info', 'share', 'sign-up'];
  const showModal = isOpen && modalSteps.includes(currentStep);

  // Pre-fill user data with session data when authenticated
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.name && session?.user?.email) {
      // Only update if the data has actually changed
      if (userData.name !== session.user.name || userData.email !== session.user.email || userData.isTemporary) {
        updateUserData({
          name: session.user.name,
          email: session.user.email,
          isTemporary: false,
        });
      }
    }
  }, [status, session, updateUserData, userData]);

  // Handle next step
  const handleNext = async () => {
    switch (currentStep) {
      case 'upload':
        setOnboardingStatus('in_progress');
        // Skip user-info and sign-up steps if user is authenticated
        if (status === 'authenticated') {
          setCurrentStep('share');
        } else {
          setCurrentStep('user-info');
        }
        break;

      case 'user-info':
        try {
          if (!userData.allUserId) {
            throw new Error('User ID not found');
          }

          const response = await fetch(`/api/users/${userData.allUserId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: userData.name,
              email: userData.email,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to update user information');
          }

          setCurrentStep('share');
        } catch (error) {
          console.error('Error updating user information:', error);
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to update your information. Please try again.',
          });
        }
        break;

      case 'share':
        try {
          const lastUploadedFile = files[files.length - 1];

          if (!lastUploadedFile?.memoryId) {
            throw new Error('Memory ID not found');
          }

          // First create a temporary user for the recipient
          const createUserResponse = await fetch('/api/users', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: userData.recipientName,
              email: userData.recipientEmail,
              invitedByAllUserId: userData.allUserId,
              relationship: {
                type: userData.relationship,
                familyRole: userData.relationship === 'family' ? userData.familyRelationship : undefined,
                note: 'Invited during onboarding',
              },
              metadata: {
                invitedAt: new Date().toISOString(),
                source: 'onboarding',
              },
            }),
          });

          if (!createUserResponse.ok) {
            throw new Error('Failed to create recipient user');
          }

          const { allUser: recipientAllUser } = await createUserResponse.json();

          // Now share the memory with the recipient
          const shareResponse = await fetch(`/api/memories/${lastUploadedFile.memoryId}/share`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              target: {
                type: 'user',
                allUserId: recipientAllUser.id,
              },
              relationship: {
                type: userData.relationship,
                ...(userData.relationship === 'family' && {
                  familyRole: userData.familyRelationship,
                }),
                note: 'Invited during onboarding',
              },
              sendEmail: true,
              isInviteeNew: true,
              isOnboarding: true,
              ownerAllUserId: userData.allUserId,
            }),
          });

          if (!shareResponse.ok) {
            const errorData = await shareResponse.json();
            console.error('Share response error:', {
              status: shareResponse.status,
              statusText: shareResponse.statusText,
              errorData,
            });
            throw new Error(errorData.error || errorData.details || 'Failed to share memory');
          }

          // If authenticated, we're done. If not, go to sign-up
          if (status === 'authenticated') {
            setOnboardingStatus('completed');
            setCurrentStep('complete');
          } else {
            setCurrentStep('sign-up');
          }
        } catch (error) {
          console.error('Error in share step:', {
            error,
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          });
          toast({
            variant: 'destructive',
            title: 'Error',
            description: error instanceof Error ? error.message : 'Something went wrong',
          });
        }
        break;

      case 'sign-up':
        setOnboardingStatus('completed');
        setCurrentStep('complete');
        break;

      case 'complete':
        setOnboardingStatus('completed');
        break;
    }
  };

  const handleBack = () => {
    // Don't change onboarding status when going back
    switch (currentStep) {
      case 'user-info':
        setCurrentStep('upload');
        break;
      case 'share':
        // Skip user-info step if user is authenticated
        if (status === 'authenticated') {
          setCurrentStep('upload');
        } else {
          setCurrentStep('user-info');
        }
        break;
      case 'sign-up':
        setCurrentStep('share');
        break;
    }
  };

  return (
    <Dialog open={showModal} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-md">
        <VisuallyHidden asChild>
          <DialogTitle>
            {currentStep === 'user-info' && 'Enter Your Information'}
            {currentStep === 'share' && 'Share Your Memory'}
            {currentStep === 'sign-up' && 'Create Your Account'}
          </DialogTitle>
        </VisuallyHidden>
        {currentStep === 'user-info' && (
          <UserInfoStep
            withImage={false}
            collectEmail={true}
            onNext={handleNext}
            onBack={handleBack}
            isReadOnly={status === 'authenticated'}
          />
        )}
        {currentStep === 'share' && <ShareStep onNext={handleNext} onBack={handleBack} />}
        {currentStep === 'sign-up' && status !== 'authenticated' && <SignUpStep onBack={handleBack} />}
      </DialogContent>
    </Dialog>
  );
}
