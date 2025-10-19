'use client';

import { useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import { useInternetIdentitySignIn } from '@/hooks/use-internet-identity-signin';

// Prevent static generation of this page
export const dynamic = 'force-dynamic';

function SignInPageInternal() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = (params?.lang as string) || 'en';
  const callbackUrl = searchParams.get('callbackUrl') || `/${lang}/dashboard`;

  // Ensure callbackUrl is always a valid relative URL
  const safeCallbackUrl = callbackUrl?.startsWith('/') ? callbackUrl : `/${lang}/dashboard`;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const { signInWithII, isBusy: iiBusy } = useInternetIdentitySignIn();

  async function handleCredentialsSignIn(e: React.FormEvent) {
    // fatLogger.info("handleCredentialsSignIn", email, password);
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
        // Remove callbackUrl - let NextAuth handle authentication only
      });
      if (res?.error) {
        setError('Invalid email or password');
        return;
      }
      // fatLogger.info("handleCredentialsSignIn", res);

      // Navigate after successful credentials sign-in
      router.push(safeCallbackUrl);
    } catch {
      setError('Sign in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setBusy(false);
      return;
    }

    try {
      // Create user account
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Sign up failed');
        return;
      }

      // After successful signup, automatically sign in
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
        // Remove callbackUrl - let NextAuth handle navigation
      });

      if (res?.error) {
        setError('Account created but sign in failed. Please try signing in manually.');
        return;
      }

      // Navigate after successful signup and sign-in
      router.push(safeCallbackUrl);
    } catch (_error) {
      setError('Sign up failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function handleProvider(provider: 'github' | 'google') {
    if (busy) return;
    setBusy(true);
    // Provider flows use NextAuth redirects; NextAuth redirect callback will land on /{lang}/dashboard
    // but we pass callbackUrl to be explicit.
    void signIn(provider, { callbackUrl: safeCallbackUrl }).finally(() => setBusy(false));
  }

  async function handleInternetIdentity() {
    if (iiBusy || busy) return;
    setError(null);

    await signInWithII({
      callbackUrl: safeCallbackUrl,
      onError: errorMsg => setError(errorMsg),
    });
  }

  function close() {
    // Prefer going back; if no history, go home for lang
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(`/${lang}`);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm p-4 min-h-screen pt-8 sm:items-center sm:pt-4">
      <div className="w-full max-w-md rounded-lg bg-white dark:bg-slate-950 p-6 shadow-xl max-h-[85vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Sign in</h1>
          <Button variant="ghost" size="sm" onClick={close} className="border border-gray-200 dark:border-gray-700">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-3">
          <Button variant="outline" onClick={() => handleProvider('google')} disabled={busy || iiBusy}>
            Sign in with Google
          </Button>
          <Button variant="outline" onClick={handleInternetIdentity} disabled={iiBusy || busy}>
            {iiBusy ? 'Connecting to Internet Identity…' : 'Sign in with Internet Identity'}
          </Button>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-slate-950 px-2 text-muted-foreground">Or use email</span>
          </div>
        </div>

        {/* Email Authentication Tabs */}
        <div className="mb-4 flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
          <button
            type="button"
            onClick={() => setActiveTab('signin')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'signin'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('signup')}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'signup'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={activeTab === 'signup' ? handleSignUp : handleCredentialsSignIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          {activeTab === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
              />
            </div>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy
              ? activeTab === 'signup'
                ? 'Creating account...'
                : 'Signing in...'
              : activeTab === 'signup'
                ? 'Sign up with Email'
                : 'Sign in with Email'}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SignInPageInternal />
    </Suspense>
  );
}
