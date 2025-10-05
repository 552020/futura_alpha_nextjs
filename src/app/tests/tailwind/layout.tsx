'use client';

import '@/app/[lang]/globals.css';
import { useEffect } from 'react';

import { logger } from '@/lib/logger';
export default function TailwindTestLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    logger.info('TailwindTestLayout mounted');
    logger.info('Current styles loaded:', undefined, { styleSheets: document.styleSheets });
  }, []);

  return <div className="min-h-screen bg-gray-100">{children}</div>;
}
