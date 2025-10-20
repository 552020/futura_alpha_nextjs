'use client';

import { useEffect } from 'react';

/**
 * Service Worker Registration Component
 *
 * This component registers the Service Worker for image caching and offline support.
 * It's a one-time setup component that performs global initialization.
 *
 * Location: lib/ - App-wide infrastructure setup, not a provider or utility function.
 */
export default function ServiceWorkerClient() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(e => console.warn('SW register failed', e));
    }
  }, []);
  return null;
}
