import { useSession } from 'next-auth/react';
import { fatLogger } from '@/lib/logger';

interface ShareGalleryParams {
    galleryId: string;
    galleryTitle: string;
    email: string;
    message?: string;
}

export function useGalleryShare() {
    const { data: session } = useSession();

    const shareGallery = async ({ galleryId, galleryTitle, email, message = '' }: ShareGalleryParams) => {
        if (!email) {
            throw new Error('Email is required');
        }

        fatLogger.info('Starting gallery share process', 'fe', {
            data: { galleryId, galleryTitle, recipientEmail: email, hasMessage: !!message },
        });

        let allUserId: string;
        let userName: string;
        let isNewUser = false;

        // Step 1: Check if user exists by email
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

        // Step 2: Share the gallery with email notification in a single call
        fatLogger.info('Sharing gallery with user', 'fe', {
            data: { galleryId, allUserId, sharedWithType: 'user', isNewUser },
        });

        const shareResponse = await fetch(`/api/galleries/${galleryId}/share`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sharedWithType: 'user',
                sharedWithId: allUserId,
                sendEmail: true, // Enable email notification
                isInviteeNew: isNewUser, // Indicate if this is a new user
            }),
        });

        if (!shareResponse.ok) {
            const errorData = await shareResponse.json().catch(() => ({ error: 'Unknown error' }));
            fatLogger.error('Failed to share gallery', 'fe', {
                data: { status: shareResponse.status, error: errorData },
            });
            throw new Error(errorData.error || 'Failed to share gallery');
        }

        fatLogger.info('Gallery shared successfully with email notification', 'fe', {
            data: { galleryId, allUserId, emailSent: true },
        });

        fatLogger.info('Gallery share process completed', 'fe', {
            data: { galleryId, recipientEmail: email, isNewUser },
        });
    };

    return { shareGallery };
}
