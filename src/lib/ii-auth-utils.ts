import { signIn } from 'next-auth/react';

export async function handleInternetIdentityAuth(
  callbackUrl: string = '/en/dashboard',
  onSuccess?: (principal: string) => void,
  onError?: (error: string) => void,
  sessionUpdate?: (data: {
    activeIcPrincipal: string;
    icpPrincipalAssertedAt: number;
  }) => Promise<unknown>
) {
  try {
    // 1) Ensure II identity with AuthClient.login
    const { loginWithII } = await import('@/ic/ii');
    const { identity } = await loginWithII();

    // 2) Fetch challenge and register (create proof/nonce)
    const { fetchChallenge, registerWithNonce } = await import(
      '@/lib/ii-client'
    );
    const challenge = await fetchChallenge(callbackUrl);
    await registerWithNonce(challenge.nonce, identity);

    // 3) Check if user already has a session
    // Note: We need to access the session from the calling component
    // For now, we'll do the linking flow and let the caller handle session checks
    const res = await fetch('/api/auth/link-ii', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nonce: challenge.nonce }),
    });

    if (res.ok) {
      // Link successful - get principal from response
      const data = await res.json();
      const principal = data.principal;

      // Update session with activeIcPrincipal if sessionUpdate function provided
      if (sessionUpdate) {
        await sessionUpdate({
          activeIcPrincipal: principal,
          icpPrincipalAssertedAt: Date.now(),
        });
      }

      // Call success callback if provided
      if (onSuccess) {
        onSuccess(principal);
      }

      return { success: true, principal };
    } else {
      // Link failed - try full sign-in
      const data = await res.json().catch(() => ({}));

      if (data.code === 'PRINCIPAL_CONFLICT') {
        throw new Error(
          'This Internet Identity is already linked to another account. Each II Principal can only be linked to one account for security reasons.'
        );
      }

      // Fallback: standalone II sign-in when no session exists
      await signIn('ii', {
        principal: '', // authorize() will validate via /api/ii/verify-nonce
        nonceId: challenge.nonceId,
        nonce: challenge.nonce,
        redirect: false, // Don't redirect automatically
        callbackUrl: callbackUrl,
      });

      // Call success callback if provided
      if (onSuccess) {
        onSuccess(identity.getPrincipal().toString());
      }

      return { success: true, principal: identity.getPrincipal().toString() };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (onError) {
      onError(errorMessage);
    }
    throw error;
  }
}
