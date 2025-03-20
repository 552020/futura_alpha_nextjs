import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "next-auth/react";
import Header from "@/components/header";
import Footer from "@/components/footer";
import { InterfaceProvider } from "@/contexts/interface-context";
import { OnboardingProvider } from "@/contexts/onboarding-context";
import { locales } from "@/middleware";
import { notFound } from "next/navigation";
import { getDictionary, Dictionary } from "@/utils/dictionaries";
import { Toaster } from "@/components/ui/toaster";

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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden`}>
        <SessionProvider basePath="/api/auth">
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <div className="relative min-h-screen flex flex-col">
              <InterfaceProvider>
                <OnboardingProvider>
                  <Header dict={dict} lang={lang} />
                  <main className="flex-1">{children}</main>
                  <Footer dict={dict} lang={lang} />
                  <Toaster />
                </OnboardingProvider>
              </InterfaceProvider>
            </div>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
