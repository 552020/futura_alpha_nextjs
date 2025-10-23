import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useOnboarding } from '@/contexts/onboarding-context';
import { useToast } from '@/hooks/use-toast';
import { UserInfoStep } from './steps/user-info-step';
import { ShareStep } from './steps/share-step';
import { SignUpStep } from './steps/sign-up-step';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

import { fatLogger } from '@/lib/logger';
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
          console.log('🔍 [DEBUG] Starting user-info step update');
          console.log('📋 [DEBUG] userData:', JSON.stringify(userData, null, 2));
          console.log('📋 [DEBUG] allUserId:', userData.allUserId);
          console.log('📋 [DEBUG] name:', userData.name);
          console.log('📋 [DEBUG] email:', userData.email);

          if (!userData.allUserId) {
            console.log('❌ [DEBUG] No allUserId found in userData');
            console.log('📋 [DEBUG] userData structure:', JSON.stringify(userData, null, 2));

            // Temporary fix: generate a temporary allUserId if none exists
            const tempAllUserId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            console.log('🔄 [DEBUG] Generating temporary allUserId:', tempAllUserId);

            // Update the context with the temporary ID
            updateUserData({ allUserId: tempAllUserId });

            // Use the temporary ID for the API call
            const response = await fetch(`/api/users/${tempAllUserId}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: userData.name,
                email: userData.email,
              }),
            });

            console.log('📋 [DEBUG] Response status:', response.status);
            console.log('📋 [DEBUG] Response ok:', response.ok);

            if (!response.ok) {
              const errorText = await response.text();
              console.log('❌ [DEBUG] Response error:', errorText);
              throw new Error(`Failed to update user information: ${response.status} ${errorText}`);
            }

            const responseData = await response.json();
            console.log('✅ [DEBUG] Response data:', JSON.stringify(responseData, null, 2));

            setCurrentStep('share');
            return;
          }

          console.log('🔄 [DEBUG] Making PATCH request to:', `/api/users/${userData.allUserId}`);
          const requestBody = {
            name: userData.name,
            email: userData.email,
          };
          console.log('📋 [DEBUG] Request body:', JSON.stringify(requestBody, null, 2));

          const response = await fetch(`/api/users/${userData.allUserId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
          });

          console.log('📋 [DEBUG] Response status:', response.status);
          console.log('📋 [DEBUG] Response ok:', response.ok);

          if (!response.ok) {
            const errorText = await response.text();
            console.log('❌ [DEBUG] Response error:', errorText);
            throw new Error(`Failed to update user information: ${response.status} ${errorText}`);
          }

          const responseData = await response.json();
          console.log('✅ [DEBUG] Response data:', JSON.stringify(responseData, null, 2));

          setCurrentStep('share');
        } catch (error) {
          console.log('❌ [DEBUG] Error in user-info step:', error);
          fatLogger.error('Error updating user information:', 'fe', {
            data: error instanceof Error ? error : undefined,
          });
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

          // Debug logging
          fatLogger.info('Creating recipient user with data:', 'fe', {
            recipientName: userData.recipientName,
            recipientEmail: userData.recipientEmail,
            allUserId: userData.allUserId,
            relationship: userData.relationship,
            familyRelationship: userData.familyRelationship,
          });

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
            const errorData = await createUserResponse.json();
            fatLogger.error('Failed to create recipient user:', 'fe', {
              status: createUserResponse.status,
              error: errorData,
            });
            throw new Error(`Failed to create recipient user: ${errorData.error || 'Unknown error'}`);
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
            fatLogger.error('Share response error:', 'fe', {
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
          fatLogger.error('Error in share step:', 'fe', {
            error: error instanceof Error ? error : undefined,
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
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto overflow-x-hidden sm:max-h-[85vh]">
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
