"use client";

import "@/app/[lang]/globals.css";
import { SessionProvider } from "next-auth/react";
import { PostHogProvider } from "@/components/utils/posthog-provider";

export default function TestsLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <PostHogProvider>{children}</PostHogProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
