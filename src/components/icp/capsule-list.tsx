'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useAuthenticatedActor } from '@/hooks/use-authenticated-actor';
import { useICPIdentity } from '@/hooks/use-icp-identity';
import { getAuthClient } from '@/ic/ii';
import {
  CapsuleInfo,
  Capsule,
  CapsuleListItem,
  adaptCapsuleHeader,
} from '@/types/capsule';
import CapsuleDisplay from '@/components/icp/capsule-display';
import { readCapsule } from '@/services/capsule';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye, Edit, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { fatLogger } from '@/lib/logger/fat-logger';

interface CapsuleListState {
  capsules: CapsuleListItem[];
  isLoading: boolean;
  error: string | null;
  selectedCapsuleId: string | null;
  selectedCapsule: Capsule | null;
  isViewingCapsule: boolean;
}

interface CapsuleListProps {
  refreshTrigger?: number; // When this changes, refresh the list
}

export default function CapsuleList({ refreshTrigger }: CapsuleListProps = {}) {
  const { data: session } = useSession();
  const { getActor, clearActor } = useAuthenticatedActor();
  const { isAuthenticated: isICPAuthenticated, isLoading: isICPLoading } =
    useICPIdentity();

  const [state, setState] = useState<CapsuleListState>({
    capsules: [],
    isLoading: false,
    error: null,
    selectedCapsuleId: null,
    selectedCapsule: null,
    isViewingCapsule: false,
  });

  const loadCapsules = useCallback(async () => {
    if (!session?.user || !isICPAuthenticated) return;

    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const actor = await getActor();
      const capsuleHeaders = await actor.capsules_list();

      // Get current user's principal for self-capsule detection
      let currentUserPrincipal: string | undefined;
      try {
        const authClient = await getAuthClient();
        const identity = await authClient.getIdentity();
        currentUserPrincipal = identity.getPrincipal().toString();
      } catch (error) {
        fatLogger.warn('Could not get current user principal', 'fe', { error });
      }

      // Convert CapsuleHeader[] to CapsuleListItem[] using adapter
      const capsules = capsuleHeaders.map((header) =>
        adaptCapsuleHeader(header, currentUserPrincipal)
      );

      setState((prev) => ({
        ...prev,
        capsules: capsules,
        isLoading: false,
      }));
    } catch (error) {
      fatLogger.error('Failed to load capsules', 'fe', { error });

      // Provide user-friendly error message based on error type
      let userMessage = 'Failed to load capsules';
      let toastMessage = 'Failed to load capsules';

      if (error instanceof Error) {
        if (
          error.message.includes('ERR_CONNECTION_REFUSED') ||
          error.message.includes('Failed to fetch')
        ) {
          userMessage =
            'Unable to connect to ICP. Please check if the local development environment is running.';
          toastMessage =
            'ICP connection failed. Please start the local development environment.';
        } else if (error.message.includes('TransportError')) {
          userMessage =
            'Network connection error. Please check your internet connection and try again.';
          toastMessage = 'Network error. Please check your connection.';
        } else {
          userMessage = `Error: ${error.message}`;
          toastMessage = 'Failed to load capsules';
        }
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: userMessage,
      }));
      toast({
        title: 'Error',
        description: toastMessage,
        variant: 'destructive',
      });
    }
  }, [session, getActor, isICPAuthenticated]);

  // Load capsules on component mount
  useEffect(() => {
    if (session?.user && !isICPLoading && isICPAuthenticated) {
      loadCapsules();
    }
  }, [session, loadCapsules, isICPAuthenticated, isICPLoading]);

  // Refresh when refreshTrigger changes
  useEffect(() => {
    if (
      refreshTrigger &&
      session?.user &&
      !isICPLoading &&
      isICPAuthenticated
    ) {
      loadCapsules();
    }
  }, [refreshTrigger, session, loadCapsules, isICPAuthenticated, isICPLoading]);

  const handleViewCapsule = async (capsuleId: string) => {
    try {
      if (state.selectedCapsuleId === capsuleId && state.isViewingCapsule) {
        // Toggle off - hide the capsule view
        setState((prev) => ({
          ...prev,
          selectedCapsuleId: null,
          selectedCapsule: null,
          isViewingCapsule: false,
        }));
      } else {
        // Toggle on - show the capsule view
        setState((prev) => ({ ...prev, isLoading: true }));

        const result = await readCapsule(capsuleId, getActor, clearActor);

        setState((prev) => ({
          ...prev,
          selectedCapsuleId: capsuleId,
          selectedCapsule: result,
          isViewingCapsule: true,
          isLoading: false,
        }));
      }
    } catch (error) {
      fatLogger.error('Failed to load capsule details', 'fe', { error });

      // Provide user-friendly error message based on error type
      let toastMessage = 'Failed to load capsule details';

      if (error instanceof Error) {
        if (
          error.message.includes('ERR_CONNECTION_REFUSED') ||
          error.message.includes('Failed to fetch')
        ) {
          toastMessage =
            'ICP connection failed. Please start the local development environment.';
        } else if (error.message.includes('TransportError')) {
          toastMessage = 'Network error. Please check your connection.';
        }
      }

      setState((prev) => ({ ...prev, isLoading: false }));
      toast({
        title: 'Error',
        description: toastMessage,
        variant: 'destructive',
      });
    }
  };

  const handleEditCapsule = (capsuleId: string) => {
    // TODO: Navigate to capsule edit view
    fatLogger.info('Edit capsule:', 'be', { capsuleId });
    toast({
      title: 'Info',
      description: 'Edit capsule functionality coming soon',
    });
  };

  const handleDeleteCapsule = (capsuleId: string) => {
    // TODO: Implement delete functionality
    fatLogger.info('Delete capsule:', 'be', { capsuleId });
    toast({
      title: 'Info',
      description: 'Delete capsule functionality coming soon',
    });
  };

  const formatStorage = (_used: bigint, _limit: bigint) => {
    // TODO: Implement proper storage formatting
    return '2.5GB / 10GB'; // Placeholder
  };

  const formatLifetime = (_expiresAt: bigint) => {
    // TODO: Implement proper lifetime formatting
    return '2029'; // Placeholder
  };

  const convertCapsuleToCapsuleInfo = (capsule: Capsule): CapsuleInfo => {
    // For now, we'll use simplified logic since we don't have the current user's principal
    // In a real implementation, you'd get the current user's principal from the session

    return {
      capsule_id: capsule.id,
      subject: capsule.subject,
      is_owner: capsule.owners.length > 0, // Simplified: if there are owners, assume current user is one
      is_controller: capsule.controllers.length > 0, // Simplified: if there are controllers, assume current user is one
      is_self_capsule: false, // This would need proper logic to determine if it's a self-capsule
      bound_to_neon: capsule.bound_to_neon,
      created_at: capsule.created_at,
      updated_at: capsule.updated_at,
      memory_count: BigInt(capsule.memories.length),
      gallery_count: BigInt(capsule.galleries.length),
      connection_count: BigInt(capsule.connections.length),
    };
  };

  if (!session?.user) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            Please sign in to view your capsules.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Show loading state while checking ICP authentication
  if (isICPLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Checking authentication...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show message if not authenticated with Internet Identity
  if (!isICPAuthenticated) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-muted-foreground">
              Please connect your Internet Identity to view capsules.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (state.isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading capsules...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (state.error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-destructive mb-4">{state.error}</p>
            <Button onClick={loadCapsules} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (state.capsules.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-muted-foreground">No capsules found.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Capsules</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Web2 Link</TableHead>
              <TableHead>Storage</TableHead>
              <TableHead>Memories</TableHead>
              <TableHead>Galleries</TableHead>
              <TableHead>Connections</TableHead>
              <TableHead>Space</TableHead>
              <TableHead>Lifetime</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.capsules.map((capsule) => (
              <TableRow key={capsule.id}>
                <TableCell>
                  {capsule.isSelfCapsule
                    ? 'You'
                    : `Other: ${'Opaque' in capsule.subject ? capsule.subject.Opaque : 'Unknown'}`}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {capsule.isOwner
                      ? 'Owner'
                      : capsule.isController
                        ? 'Controller'
                        : 'None'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={capsule.boundToNeon ? 'default' : 'outline'}>
                    {capsule.boundToNeon ? 'Connected' : 'ICP Only'}
                  </Badge>
                </TableCell>
                <TableCell>Shared</TableCell>
                <TableCell>{capsule.memoryCount.toString()}</TableCell>
                <TableCell>{capsule.galleryCount.toString()}</TableCell>
                <TableCell>{capsule.connectionCount.toString()}</TableCell>
                <TableCell>{formatStorage(BigInt(0), BigInt(0))}</TableCell>
                <TableCell>{formatLifetime(BigInt(0))}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={
                        state.selectedCapsuleId === capsule.id &&
                        state.isViewingCapsule
                          ? 'default'
                          : 'outline'
                      }
                      onClick={() => handleViewCapsule(capsule.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditCapsule(capsule.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteCapsule(capsule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      {/* Capsule Display - shown when a capsule is selected */}
      {state.isViewingCapsule && state.selectedCapsule && (
        <div className="mt-6">
          <CapsuleDisplay
            capsuleInfo={convertCapsuleToCapsuleInfo(state.selectedCapsule)}
            isLoading={state.isLoading}
            onCreateCapsule={() => {}} // Not needed in this context
          />
        </div>
      )}
    </Card>
  );
}
