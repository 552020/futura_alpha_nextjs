"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { Suspense, useEffect } from "react";
import { usePathname } from "next/navigation";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_INGEST;

  useEffect(() => {
    if (!posthog.isFeatureEnabled) {
      // console.log("Initializing PostHog with:");
      // console.log("  Key:", process.env.NEXT_PUBLIC_POSTHOG_KEY);
      // console.log("  Host:", apiHost);

      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
        api_host: apiHost,
        capture_pageview: false, // We'll handle this manually
        capture_pageleave: true,
        disable_session_recording: true, // Disable session recording for privacy
        opt_out_capturing_by_default: false,
        loaded: () => {
          // console.log("✅ Final PostHog config after init");
        },
      });
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
      // console.log("📡 Capturing pageview:", url);
      posthog.capture("$pageview", {
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
