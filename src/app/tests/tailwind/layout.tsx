'use client';

import '@/app/[lang]/globals.css';
import { useEffect } from 'react';

export default function TailwindTestLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    console.log('TailwindTestLayout mounted');
    console.log('Current styles loaded:', document.styleSheets);
  }, []);

  return <div className="min-h-screen bg-gray-100">{children}</div>;
}
