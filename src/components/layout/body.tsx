'use client';

import { Dictionary } from '@/utils/dictionaries';
import { cn } from '@/lib/utils';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { InterfaceProvider } from '@/contexts/interface-context';
import { OnboardingProvider } from '@/contexts/onboarding-context';
import Header from './header';
import BottomNav from './bottom-nav';
import Sidebar from './sidebar';
import { Toaster } from '@/components/ui/toaster';
import Footer from './footer';
import { Analytics } from '@vercel/analytics/react';
import { PostHogProvider } from '@/components/utils/posthog-provider';
import { QueryProvider } from '@/components/providers/query-provider';

type BodyProps = {
  children: React.ReactNode;
  dict: Dictionary;
  lang: string;
};

export function Body({ children, dict, lang }: BodyProps) {
  return (
    <body className={cn(
      'min-h-screen bg-background font-sans antialiased text-foreground',
      process.env.NODE_ENV === 'development' ? 'debug-screens' : ''
    )}>
      <QueryProvider>
        <SessionProvider basePath="/api/auth">
          <PostHogProvider>
            <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem disableTransitionOnChange>
              <InterfaceProvider>
                <OnboardingProvider>
                  <div className="relative flex min-h-screen flex-col">
                    <Header dict={dict} lang={lang} />
                    <BottomNav dict={dict} />
                    <div className="flex flex-1">
                      <Sidebar dict={dict} />
                      <main className="flex-1">{children}</main>
                    </div>
                    <Footer dict={dict} />
                  </div>
                  <Toaster />
                  <Analytics />
                </OnboardingProvider>
              </InterfaceProvider>
            </ThemeProvider>
          </PostHogProvider>
        </SessionProvider>
      </QueryProvider>
    </body>
  );
}
