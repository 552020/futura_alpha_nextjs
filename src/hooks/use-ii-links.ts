"use client";
import { useCallback, useState } from "react";
import { useSession } from "next-auth/react";

/**
 * Primary hook for managing Internet Identity links.
 * 
 * This hook provides a simplified interface for managing linked II principals
 * without the complexity of TTL monitoring or "active" state management.
 * 
 * @returns Object containing linked principals state and actions
 */
export function useIILinks() {
  const { data: session, update, status } = useSession();
  const linked = session?.user?.linkedIcPrincipals ?? [];
  const hasLinkedII = linked.length > 0;

  const linkII = useCallback(
    async (principal: string) => {
      const res = await fetch("/api/auth/ii/link", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ principal }),
      });
      if (!res.ok) throw new Error("Link failed");
      const { linkedIcPrincipals } = await res.json();
      await update({ linkedIcPrincipals });
    },
    [update]
  );

  const unlinkII = useCallback(
    async (principal: string) => {
      const res = await fetch("/api/auth/ii/unlink", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ principal }),
      });
      if (!res.ok) throw new Error("Unlink failed");
      const { linkedIcPrincipals } = await res.json();
      await update({ linkedIcPrincipals });
    },
    [update]
  );

  const refreshLinks = useCallback(async () => {
    const res = await fetch("/api/auth/ii/linked");
    if (!res.ok) throw new Error("Refresh failed");
    const { linkedIcPrincipals } = await res.json();
    await update({ linkedIcPrincipals });
  }, [update]);

  return { 
    status, 
    hasLinkedII, 
    linkedIcPrincipals: linked, 
    linkII, 
    unlinkII, 
    refreshLinks 
  };
}

/**
 * Hook for checking if II links are required for specific actions.
 * 
 * @param action - The action to check requirements for
 * @returns Object containing requirement status and blocking information
 */
export function useIILinksRequired(action: string) {
  const { hasLinkedII } = useIILinks();
  const requires = ["create-gallery-forever", "upload-to-icp", "sync-to-icp", "icp-storage-operation"].includes(action);
  return { 
    requires, 
    canProceed: !requires || hasLinkedII, 
    blocked: requires && !hasLinkedII 
  };
}

/**
 * Hook for managing link/unlink operations with loading and error states.
 * 
 * @returns Object containing loading states, error handling, and wrapped actions
 */
export function useIILinksFlow() {
  const { linkII, unlinkII } = useIILinks();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLinkII = useCallback(
    async (principal: string) => {
      setLoading(true);
      setError(null);
      try {
        await linkII(principal);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Link failed");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [linkII]
  );

  const handleUnlinkII = useCallback(
    async (principal: string) => {
      setLoading(true);
      setError(null);
      try {
        await unlinkII(principal);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unlink failed");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [unlinkII]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    linkII: handleLinkII,
    unlinkII: handleUnlinkII,
    clearError,
  };
}
