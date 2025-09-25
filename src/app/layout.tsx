import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './[lang]/globals.css';
import { cn } from '@/lib/utils';
import { SessionProvider } from 'next-auth/react';
import { OnboardingProvider } from '@/contexts/onboarding-context';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { InterfaceProvider } from '@/contexts/interface-context';
import { Analytics } from '@vercel/analytics/react';
import { Toaster } from '@/components/ui/toaster';
import { PostHogProvider } from '@/components/utils/posthog-provider';
import { QueryProvider } from '@/components/providers/query-provider';

// Load fonts with display: swap for better performance
const geistSans = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-sans'
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-mono'
});

// Base body classes - keep these minimal and stable
const bodyClasses = cn(
  'min-h-screen bg-background text-foreground',
  process.env.NODE_ENV === 'development' ? 'debug-screens' : ''
);

// HTML classes - include font variables and base styles
const htmlClasses = cn(
  geistSans.variable,
  geistMono.variable,
  'font-sans antialiased' // Move font-smoothing to html to ensure consistency
);

export const metadata: Metadata = {
  title: 'Futura Alpha',
  description: 'Futura Alpha Application',
};

// This is a fallback layout that will be used for non-localized routes
// The main app layout is in [lang]/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={htmlClasses}>
      <body className={bodyClasses}>
        <QueryProvider>
          <SessionProvider basePath="/api/auth">
            <PostHogProvider>
              <ThemeProvider 
                attribute="data-theme" 
                defaultTheme="system" 
                enableSystem 
                disableTransitionOnChange
              >
                <InterfaceProvider>
                  <OnboardingProvider>
                    <div className="relative flex min-h-screen flex-col">
                      <main className="flex-1">
                        {children}
                      </main>
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
    </html>
  );
}
