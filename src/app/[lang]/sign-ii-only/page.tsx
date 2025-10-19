'use client';

import { useState, Suspense, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, X } from 'lucide-react';
import { fatLogger } from '@/lib/logger/fat-logger';

function SignIIOnlyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, update } = useSession();
  const [iiBusy, setIiBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get callback URL from query params, default to dashboard
  const callbackUrl = searchParams.get('callbackUrl') || '/en/dashboard';

  // Extract path from full URL if needed
  let safeCallbackUrl = callbackUrl;
  if (callbackUrl.startsWith('http')) {
    try {
      const url = new URL(callbackUrl);
      safeCallbackUrl = url.pathname;
    } catch {
      safeCallbackUrl = '/en/dashboard';
    }
  } else if (!callbackUrl.startsWith('/')) {
    safeCallbackUrl = '/en/dashboard';
  }

  // Debug logging for callback URL
  fatLogger.info('Sign-II-Only Debug:', 'be', {
    rawCallbackUrl: callbackUrl,
    safeCallbackUrl,
    searchParams: Object.fromEntries(searchParams.entries()),
    currentPath: window.location.pathname,
    currentHref: window.location.href,
  });

  async function handleInternetIdentity() {
    if (iiBusy) return;
    setError(null);
    setIiBusy(true);
    try {
      // 1) Ensure II identity with AuthClient.login
      const { loginWithII } = await import('@/ic/ii');
      const { identity } = await loginWithII();

      // 1.5) Start non-blocking capsule auto-creation
      const { ensureSelfCapsuleWithIdentity } = await import('@/services/capsule');
      ensureSelfCapsuleWithIdentity(identity).catch(error => {
        console.error('Capsule auto-creation failed:', error);
        // Could show a toast: "Auto-creation failed, please create manually"
      });

      // 2) Fetch challenge and register (create proof/nonce)
      const { fetchChallenge, registerWithNonce } = await import('@/lib/ii-client');
      const challenge = await fetchChallenge(safeCallbackUrl);
      await registerWithNonce(challenge.nonce, identity);

      // 3) If user already logged in, link II via API route; else do signIn('ii')
      const hasActiveSession = !!session?.user?.id;
      if (hasActiveSession) {
        // Link: verify nonce server-side and upsert account
        const res = await fetch('/api/auth/link-ii', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nonce: challenge.nonce }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));

          // Handle Principal conflict specifically
          if (data.code === 'PRINCIPAL_CONFLICT') {
            throw new Error(
              'This Internet Identity is already linked to another account. Each II Principal can only be linked to one account for security reasons.'
            );
          }

          throw new Error(data.error || data.message || 'Failed to link Internet Identity');
        }

        // Get the principal and linked principals from the response
        const data = await res.json();
        const principal = data.principal;
        const linkedIcPrincipals = data.linkedIcPrincipals || [];

        // 4) Update NextAuth session to include activeIcPrincipal and linkedIcPrincipals
        await update({
          activeIcPrincipal: principal,
          linkedIcPrincipals,
        });
        // 5) Continue flow
        fatLogger.info('Redirecting to callback URL:', 'be', {
          callbackUrl: safeCallbackUrl,
        });
        router.push(safeCallbackUrl);
        return;
      }

      // Fallback: standalone II sign-in when no session exists
      fatLogger.info('Using NextAuth signIn with callback URL:', 'be', {
        callbackUrl: safeCallbackUrl,
      });
      await signIn('ii', {
        principal: '', // authorize() will validate via /api/ii/verify-nonce
        nonceId: challenge.nonceId,
        nonce: challenge.nonce,
        redirect: true,
        callbackUrl: safeCallbackUrl,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Internet Identity linking failed: ${msg}`);
    } finally {
      setIiBusy(false);
    }
  }

  const closeModal = useCallback(() => {
    router.back();
  }, [router]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [closeModal]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm p-4"
      onClick={e => {
        if (e.target === e.currentTarget) {
          closeModal(); // Close when clicking backdrop
        }
      }}
    >
      <div className="w-full max-w-md rounded-lg bg-white dark:bg-slate-950 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex-1 text-center">
            <h1 className="text-xl font-semibold">Sign in with Internet Identity</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={closeModal}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mb-6">
          <p className="text-sm text-muted-foreground text-center">
            Sign in or sign up with your Internet Identity to use all extended functionalities.
          </p>
        </div>

        <div className="grid gap-3">
          <Button
            variant="outline"
            onClick={handleInternetIdentity}
            disabled={iiBusy}
            className="h-12"
            data-testid="ii-start"
          >
            {iiBusy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting to Internet Identity…
              </>
            ) : (
              'Sign in with Internet Identity'
            )}
          </Button>
        </div>

        {error && (
          <Alert className="mt-4" variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Need help?{' '}
            <a
              href="https://internetcomputer.org/internet-identity"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              Learn more about Internet Identity
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignIIOnlyPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-slate-950 p-6 shadow-xl">
            <div className="flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading...</span>
            </div>
          </div>
        </div>
      }
    >
      <SignIIOnlyContent />
    </Suspense>
  );
}
