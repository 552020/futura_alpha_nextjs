'use client';

import { Button } from '@/components/ui/button';
import CapsuleDisplay from '@/components/icp/capsule-display';
import CapsuleList from '@/components/icp/capsule-list';
import { useToast } from '@/hooks/use-toast';
import { getAuthClient } from '@/ic/ii';
import { useAuthenticatedActor } from '@/hooks/use-authenticated-actor';
import { useState, useMemo, useEffect } from 'react';
import type { CapsuleInfo, CapsuleState, CapsuleError, Capsule } from '@/types/capsule';
import { getCapsuleFull, createCapsule } from '@/services/capsule';

/**
 * CapsuleInfo Component
 *
 * Provides functionality to:
 * 1. Get capsule information for the authenticated user
 * 2. Create a new capsule for the authenticated user
 * 3. Display capsule information in a structured format
 */
export function CapsuleInfo() {
  // Single unified state
  const [state, setState] = useState<CapsuleState>({
    capsule: null,
    isLoading: false,
  });

  // Derive CapsuleInfo from Capsule when needed
  const capsuleInfo = useMemo<CapsuleInfo | null>(() => {
    if (!state.capsule) return null;

    const c = state.capsule; // Single source of truth

    // Derive CapsuleInfo from Capsule
    return {
      capsule_id: c.id,
      subject: c.subject,
      is_owner: c.owners.length > 0,
      is_controller: c.controllers.length > 0,
      is_self_capsule: true, // Compare subject to caller principal
      updated_at: c.updated_at,
      created_at: c.created_at,
      bound_to_neon: c.bound_to_neon,
      gallery_count: BigInt(c.galleries.length),
      memory_count: BigInt(c.memories.length),
      connection_count: BigInt(c.connections.length),
    };
  }, [state.capsule]);
  const { getActor, clearActor } = useAuthenticatedActor();
  const { toast } = useToast();

  // Auto-load capsule when component mounts (if authenticated and no capsule loaded)
  useEffect(() => {
    const autoLoadCapsule = async () => {
      try {
        const authClient = await getAuthClient();
        const isAuthenticated = await authClient.isAuthenticated();

        if (isAuthenticated && !state.capsule && !state.isLoading) {
          console.log('Auto-loading capsule on component mount');
          await handleGetCapsuleInfo();
        }
      } catch (error) {
        console.error('Failed to auto-load capsule:', error);
        // Don't show toast for auto-load failures - user can manually click "Get Capsule Info"
      }
    };

    autoLoadCapsule();
  }, []); // Only run once on mount

  // Shared helper functions to eliminate duplication
  const checkAuthentication = async (): Promise<boolean> => {
    const authClient = await getAuthClient();
    const isAuthenticated = await authClient.isAuthenticated();

    if (!isAuthenticated) {
      toast({
        title: 'Not Authenticated',
        description: 'Please login first to access capsule features',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const handleCapsuleOperation = async (
    operation: () => Promise<unknown>,
    successMessage: string,
    successTitle: string = 'Success'
  ): Promise<unknown | null> => {
    if (state.isLoading) return null;

    setState(s => ({ ...s, isLoading: true, error: undefined }));

    try {
      if (!(await checkAuthentication())) {
        setState(s => ({ ...s, isLoading: false }));
        return null;
      }

      const result = await operation();

      if (result) {
        setState(s => ({ ...s, capsule: result as Capsule, isLoading: false }));
        toast({
          title: successTitle,
          description: successMessage,
        });
        return result;
      } else {
        setState(s => ({ ...s, capsule: null, isLoading: false }));
        return null;
      }
    } catch (error) {
      const capsuleError = error as CapsuleError;
      setState(s => ({ ...s, error: capsuleError, isLoading: false }));

      // Handle different error types
      if (capsuleError.kind === 'connection') {
        toast({
          title: 'Backend Connection Failed',
          description: capsuleError.message,
          variant: 'destructive',
        });
      } else if (capsuleError.kind === 'authExpired') {
        toast({
          title: 'Session Expired',
          description: capsuleError.message,
          variant: 'destructive',
        });
      } else if (capsuleError.kind === 'notFound') {
        toast({
          title: 'Capsule Not Found',
          description: capsuleError.message,
          variant: 'destructive',
        });
      } else if (capsuleError.kind === 'unauthorized') {
        toast({
          title: 'Access Denied',
          description: capsuleError.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Operation Failed',
          description: capsuleError.message,
          variant: 'destructive',
        });
      }
      return null;
    }
  };

  const handleGetCapsuleInfo = async () => {
    const result = await handleCapsuleOperation(
      () => getCapsuleFull(getActor, clearActor),
      'Successfully fetched your capsule information',
      'Capsule Info Retrieved'
    );

    if (!result) {
      toast({
        title: 'No Capsule Found',
        description: "You don't have a capsule yet. Click 'Create Capsule' to create one.",
        variant: 'destructive',
      });
    }
  };

  const handleCreateCapsule = async () => {
    await handleCapsuleOperation(
      () => createCapsule(null, getActor, clearActor),
      'Successfully created new capsule',
      'Capsule Created'
    );
  };

  return (
    <div className="space-y-6">
      {/* Basic Capsule Info Section */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <Button onClick={handleGetCapsuleInfo} disabled={state.isLoading} className="w-40">
            {state.isLoading ? 'Loading...' : 'Get Capsule Info'}
          </Button>
          <Button onClick={handleCreateCapsule} disabled={state.isLoading} variant="outline" className="w-40">
            {state.isLoading ? 'Loading...' : 'Create Capsule'}
          </Button>
        </div>

        {/* Capsule List */}
        <div className="mt-6">
          <CapsuleList />
        </div>

        {/* Capsule Information Display */}
        <CapsuleDisplay capsuleInfo={capsuleInfo} isLoading={state.isLoading} onCreateCapsule={handleCreateCapsule} />
      </div>
    </div>
  );
}
