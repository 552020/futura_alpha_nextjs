'use client';

import { cn } from '@/lib/utils';
import { useEffect } from 'react';

export function ClientBody({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Ensure the body has the correct class on mount
    document.body.className = cn(
      'min-h-screen bg-background font-sans antialiased text-foreground',
      process.env.NODE_ENV === 'development' ? 'debug-screens' : ''
    );
  }, []);

  return <>{children}</>;
}
