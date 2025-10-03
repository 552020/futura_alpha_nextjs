'use client';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getAuthClient } from '@/ic/ii';
import { useAuthenticatedActor } from '@/hooks/use-authenticated-actor';
import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

/**
 * Whoami Component
 *
 * Temporary debug component for testing backend connectivity.
 * Shows the principal that the canister sees as the caller.
 *
 * Note: This checks the backend connection, not the Internet Identity
 * authentication. The principal returned should match the authenticated
 * Internet Identity principal.
 */
export function Whoami() {
  const [busy, setBusy] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isRehydrating, setIsRehydrating] = useState(true);
  const [backendConnected, setBackendConnected] = useState(false);
  const { getActor } = useAuthenticatedActor();
  const { toast } = useToast();

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authClient = await getAuthClient();
        const authenticated = await authClient.isAuthenticated();
        setIsAuthenticated(authenticated);
      } catch (error) {
        logger.error('Failed to check authentication status:', undefined, {
          data: error instanceof Error ? error : undefined,
        });
        setIsAuthenticated(false);
      } finally {
        setIsRehydrating(false);
      }
    };
    checkAuth();
  }, []);

  const handleWhoami = async () => {
    if (busy) return; // UX safety: prevent double-clicks
    setBusy(true);
    try {
      const authClient = await getAuthClient();
      const isAuthenticated = await authClient.isAuthenticated();

      if (!isAuthenticated) {
        toast({
          title: 'Not Authenticated',
          description: 'Please login first to call whoami',
          variant: 'destructive',
        });
        return;
      }

      // Use cached authenticated actor
      const authenticatedActor = await getActor();
      const backendPrincipal = await authenticatedActor.whoami();

      setBackendConnected(true);
      toast({
        title: 'Connected to Backend',
        description: `Backend whoami result: ${backendPrincipal.toString()}`,
      });
    } catch (error) {
      logger.error('Whoami failed', undefined, { data: error as Error });
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Handle expired/invalid delegation
      if (
        errorMessage.includes('Invalid delegation') ||
        errorMessage.includes('expired') ||
        errorMessage.includes('401')
      ) {
        toast({
          title: 'Authentication Expired',
          description: 'Your Internet Identity session has expired. Please sign in again.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Whoami Failed',
          description: `Failed to call whoami: ${errorMessage}`,
          variant: 'destructive',
        });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={handleWhoami}
        disabled={busy || !isAuthenticated || isRehydrating}
        variant={isAuthenticated ? 'outline' : 'secondary'}
        className={!isAuthenticated ? 'opacity-50' : ''}
      >
        {busy ? 'Testing...' : 'Test Backend Connection'}
      </Button>

      <Button variant="outline" disabled className="h-10 px-4 py-2 text-sm font-medium cursor-default">
        {isRehydrating ? (
          <span className="text-gray-500">Checking...</span>
        ) : !isAuthenticated ? (
          <span className="text-orange-600">Sign in with Internet Identity to use this button</span>
        ) : backendConnected ? (
          <span className="text-green-600">Connected to Backend</span>
        ) : (
          <span className="text-blue-600">Ready to Test</span>
        )}
      </Button>
    </div>
  );
}
