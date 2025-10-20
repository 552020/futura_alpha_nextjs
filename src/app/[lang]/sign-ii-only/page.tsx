'use client';

import { useState, Suspense, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, X } from 'lucide-react';
import { useInternetIdentitySignIn } from '@/hooks/use-internet-identity-signin';
import { fatLogger } from '@/lib/logger/fat-logger';

function SignIIOnlyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, update } = useSession();
  const { signInWithII, linkIIToSession, isBusy: iiBusy } = useInternetIdentitySignIn();
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

    // If user already logged in, link II; else do sign-in
    const hasActiveSession = !!session?.user?.id;

    if (hasActiveSession) {
      // Link II to existing session
      const result = await linkIIToSession({
        callbackUrl: safeCallbackUrl,
        onSuccess: async () => {
          // Update NextAuth session to include the new principal
          const linkedIcPrincipals = [result.principal].filter(Boolean) as string[];
          await update({
            activeIcPrincipal: result.principal,
            linkedIcPrincipals,
          });
        },
        onError: errorMsg => setError(errorMsg),
      });

      // If linking failed, error is already set
      if (!result.success) {
        return;
      }
    } else {
      // Standalone II sign-in when no session exists
      await signInWithII({
        callbackUrl: safeCallbackUrl,
        onError: errorMsg => setError(errorMsg),
      });
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
