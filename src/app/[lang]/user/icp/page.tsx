'use client';

import { useAuthGuard } from '@/utils/authentication';
import { useSession } from 'next-auth/react';

import { useState, useEffect } from 'react';

// Prevent static generation of this page
export const dynamic = 'force-dynamic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAuthClient as getIiAuthClient } from '@/ic/ii';
import RequireAuth from '@/components/auth/require-auth';
import { InternetIdentityManagement } from '@/components/user/internet-identity-management';
import { Whoami } from '@/components/icp/whoami';
import { Greeting } from '@/components/icp/greeting';
import { CapsuleInfo } from '@/components/icp/capsule-info';

import { logger } from '@/lib/logger';

export default function ICPPage() {
  const { isAuthorized, isLoading } = useAuthGuard();
  const { data: _session } = useSession();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [principalId, setPrincipalId] = useState('');
  const { toast } = useToast();

  // Sync local state with session changes
  useEffect(() => {
    if (_session?.user) {
      const user = _session.user as { icpPrincipal?: string };
      if (user.icpPrincipal) {
        setPrincipalId(user.icpPrincipal);
        setIsAuthenticated(true);
      }
    }
  }, [_session]);

  /**
   * AuthClient Persistence Optimization
   *
   * Problem: AuthClient.create() reads from IndexedDB every time it's called.
   * When called multiple times (login, whoami, logout, auth check), this causes:
   * - Multiple expensive IndexedDB reads
   * - Potential race conditions with concurrent reads
   * - Popup conflicts when multiple AuthClient instances exist
   *
   * Solution: Create AuthClient once and reuse the same instance.
   * The AuthClient internally manages the IndexedDB state and identity,
   * so we only need one instance per component lifecycle.
   *
   * What we're persisting:
   * - The AuthClient object (in React component memory via useRef)
   * - NOT the identity itself (that's still stored in browser IndexedDB by AuthClient)
   *
   * The AuthClient.create() still reads the stored identity from IndexedDB,
   * but we only do this expensive operation once instead of 4+ times.
   */

  // Helper to obtain the shared II AuthClient instance
  const getAuthClient = async () => getIiAuthClient();

  // Copy principal ID to clipboard
  const copyPrincipalToClipboard = async () => {
    if (principalId) {
      try {
        await navigator.clipboard.writeText(principalId);
        toast({
          title: 'Copied!',
          description: 'Principal ID copied to clipboard',
        });
      } catch (error) {
        logger.error('Failed to copy', undefined, { data: error as Error });
        toast({
          title: 'Copy Failed',
          description: 'Failed to copy principal ID to clipboard',
          variant: 'destructive',
        });
      }
    }
  };

  // Check authentication state on mount to persist across page reloads
  useEffect(() => {
    async function checkAuthState() {
      try {
        const authClient = await getAuthClient();
        const isAuth = await authClient.isAuthenticated();

        if (isAuth) {
          setIsAuthenticated(true);

          // Get the user's principal
          const identity = authClient.getIdentity();
          const principal = identity.getPrincipal();
          setPrincipalId(principal.toString());

          // Note: Actor rehydration is now handled by the global useAuthenticatedActor hook
        }
      } catch (error) {
        logger.error('Failed to check auth state', undefined, { data: error as Error });
        // Don't show toast on mount errors - just log them
      } finally {
        // Authentication check complete
      }
    }

    checkAuthState();
  }, []);

  if (!isAuthorized || isLoading) {
    // Show loading spinner only while status is loading
    if (isLoading) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-800 dark:border-gray-700 dark:border-t-gray-200" />
        </div>
      );
    }

    // Show access denied for unauthenticated users
    return <RequireAuth />;
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold mb-6">Hello ICP</h1>

      {/* Internet Identity Management - Unified Component */}
      <div className="mb-6">
        <InternetIdentityManagement />
      </div>

      <Whoami />

      <div className="my-6">
        <Greeting />
      </div>

      <div className="my-6">
        <CapsuleInfo />
      </div>

      {/* Principal ID Display */}
      {isAuthenticated && principalId && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Your Internet Identity Principal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input
                value={principalId}
                readOnly
                className="font-mono text-sm"
                onClick={e => e.currentTarget.select()}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyPrincipalToClipboard}
                disabled={false}
                title="Copy to clipboard"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
