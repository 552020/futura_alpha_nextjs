'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { fatLogger } from '@/lib/logger';
import { StepNavigation } from '@/components/onboarding/common/step-navigation';
import { OnboardingStep } from '@/contexts/onboarding-context';

/** Same rule as POST /api/auth/signup */
const MIN_PASSWORD_LENGTH = 6;

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;

  // Authentication options
  showGoogle?: boolean;
  showEmail?: boolean;
  showInternetIdentity?: boolean;
  showGithub?: boolean;

  // Callback configuration
  callbackUrl?: string;

  // UI customization
  title?: string;
  description?: string;

  // Optional: Step navigation (for onboarding)
  showStepNavigation?: boolean;
  onBack?: () => void;
  currentStep?: OnboardingStep;
}

export function AuthModal({
  isOpen,
  onClose,
  showGoogle = true,
  showEmail = true,
  showInternetIdentity = true,
  showGithub = false,
  callbackUrl,
  title = 'Sign in',
  description,
  showStepNavigation = false,
  onBack,
  currentStep,
}: AuthModalProps) {
  const params = useParams();
  const router = useRouter();
  const lang = (params?.lang as string) || 'en';

  // Use provided callbackUrl or default to dashboard
  const safeCallbackUrl = callbackUrl || `/${lang}/dashboard`;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // Email form: sign in to an existing account, or create one
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iiBusy, setIiBusy] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setMode('signin');
      setError(null);
      setBusy(false);
      setIiBusy(false);
    }
  }, [isOpen]);

  async function handleCredentialsSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: safeCallbackUrl,
      });
      if (res?.error) {
        setError('Invalid email or password');
        return;
      }

      // Navigate after successful credentials sign-in
      router.push(safeCallbackUrl);
    } catch {
      setError('Sign in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function switchMode(next: 'signin' | 'signup') {
    setMode(next);
    setError(null);
    setPassword('');
    setConfirmPassword('');
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
      );
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(body?.error || 'Sign up failed. Please try again.');
        return;
      }

      // The account exists: sign in with it right away
      const signedIn = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: safeCallbackUrl,
      });
      if (signedIn?.error) {
        setError('Account created, but signing in failed. Please sign in.');
        switchMode('signin');
        return;
      }
      router.push(safeCallbackUrl);
    } catch {
      setError('Sign up failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function handleProvider(provider: 'github' | 'google') {
    if (busy) return;
    setBusy(true);
    // Provider flows use NextAuth redirects
    void signIn(provider, { callbackUrl: safeCallbackUrl }).finally(() =>
      setBusy(false)
    );
  }

  async function handleInternetIdentity() {
    if (iiBusy || busy) return;
    setError(null);
    setIiBusy(true);
    try {
      // 1. Ensure II identity with AuthClient.login
      const { loginWithII } = await import('@/ic/ii');
      const { principal, identity } = await loginWithII();

      // Fetch challenge → get { nonceId, nonce }
      const { fetchChallenge } = await import('@/lib/ii-client');
      const challenge = await fetchChallenge(safeCallbackUrl);

      // Register user and prove nonce in one call
      const { registerWithNonce } = await import('@/lib/ii-client');
      await registerWithNonce(challenge.nonce, identity);

      // Call signIn with principal + nonceId + actual nonce
      const signInResult = await signIn('ii', {
        principal,
        nonceId: challenge.nonceId,
        nonce: challenge.nonce,
        redirect: false,
      });

      // (Optional) After success, call capsules_bind_neon() on canister
      if (signInResult?.ok) {
        try {
          const { markBoundOnCanister } = await import('@/lib/ii-client');
          await markBoundOnCanister(identity);
        } catch (error) {
          fatLogger.warn('markBoundOnCanister failed', 'fe', {
            error: error instanceof Error ? error.message : String(error),
          });
          // Don't fail the auth flow if this optional step fails
        }

        // Redirect manually after successful authentication
        router.push(safeCallbackUrl);
      } else {
        fatLogger.error('signIn failed', 'fe', {
          data: new Error(signInResult?.error || 'Unknown error'),
        });
        setError(
          `Authentication failed: ${signInResult?.error || 'Unknown error'}`
        );
      }
    } catch (e) {
      fatLogger.error('II authentication error', 'fe', { data: e as Error });
      fatLogger.error('Error stack', 'fe', {
        data: new Error(
          e instanceof Error ? e.stack || 'No stack trace' : 'No stack trace'
        ),
      });
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Internet Identity sign-in failed: ${msg}`);
    } finally {
      setIiBusy(false);
    }
  }

  // Removed unused close function - using onClose prop instead

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-lg bg-white dark:bg-slate-950 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">{title}</h1>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        {description && (
          <p className="text-sm text-muted-foreground mb-4">{description}</p>
        )}

        <div className="grid gap-3">
          {showGoogle && (
            <Button
              variant="outline"
              onClick={() => handleProvider('google')}
              disabled={busy || iiBusy}
            >
              Sign in with Google
            </Button>
          )}
          {showGithub && (
            <Button
              variant="outline"
              onClick={() => handleProvider('github')}
              disabled={busy || iiBusy}
            >
              Sign in with GitHub
            </Button>
          )}
          {showInternetIdentity && (
            <Button
              variant="outline"
              onClick={handleInternetIdentity}
              disabled={iiBusy || busy}
            >
              {iiBusy ? (
                <>
                  <LoadingSpinner size="sm" text="" className="mr-2" />
                  Connecting to Internet Identity…
                </>
              ) : (
                'Sign in with Internet Identity'
              )}
            </Button>
          )}
        </div>

        {showEmail && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with email
                </span>
              </div>
            </div>

            <form
              onSubmit={
                mode === 'signin' ? handleCredentialsSignIn : handleSignUp
              }
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={
                    mode === 'signin' ? 'current-password' : 'new-password'
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    mode === 'signin'
                      ? 'Enter your password'
                      : `At least ${MIN_PASSWORD_LENGTH} characters`
                  }
                  required
                />
              </div>
              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Enter the password again"
                    required
                  />
                </div>
              )}
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={busy}>
                {mode === 'signin'
                  ? busy
                    ? 'Signing in...'
                    : 'Sign in with Email'
                  : busy
                    ? 'Creating account...'
                    : 'Sign up with Email'}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              {mode === 'signin'
                ? 'No account yet?'
                : 'Already have an account?'}{' '}
              <button
                type="button"
                className="font-medium text-foreground underline underline-offset-2"
                onClick={() =>
                  switchMode(mode === 'signin' ? 'signup' : 'signin')
                }
                data-testid="auth-mode-switch"
              >
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </>
        )}

        {showStepNavigation && onBack && currentStep && (
          <div className="mt-6">
            <StepNavigation
              currentStep={currentStep}
              onBack={onBack}
              showBackButton={true}
            />
          </div>
        )}

        <div className="mt-4 text-center text-xs text-muted-foreground">
          <Link
            href={`/api/auth/signin?callbackUrl=${encodeURIComponent(safeCallbackUrl)}`}
            className="underline underline-offset-2 hover:text-foreground"
          >
            Use default sign-in page
          </Link>
        </div>
      </div>
    </div>
  );
}
