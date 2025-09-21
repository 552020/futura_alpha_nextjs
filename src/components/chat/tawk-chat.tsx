'use client';

import { useEffect } from 'react';

interface TawkChatProps {
  enabled?: boolean;
}

// Extend Window interface for Tawk.to
declare global {
  interface Window {
    Tawk_API?: Record<string, unknown>;
    Tawk_LoadStart?: Date;
  }
}

export function TawkChat({ enabled = true }: TawkChatProps) {
  useEffect(() => {
    if (!enabled) return;

    // Check if Tawk.to is already loaded
    if (typeof window !== 'undefined' && window.Tawk_API) {
      return;
    }

    // Initialize Tawk.to
    const Tawk_API = window.Tawk_API || {};
    const Tawk_LoadStart = new Date();

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://embed.tawk.to/68aa517a34f81b192743e669/1j3ckshvj';
    script.charset = 'UTF-8';
    script.setAttribute('crossorigin', '*');

    // Insert the script
    const firstScript = document.getElementsByTagName('script')[0];
    firstScript.parentNode?.insertBefore(script, firstScript);

    // Set up Tawk_API
    window.Tawk_API = Tawk_API;
    window.Tawk_LoadStart = Tawk_LoadStart;

    // Cleanup function
    return () => {
      // Remove the script if component unmounts
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [enabled]);

  return null; // This component doesn't render anything visible
}
