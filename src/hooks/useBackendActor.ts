'use client';

import { useCallback } from 'react';
import type { BackendActor } from '@/ic/backend';
import type { Identity } from '@dfinity/agent';

/**
 * Client-only hook for creating backend actors
 * Uses dynamic imports to prevent server-side execution
 */
export function useBackendActor() {
  const createActor = useCallback(async (identity?: Identity): Promise<BackendActor> => {
    const { backendActor } = await import('@/ic/backend');
    return backendActor(identity);
  }, []);

  return { createActor };
}
