import { useSession } from 'next-auth/react';
import { galleryService } from '@/services/gallery';
import { fatLogger } from '@/lib/logger';

interface ShareGalleryParams {
  galleryId: string;
  galleryTitle: string;
  email: string;
  message?: string;
}

export function useGalleryShare() {
  const { data: session } = useSession();

  const shareGallery = async ({
    galleryId,
    galleryTitle,
    email,
    message = '',
  }: ShareGalleryParams) => {
    if (!email) {
      throw new Error('Email is required');
    }

    fatLogger.info('Starting gallery share process', 'fe', {
      data: {
        galleryId,
        galleryTitle,
        recipientEmail: email,
        hasMessage: !!message,
      },
    });

    let allUserId: string;
    let userName: string;
    let isNewUser = false;

    // Step 1: Check if user exists by email
    fatLogger.debug('Looking up user by email', 'fe', { data: { email } });
    const lookupResponse = await fetch(
      `/api/users/_?email=${encodeURIComponent(email)}`
    );

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
      fatLogger.info('User not found, creating temporary user', 'fe', {
        data: { email },
      });

      const userResponse = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: email.split('@')[0],
          email,
          invitedByAllUserId: session?.user?.id,
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

    // Step 2: Share the gallery
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
        fatLogger.info('Share notification email sent', 'fe', {
          data: { to: email },
        });
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
  };

  return { shareGallery };
}
