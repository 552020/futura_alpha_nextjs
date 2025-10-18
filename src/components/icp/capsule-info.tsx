'use client';

import { Button } from '@/components/ui/button';
import CapsuleList from '@/components/icp/capsule-list';
import { CreateCapsuleModal } from '@/components/icp/create-capsule-modal';
import { useToast } from '@/hooks/use-toast';
import { getAuthClient } from '@/ic/ii';
import { useAuthenticatedActor } from '@/hooks/use-authenticated-actor';
import { useState, useEffect, useCallback } from 'react';
import type { CapsuleInfo, CapsuleState, CapsuleError, Capsule } from '@/types/capsule';
import { getCapsuleFull } from '@/services/capsule';

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

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Track if user has a self-capsule
  const [hasSelfCapsule, setHasSelfCapsule] = useState(false);

  // Refresh trigger for capsule list
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { getActor, clearActor } = useAuthenticatedActor();
  const { toast } = useToast();

  // Shared helper functions to eliminate duplication
  const checkAuthentication = useCallback(async (): Promise<boolean> => {
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
  }, [toast]);

  const handleCapsuleOperation = useCallback(
    async (
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
    },
    [state.isLoading, toast, checkAuthentication]
  );

  const handleGetCapsuleInfo = useCallback(async () => {
    const result = await handleCapsuleOperation(
      () => getCapsuleFull(getActor, clearActor),
      'Successfully fetched your capsule information',
      'Capsule Info Retrieved'
    );

    if (result && typeof result === 'object' && 'id' in result) {
      // Check if this is a self-capsule by comparing subject to caller
      // For now, we'll assume it's a self-capsule if it exists
      // In a real implementation, we'd compare the subject to the caller's principal
      setHasSelfCapsule(true);
    } else {
      setHasSelfCapsule(false);
      toast({
        title: 'No Capsule Found',
        description: "You don't have a capsule yet. Click 'Create Capsule' to create one.",
        variant: 'destructive',
      });
    }
  }, [handleCapsuleOperation, getActor, clearActor, toast]);

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
  }, [handleGetCapsuleInfo, state.capsule, state.isLoading]); // handleGetCapsuleInfo is now stable due to useCallback

  return (
    <div className="space-y-6">
      {/* Basic Capsule Info Section */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <Button onClick={() => setIsCreateModalOpen(true)} variant="outline" className="w-40">
            Create Capsule
          </Button>
          <CreateCapsuleModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onCapsuleCreated={() => {
              setIsCreateModalOpen(false);
              setHasSelfCapsule(true); // Update state after creation
              setRefreshTrigger(prev => prev + 1); // Trigger refresh of capsule list
            }}
            hasSelfCapsule={hasSelfCapsule}
          />
        </div>

        {/* Capsule List */}
        <div className="mt-6">
          <CapsuleList refreshTrigger={refreshTrigger} />
        </div>
      </div>
    </div>
  );
}
