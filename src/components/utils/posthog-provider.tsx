'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react';
import { Suspense, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_INGEST;
  const initAttempted = useRef(false);

  useEffect(() => {
    // Only attempt init once
    if (initAttempted.current) return;
    initAttempted.current = true;

    // Defer PostHog initialization to avoid blocking main thread during page load
    const initPostHog = () => {
      if (!posthog.isFeatureEnabled) {
        posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
          api_host: apiHost,
          capture_pageview: false, // We'll handle this manually
          capture_pageleave: true,
          disable_session_recording: true, // Disable session recording for privacy
          opt_out_capturing_by_default: false,
        });
      }
    };

    // Use requestIdleCallback if available, otherwise setTimeout
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(initPostHog, { timeout: 3000 });
    } else {
      setTimeout(initPostHog, 1000);
    }
  }, [apiHost]);

  return (
    <PHProvider client={posthog}>
      <SuspendedPostHogPageView />
      {children}
    </PHProvider>
  );
}

function PostHogPageView() {
  const pathname = usePathname();
  const posthog = usePostHog();

  useEffect(() => {
    if (posthog && pathname) {
      const url = window.origin + pathname;
      // icpLogger.info("📡 Capturing pageview:", url);
      posthog.capture('$pageview', {
        $current_url: url,
        $pathname: pathname,
      });
    }
  }, [posthog, pathname]);

  return null;
}

function SuspendedPostHogPageView() {
  return (
    <Suspense fallback={null}>
      <PostHogPageView />
    </Suspense>
  );
}
