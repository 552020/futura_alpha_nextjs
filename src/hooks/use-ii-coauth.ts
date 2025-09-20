/**
 * II Co-Auth React Hook
 *
 * Provides React hooks and utilities for managing II co-auth state,
 * TTL monitoring, and co-auth actions.
 */

import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';
import { checkIICoAuthTTL, requiresIIReAuth } from '@/lib/ii-coauth-ttl';

// Extended session user interface for II co-auth
interface ExtendedSessionUser {
  linkedIcPrincipal?: string;
  icpPrincipal?: string;
  icpPrincipalAssertedAt?: number;
  loginProvider?: string;
}

/**
 * II Co-Auth State
 */
export interface IICoAuthState {
  // Account status
  hasLinkedII: boolean;
  isCoAuthActive: boolean;

  // Principal information
  linkedIcPrincipal?: string;
  activeIcPrincipal?: string;
  assertedAt?: number;
  loginProvider?: string;

  // TTL status
  ttlStatus: ReturnType<typeof checkIICoAuthTTL>;
  isExpired: boolean;
  isInGracePeriod: boolean;
  isWarning: boolean;
  requiresReAuth: boolean;

  // UI helpers
  statusMessage: string;
  statusClass: string;
  remainingMinutes: number;

  // Actions
  activateII: (principal: string) => Promise<void>;
  disconnectII: () => Promise<void>;
  refreshTTL: () => void;
}

/**
 * Hook for managing II co-auth state and actions
 * @returns II co-auth state and actions
 */
export function useIICoAuth(): IICoAuthState {
  const { data: session, update } = useSession();
  const [ttlStatus, setTtlStatus] = useState(() => checkIICoAuthTTL());

  // Extract II co-auth information from session
  const linkedIcPrincipal = (session?.user as ExtendedSessionUser)?.linkedIcPrincipal;
  const activeIcPrincipal = (session?.user as ExtendedSessionUser)?.icpPrincipal;
  const assertedAt = (session?.user as ExtendedSessionUser)?.icpPrincipalAssertedAt;
  const loginProvider = (session?.user as ExtendedSessionUser)?.loginProvider;

  // Compute derived state
  const hasLinkedII = !!linkedIcPrincipal;
  const isCoAuthActive = !!activeIcPrincipal && !!assertedAt;

  // Update TTL status when assertedAt changes
  useEffect(() => {
    if (assertedAt) {
      setTtlStatus(checkIICoAuthTTL(assertedAt));
    } else {
      setTtlStatus(checkIICoAuthTTL());
    }
  }, [assertedAt]);

  // Auto-refresh TTL every minute when co-auth is active
  useEffect(() => {
    if (!isCoAuthActive) return;

    const interval = setInterval(() => {
      setTtlStatus(checkIICoAuthTTL(assertedAt));
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, [isCoAuthActive, assertedAt]);

  // Activate II co-auth
  const activateII = useCallback(
    async (principal: string) => {
      try {
        await update({ activeIcPrincipal: principal });
      } catch (error) {
        console.error('Failed to activate II co-auth:', error);
        throw error;
      }
    },
    [update]
  );

  // Disconnect II co-auth for this session
  const disconnectII = useCallback(async () => {
    try {
      await update({ clearActiveIc: true });
    } catch (error) {
      console.error('Failed to disconnect II co-auth:', error);
      throw error;
    }
  }, [update]);

  // Manual TTL refresh
  const refreshTTL = useCallback(() => {
    setTtlStatus(checkIICoAuthTTL(assertedAt));
  }, [assertedAt]);

  // Compute final state
  const isExpired = ttlStatus.isExpired;
  const isInGracePeriod = ttlStatus.isInGracePeriod;
  const isWarning = ttlStatus.isWarning;
  const requiresReAuth = requiresIIReAuth(assertedAt);

  return {
    // Account status
    hasLinkedII,
    isCoAuthActive,

    // Principal information
    linkedIcPrincipal,
    activeIcPrincipal,
    assertedAt,
    loginProvider,

    // TTL status
    ttlStatus,
    isExpired,
    isInGracePeriod,
    isWarning,
    requiresReAuth,

    // UI helpers
    statusMessage:
      ttlStatus.status === 'active'
        ? `II Active (${ttlStatus.remainingMinutes}m remaining)`
        : ttlStatus.status === 'grace'
          ? `II Expired (${ttlStatus.remainingMinutes}m grace period)`
          : ttlStatus.status === 'warning'
            ? `II Expiring Soon (${ttlStatus.remainingMinutes}m remaining)`
            : ttlStatus.status === 'expired'
              ? 'II Expired - Re-authenticate Required'
              : 'II Not Active',
    statusClass:
      ttlStatus.status === 'active'
        ? 'text-green-600'
        : ttlStatus.status === 'grace'
          ? 'text-orange-600'
          : ttlStatus.status === 'warning'
            ? 'text-yellow-600'
            : ttlStatus.status === 'expired'
              ? 'text-red-600'
              : 'text-gray-500',
    remainingMinutes: ttlStatus.remainingMinutes,

    // Actions
    activateII,
    disconnectII,
    refreshTTL,
  };
}

/**
 * Hook for checking if II co-auth is required for a specific action
 * @param action - The action being performed
 * @returns Whether II co-auth is required and current status
 */
export function useIICoAuthRequired(action: string) {
  const coAuthState = useIICoAuth();

  // Define which actions require II co-auth
  const requiresIICoAuth = ['create-gallery-forever', 'upload-to-icp', 'sync-to-icp', 'icp-storage-operation'].includes(
    action
  );

  return {
    ...coAuthState,
    requiresIICoAuth,
    canProceed: !requiresIICoAuth || coAuthState.isCoAuthActive,
    actionBlocked: requiresIICoAuth && !coAuthState.isCoAuthActive,
  };
}

/**
 * Hook for managing II co-auth activation flow
 * @returns Activation flow state and actions
 */
export function useIIActivationFlow() {
  const [isActivating, setIsActivating] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const coAuthState = useIICoAuth();

  const activateII = useCallback(
    async (principal: string) => {
      setIsActivating(true);
      setActivationError(null);

      try {
        await coAuthState.activateII(principal);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to activate II';
        setActivationError(errorMessage);
        throw error;
      } finally {
        setIsActivating(false);
      }
    },
    [coAuthState]
  );

  return {
    ...coAuthState,
    isActivating,
    activationError,
    activateII,
    clearError: () => setActivationError(null),
  };
}
