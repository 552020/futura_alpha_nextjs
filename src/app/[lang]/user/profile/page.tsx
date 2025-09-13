"use client";

// this page is necessary to redirect to the correct profile page

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import RequireAuth from "@/components/auth/require-auth";

export default function ProfileRedirect() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const lang = params.lang || "en";

  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      router.replace(`/${lang}/user/${session.user.id}/profile`);
    }
  }, [status, session, router, lang]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent mx-auto"></div>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <RequireAuth />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Redirecting to your profile...</h1>
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent mx-auto"></div>
      </div>
    </div>
  );
}
