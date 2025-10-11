'use client';

import { useEffect } from 'react';

/**
 * Service Worker Registration Component
 *
 * NOTE: This component lives in providers/ because it's app-wide infrastructure
 * setup, similar to other providers. While it doesn't provide React context,
 * it performs global initialization that affects the entire application.
 *
 * Alternative locations considered:
 * - utils/ or lib/ - But it's a React component, not a utility function
 * - hooks/ - But it's not a reusable hook, it's a one-time setup component
 *
 * This component registers the Service Worker for image caching and offline support.
 */
export default function ServiceWorkerClient() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(e => console.warn('SW register failed', e));
    }
  }, []);
  return null;
}
