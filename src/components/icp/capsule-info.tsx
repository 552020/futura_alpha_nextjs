'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getAuthClient } from '@/ic/ii';
import { useAuthenticatedActor } from '@/hooks/use-authenticated-actor';
import { useState, useMemo } from 'react';
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

        {/* Capsule Information Display */}
        <Card>
          <CardHeader>
            <CardTitle>Your Capsule Information</CardTitle>
          </CardHeader>
          <CardContent>
            {capsuleInfo ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Capsule ID</Label>
                    <p className="text-sm text-muted-foreground font-mono">{capsuleInfo.capsule_id}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Subject</Label>
                    <p className="text-sm text-muted-foreground">
                      {'Principal' in capsuleInfo.subject
                        ? `Principal: ${capsuleInfo.subject.Principal}`
                        : `Opaque: ${capsuleInfo.subject.Opaque}`}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Is Owner</Label>
                    <p className="text-sm text-muted-foreground">{capsuleInfo.is_owner ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Is Controller</Label>
                    <p className="text-sm text-muted-foreground">{capsuleInfo.is_controller ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Is Self Capsule</Label>
                    <p className="text-sm text-muted-foreground">{capsuleInfo.is_self_capsule ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Bound to Neon</Label>
                    <p className="text-sm text-muted-foreground">{capsuleInfo.bound_to_neon ? 'Yes' : 'No'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Created At</Label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(Number(capsuleInfo.created_at) / 1000000).toLocaleString('en-US')}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Updated At</Label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(Number(capsuleInfo.updated_at) / 1000000).toLocaleString('en-US')}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground">
                  No capsule found. Click &quot;Get Capsule Info&quot; to retrieve your capsule information.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
