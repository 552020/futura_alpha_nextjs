'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { AuthModal } from '@/components/auth/auth-modal';

// Prevent static generation of this page
export const dynamic = 'force-dynamic';

function SignInPageInternal() {
  const params = useParams();
  const searchParams = useSearchParams();
  const lang = (params?.lang as string) || 'en';
  const callbackUrl = searchParams.get('callbackUrl') || `/${lang}/dashboard`;

  // Ensure callbackUrl is always a valid relative URL
  const safeCallbackUrl = callbackUrl?.startsWith('/')
    ? callbackUrl
    : `/${lang}/dashboard`;

  return (
    <AuthModal
      isOpen={true}
      onClose={() => {
        // Prefer going back; if no history, go home for lang
        if (typeof window !== 'undefined' && window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = `/${lang}`;
        }
      }}
      showGoogle={true}
      showEmail={true}
      showInternetIdentity={true}
      showGithub={false}
      callbackUrl={safeCallbackUrl}
      title="Sign in"
    />
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <SignInPageInternal />
    </Suspense>
  );
}
