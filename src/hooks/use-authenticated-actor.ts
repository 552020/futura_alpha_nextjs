'use client';

import { useCallback } from 'react';
import type { BackendActor } from '@/ic/backend';
import { getAuthClient } from '@/ic/ii';
import { fatLogger } from '@/lib/logger';

/**
 * Global actor management hook
 *
 * Provides cached backend actor across all components with:
 * - Global caching to avoid recreating actors
 * - Automatic authentication checks
 * - Global clearing capability
 * - Performance optimization for expensive actor creation
 */
let globalActorRef: BackendActor | null = null;

export const useAuthenticatedActor = () => {
  /**
   * Get or create authenticated backend actor
   *
   * @returns Promise<BackendActor> - Cached or newly created actor
   * @throws Error if not authenticated
   */
  const getActor = useCallback(async (): Promise<BackendActor> => {
    // Return cached actor if available
    if (globalActorRef) {
      return globalActorRef;
    }

    try {
      // Check authentication
      const authClient = await getAuthClient();
      const isAuth = await authClient.isAuthenticated();

      if (!isAuth) {
        throw new Error('Not authenticated - please login first');
      }

      // Create new actor
      const identity = authClient.getIdentity();
      const { backendActor } = await import('@/ic/backend');
      const actor = await backendActor(identity);

      // Cache the actor globally
      globalActorRef = actor;

      fatLogger.info('Created and cached authenticated backend actor', 'fe');
      return actor;
    } catch (error) {
      fatLogger.error('Failed to get authenticated actor:', 'fe', {
        data: error instanceof Error ? error : undefined,
      });
      throw error;
    }
  }, []);

  /**
   * Clear the cached actor
   *
   * Used when user signs out to prevent stale actor usage
   */
  const clearActor = useCallback(() => {
    globalActorRef = null;
    fatLogger.info('Cleared cached authenticated backend actor', 'fe');
  }, []);

  /**
   * Check if actor is currently cached
   *
   * @returns boolean - True if actor is cached
   */
  const hasCachedActor = useCallback(() => {
    return globalActorRef !== null;
  }, []);

  return {
    getActor,
    clearActor,
    hasCachedActor,
  };
};
