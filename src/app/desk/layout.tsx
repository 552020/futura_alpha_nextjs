import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { deskAccess } from '@/lib/desk-auth';
import '@/app/[lang]/globals.css';
import './desk.css';

export const metadata: Metadata = {
  title: { default: 'Desk · Futura', template: '%s · Desk · Futura' },
  robots: { index: false, follow: false },
};

// Separate root layout: the working desk, admins only, always light.
export default async function DeskLayout({
  children,
}: {
  children: ReactNode;
}) {
  const access = await deskAccess();
  if (access === 'anonymous') redirect('/en/signin?callbackUrl=%2Fdesk');
  if (access === 'forbidden') notFound();
  return (
    <html lang="en" data-theme="light">
      <body className="min-h-screen bg-white text-sm text-black">
        <header className="flex items-center gap-4 border-b border-black/10 px-4 py-3 sm:px-8">
          <Link href="/desk" className="font-semibold">
            Desk
          </Link>
          <Link href="/en" className="text-black/60 hover:text-black">
            Futura
          </Link>
          <Link href="/en/user/icp" className="text-black/60 hover:text-black">
            ICP
          </Link>
        </header>
        {children}
      </body>
    </html>
  );
}
