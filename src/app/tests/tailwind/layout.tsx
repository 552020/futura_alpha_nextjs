'use client';

import '@/app/[lang]/globals.css';
import { useEffect } from 'react';

import { fatLogger } from '@/lib/logger';
export default function TailwindTestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    fatLogger.info('TailwindTestLayout mounted', 'fe');
    fatLogger.info('Current styles loaded:', 'fe', {
      styleSheets: document.styleSheets,
    });
  }, []);

  return <div className="min-h-screen bg-gray-100">{children}</div>;
}
