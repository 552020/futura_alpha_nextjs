import { galleryService } from '@/services/gallery';
import { fatLogger } from '@/lib/logger';
import { useSession } from 'next-auth/react';
import { ShareModalBase } from './base';

interface GalleryShareDialogProps {
  galleryId: string;
  galleryTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShare?: () => void;
}

export function GalleryShareDialog({
  galleryId,
  galleryTitle,
  open,
  onOpenChange,
  onShare,
}: GalleryShareDialogProps) {
  const { data: session } = useSession();

  const handleShare = async (data: { email?: string; message: string }) => {
    const { email, message } = data;

    if (!email) {
      throw new Error('Email is required');
    }

    fatLogger.info('Starting gallery share process', 'fe', {
      data: { galleryId, galleryTitle, recipientEmail: email, hasMessage: !!message },
    });

    try {
      let allUserId: string;
      let userName: string;
      let isNewUser = false;

      // Step 1: Check if user exists by email using the [id] route with email query param
      fatLogger.debug('Looking up user by email', 'fe', { data: { email } });
      const lookupResponse = await fetch(`/api/users/_?email=${encodeURIComponent(email)}`);

      if (lookupResponse.ok) {
        // User exists
        const { allUser, user } = await lookupResponse.json();
        allUserId = allUser.id;
        userName = user.name || user.email;
        fatLogger.info('User found', 'fe', {
          data: { allUserId, userName, userType: allUser.type },
        });
      } else if (lookupResponse.status === 404) {
        // User doesn't exist, create temporary user
        isNewUser = true;
        fatLogger.info('User not found, creating temporary user', 'fe', { data: { email } });

        const userResponse = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: email.split('@')[0], // Use email prefix as name
            email,
            invitedByAllUserId: session?.user?.id, // Track who invited them
          }),
        });

        if (!userResponse.ok) {
          throw new Error('Failed to create temporary user');
        }

        const { allUser, user } = await userResponse.json();
        allUserId = allUser.id;
        userName = user.name || email.split('@')[0];
        fatLogger.info('Temporary user created', 'fe', {
          data: { allUserId, userName },
        });
      } else {
        throw new Error('Failed to lookup user');
      }

      // Step 2: Share the gallery with the user
      fatLogger.info('Sharing gallery with user', 'fe', {
        data: { galleryId, allUserId, sharedWithType: 'user' },
      });

      await galleryService.shareGallery(galleryId, {
        sharedWithType: 'user',
        sharedWithId: allUserId,
      });

      fatLogger.info('Gallery shared successfully', 'fe', {
        data: { galleryId, allUserId },
      });

      // Step 3: Send email notification
      try {
        const sharerName = session?.user?.name || 'Someone';
        const appUrl = window.location.origin;
        const galleryUrl = `${appUrl}/gallery/${galleryId}`;

        fatLogger.debug('Sending share notification email', 'fe', {
          data: { to: email, isNewUser, hasCustomMessage: !!message },
        });

        const emailText = `Hi ${userName},

${sharerName} has shared a gallery titled "${galleryTitle}" with you.

${message ? `Message from ${sharerName}:\n"${message}"\n\n` : ''}You can view the gallery here: ${galleryUrl}

${isNewUser ? 'A temporary account has been created for you. You can sign in to access the gallery and all its memories.\n\n' : ''}Best regards,
Your Gallery Team`;

        const emailResponse = await fetch('/api/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: email,
            subject: `${sharerName} shared a gallery with you`,
            text: emailText,
          }),
        });

        if (emailResponse.ok) {
          fatLogger.info('Share notification email sent', 'fe', { data: { to: email } });
        } else {
          fatLogger.warn('Email send returned non-OK status', 'fe', {
            data: { status: emailResponse.status },
          });
        }
      } catch (emailError) {
        // Log email error but don't fail the share operation
        fatLogger.error('Error sending share notification email', 'fe', {
          data: emailError instanceof Error ? emailError : undefined,
        });
      }

      fatLogger.info('Gallery share process completed', 'fe', {
        data: { galleryId, recipientEmail: email, isNewUser },
      });

      onOpenChange(false);
      onShare?.();
    } catch (error) {
      fatLogger.error('Error sharing gallery', 'fe', {
        data: error instanceof Error ? error : undefined,
      });
      throw error; // Re-throw to let the modal handle the error display
    }
  };

  return (
    <ShareModalBase
      isOpen={open}
      onClose={() => onOpenChange(false)}
      onSend={handleShare}
      mode="gallery-share"
      galleryTitle={galleryTitle}
    />
  );
}
