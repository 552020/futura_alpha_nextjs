import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { fatLogger } from '@/lib/logger';

export interface IISignInOptions {
    callbackUrl: string;
    onSuccess?: () => void | Promise<void>;
    onError?: (error: string) => void;
}

export interface IISignInResult {
    success: boolean;
    error?: string;
    principal?: string;
}

/**
 * Hook for handling Internet Identity authentication flow.
 * Consolidates the shared II auth logic used across signin pages.
 */
export function useInternetIdentitySignIn() {
    const router = useRouter();
    const [isBusy, setIsBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Complete Internet Identity sign-in flow:
     * 1. Login with II AuthClient
     * 2. Fetch challenge (nonce)
     * 3. Register with nonce (prove to canister)
     * 4. Sign in with NextAuth
     * 5. Optionally bind to canister
     */
    const signInWithII = async (options: IISignInOptions): Promise<IISignInResult> => {
        if (isBusy) {
            return { success: false, error: 'Authentication already in progress' };
        }

        setIsBusy(true);
        setError(null);

        try {
            // 1. Ensure II identity with AuthClient.login
            const { loginWithII } = await import('@/ic/ii');
            const { principal, identity } = await loginWithII();

            // 2. Fetch challenge → get { nonceId, nonce }
            const { fetchChallenge } = await import('@/lib/ii-client');
            const challenge = await fetchChallenge(options.callbackUrl);

            // 3. Register user and prove nonce in one call
            const { registerWithNonce } = await import('@/lib/ii-client');
            await registerWithNonce(challenge.nonce, identity);

            // 4. Call signIn with principal + nonceId + actual nonce
            const signInResult = await signIn('ii', {
                principal,
                nonceId: challenge.nonceId,
                nonce: challenge.nonce,
                redirect: false,
            });

            if (!signInResult?.ok) {
                const errorMsg = signInResult?.error || 'Unknown error';
                fatLogger.error('signIn failed', 'fe', { data: new Error(errorMsg) });
                setError(`Authentication failed: ${errorMsg}`);
                options.onError?.(errorMsg);
                return { success: false, error: errorMsg };
            }

            // 5. (Optional) After success, call capsules_bind_neon() on canister
            try {
                const { markBoundOnCanister } = await import('@/lib/ii-client');
                await markBoundOnCanister(identity);
            } catch (bindError) {
                fatLogger.warn('markBoundOnCanister failed', 'fe', {
                    error: bindError instanceof Error ? bindError.message : String(bindError),
                });
                // Don't fail the auth flow if this optional step fails
            }

            // 6. Execute success callback if provided
            if (options.onSuccess) {
                await options.onSuccess();
            }

            // 7. Redirect manually after successful authentication
            router.push(options.callbackUrl);

            return { success: true, principal };
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            fatLogger.error('II authentication error', 'fe', { data: e as Error });
            fatLogger.error('Error stack', 'fe', {
                data: new Error(e instanceof Error ? e.stack || 'No stack trace' : 'No stack trace'),
            });

            const fullError = `Internet Identity sign-in failed: ${errorMsg}`;
            setError(fullError);
            options.onError?.(fullError);

            return { success: false, error: fullError };
        } finally {
            setIsBusy(false);
        }
    };

    /**
     * Link Internet Identity to existing session.
     * Used when user is already authenticated and wants to add II.
     */
    const linkIIToSession = async (options: IISignInOptions): Promise<IISignInResult> => {
        if (isBusy) {
            return { success: false, error: 'Authentication already in progress' };
        }

        setIsBusy(true);
        setError(null);

        try {
            // 1. Ensure II identity with AuthClient.login
            const { loginWithII } = await import('@/ic/ii');
            const { identity } = await loginWithII();

            // 2. Start non-blocking capsule auto-creation
            const { ensureSelfCapsuleWithIdentity } = await import('@/services/capsule');
            ensureSelfCapsuleWithIdentity(identity).catch(capsuleError => {
                console.error('Capsule auto-creation failed:', capsuleError);
            });

            // 3. Fetch challenge and register (create proof/nonce)
            const { fetchChallenge, registerWithNonce } = await import('@/lib/ii-client');
            const challenge = await fetchChallenge(options.callbackUrl);
            await registerWithNonce(challenge.nonce, identity);

            // 4. Link via API route: verify nonce server-side and upsert account
            const res = await fetch('/api/auth/link-ii', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nonce: challenge.nonce }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));

                // Handle Principal conflict specifically
                if (data.code === 'PRINCIPAL_CONFLICT') {
                    const errorMsg =
                        'This Internet Identity is already linked to another account. Each II Principal can only be linked to one account for security reasons.';
                    setError(errorMsg);
                    options.onError?.(errorMsg);
                    return { success: false, error: errorMsg };
                }

                const errorMsg = data.error || data.message || 'Failed to link Internet Identity';
                setError(errorMsg);
                options.onError?.(errorMsg);
                return { success: false, error: errorMsg };
            }

            const data = await res.json();
            const principal = data.principal;

            // 5. Execute success callback if provided
            if (options.onSuccess) {
                await options.onSuccess();
            }

            // 6. Redirect to callback URL
            router.push(options.callbackUrl);

            return { success: true, principal };
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            const fullError = `Internet Identity linking failed: ${errorMsg}`;
            setError(fullError);
            options.onError?.(fullError);
            return { success: false, error: fullError };
        } finally {
            setIsBusy(false);
        }
    };

    const clearError = () => setError(null);

    return {
        signInWithII,
        linkIIToSession,
        isBusy,
        error,
        clearError,
    };
}
