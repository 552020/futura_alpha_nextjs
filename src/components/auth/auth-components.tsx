"use client"; // Ensure this runs on the client

import { signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { clearIiSession } from "@/ic/ii";

// Custom signOut function that ensures complete cleanup
async function handleCompleteSignOut() {
  try {
    // Clear II session cache first
    await clearIiSession();
  } catch (error) {
    // Ignore II cleanup errors - proceed with NextAuth signOut
    console.warn("II cleanup failed:", error);
  }

  // Clear NextAuth session completely
  // The JWT callback will handle Principal cleanup automatically
  await signOut({
    callbackUrl: "/",
    redirect: true,
  });
}

export function SignIn({ provider, ...props }: { provider?: string } & React.ComponentPropsWithRef<typeof Button>) {
  return (
    <Button {...props} onClick={() => signIn(provider)}>
      Sign In
    </Button>
  );
}

export function SignOut(props: React.ComponentPropsWithRef<typeof Button>) {
  return (
    <Button variant="ghost" className="w-full p-0" {...props} onClick={handleCompleteSignOut}>
      Sign Out
    </Button>
  );
}
