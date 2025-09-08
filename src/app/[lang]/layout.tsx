import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SessionProvider } from "next-auth/react";
import Header from "@/components/layout/header";
import { InterfaceProvider } from "@/contexts/interface-context";
import { locales } from "@/middleware";
import { notFound } from "next/navigation";
import { getDictionary, Dictionary } from "@/utils/dictionaries";
import { PostHogProvider } from "@/components/utils/posthog-provider";
import BottomNav from "@/components/layout/bottom-nav";
import Sidebar from "@/components/layout/sidebar";
import { OnboardingProvider } from "@/contexts/onboarding-context";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "@/components/ui/toaster";
import Footer from "@/components/layout/footer";
import { QueryProvider } from "@/components/providers/query-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Dynamic metadata based on the current language
export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  // Await the params Promise
  const resolvedParams = await params;

  // Get the dictionary for the current language
  const dict: Dictionary = await getDictionary(resolvedParams.lang);

  // Check for missing translations and log warnings in development
  if (process.env.NODE_ENV === "development") {
    if (!dict?.metadata?.title) {
      console.warn(
        `[i18n] Missing translation for "metadata.title" in locale "${resolvedParams.lang}". Using fallback: "Futura"`
      );
    }
    if (!dict?.metadata?.description) {
      console.warn(
        `[i18n] Missing translation for "metadata.description" in locale "${resolvedParams.lang}". Using fallback: "Live forever. Now."`
      );
    }
  }

  return {
    title: dict?.metadata?.title || "Futura",
    description: dict?.metadata?.description || "Live forever. Now.",
    openGraph: {
      title: dict?.metadata?.title || "Futura",
      description: dict?.metadata?.description || "Live forever. Now.",
      locale: resolvedParams.lang,
    },
  };
}

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  // Await the params Promise
  const resolvedParams = await params;
  const lang = resolvedParams.lang;

  // Check if the language is supported
  if (!locales.includes(lang)) {
    notFound();
  }

  // Load the dictionary for the current language
  const dict = await getDictionary(lang);

  return (
    <html lang={lang} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <QueryProvider>
          <SessionProvider basePath="/api/auth">
            <PostHogProvider>
              <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
                <InterfaceProvider>
                  <OnboardingProvider>
                    <div className="relative flex min-h-screen flex-col">
                      <Header dict={dict} lang={resolvedParams.lang} />
                      <BottomNav dict={dict} />
                      <div className="flex flex-1">
                        <Sidebar dict={dict} />
                        <main className="flex-1">{children}</main>
                      </div>
                    </div>
                    <Footer dict={dict} lang={lang} />
                    <Toaster />
                  </OnboardingProvider>
                </InterfaceProvider>
              </ThemeProvider>
            </PostHogProvider>
          </SessionProvider>
        </QueryProvider>
        <Analytics />
      </body>
    </html>
  );
}
