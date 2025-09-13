import { useSession } from "next-auth/react";
import { useOnboarding } from "@/contexts/onboarding-context";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";

export function useAuthGuard() {
  const { data: session, status } = useSession();
  const { userData } = useOnboarding();
  const router = useRouter();
  const params = useParams();
  const lang = params.lang || "en";

  const isAuthenticated = status === "authenticated" && session?.user?.id;
  const isTemporaryUser = userData.allUserId && userData.isTemporary;
  const isLoading = status === "loading";

  const redirectToSignIn = () => {
    if (!isLoading && !isAuthenticated && !isTemporaryUser) {
      router.push(`/${lang}/signin`);
    }
  };

  const isAuthorized = isAuthenticated || isTemporaryUser || isLoading;

  return {
    isAuthorized,
    isAuthenticated,
    isTemporaryUser,
    isLoading,
    userId: isAuthenticated ? session?.user?.id : userData.allUserId,
    redirectToSignIn,
  };
}
