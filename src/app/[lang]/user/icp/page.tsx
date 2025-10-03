'use client';

import { useAuthGuard } from '@/utils/authentication';
import { useSession } from 'next-auth/react';

import { useState, useEffect } from 'react';
import type { CapsuleInfo, Capsule } from '@/ic/declarations/backend/backend.did';

// Prevent static generation of this page
export const dynamic = 'force-dynamic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAuthClient as getIiAuthClient } from '@/ic/ii';
import { useAuthenticatedActor } from '@/hooks/use-authenticated-actor';
import RequireAuth from '@/components/auth/require-auth';
import { InternetIdentityManagement } from '@/components/user/internet-identity-management';
import { Whoami } from '@/components/icp/whoami';
import { Greeting } from '@/components/icp/greeting';

import { logger } from '@/lib/logger';

export default function ICPPage() {
  const { isAuthorized, isLoading } = useAuthGuard();
  const { data: _session } = useSession();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [principalId, setPrincipalId] = useState('');
  const [capsuleInfo, setCapsuleInfo] = useState<CapsuleInfo | null>(null);
  const [capsuleReadResult, setCapsuleReadResult] = useState<Capsule | null>(null);
  const [capsuleIdInput, setCapsuleIdInput] = useState('');
  // UX safety: prevents double-clicks and provides visual feedback
  const [busy, setBusy] = useState(false);
  const [isRehydrating, setIsRehydrating] = useState(true);
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
  // Use global authenticated actor hook
  const { getActor: getAuthenticatedActor, clearActor: clearAuthenticatedActor } = useAuthenticatedActor();

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
        setIsRehydrating(false);
      }
    }

    checkAuthState();
  }, []);

  async function handleGetCapsuleInfo() {
    if (busy) return; // UX safety: prevent double-clicks
    setBusy(true);
    try {
      const authClient = await getAuthClient();
      const isAuthenticated = await authClient.isAuthenticated();

      if (!isAuthenticated) {
        toast({
          title: 'Not Authenticated',
          description: 'Please login first to get capsule info',
          variant: 'destructive',
        });
        return;
      }

      // Use cached authenticated actor
      const authenticatedActor = await getAuthenticatedActor();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const capsuleResult = (await authenticatedActor.capsules_read_basic([])) as { Ok: any } | { Err: any };

      if ('Ok' in capsuleResult) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setCapsuleInfo((capsuleResult as { Ok: any }).Ok);
        toast({
          title: 'Capsule Info Retrieved',
          description: 'Successfully fetched your capsule information',
        });
      } else {
        setCapsuleInfo(null);
        toast({
          title: 'No Capsule Found',
          description: "You don't have a capsule yet. Register to create one.",
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Get capsule info failed', undefined, { data: error as Error });
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Handle expired/invalid delegation
      if (
        errorMessage.includes('Invalid delegation') ||
        errorMessage.includes('expired') ||
        errorMessage.includes('401')
      ) {
        setIsAuthenticated(false);
        setPrincipalId('');
        clearAuthenticatedActor();
        toast({
          title: 'Session Expired',
          description: 'Your session has expired. Please sign in again.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Get Capsule Info Failed',
        description: `Failed to get capsule info: ${errorMessage}`,
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleReadCapsule() {
    if (busy) return; // UX safety: prevent double-clicks
    if (!capsuleIdInput.trim()) {
      toast({
        title: 'Input Required',
        description: 'Please enter a capsule ID',
        variant: 'destructive',
      });
      return;
    }

    setBusy(true);
    try {
      const authClient = await getAuthClient();
      const isAuthenticated = await authClient.isAuthenticated();

      if (!isAuthenticated) {
        toast({
          title: 'Not Authenticated',
          description: 'Please login first to read capsule',
          variant: 'destructive',
        });
        return;
      }

      // Use cached authenticated actor
      const authenticatedActor = await getAuthenticatedActor();
      const capsuleResult = (await authenticatedActor.capsules_read_full([capsuleIdInput.trim()])) as {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Ok: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Err: any;
      };

      if ('Ok' in capsuleResult) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setCapsuleReadResult((capsuleResult as { Ok: any }).Ok);
        toast({
          title: 'Capsule Retrieved',
          description: 'Successfully fetched capsule data',
        });
      } else {
        setCapsuleReadResult(null);
        toast({
          title: 'Capsule Not Found',
          description: `No capsule found with that ID, or you don't have access: ${
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            JSON.stringify((capsuleResult as { Err: any }).Err)
          }`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      logger.error('Read capsule failed', undefined, { data: error as Error });
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Handle expired/invalid delegation
      if (
        errorMessage.includes('Invalid delegation') ||
        errorMessage.includes('expired') ||
        errorMessage.includes('401')
      ) {
        setIsAuthenticated(false);
        setPrincipalId('');
        clearAuthenticatedActor();
        toast({
          title: 'Session Expired',
          description: 'Your session has expired. Please sign in again.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Read Capsule Failed',
        description: `Failed to read capsule: ${errorMessage}`,
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  }

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

      <Button onClick={handleGetCapsuleInfo} disabled={busy || !isAuthenticated || isRehydrating}>
        Get Capsule Info
      </Button>

      {/* Capsule Reading Section */}
      <div className="mb-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="capsuleId">Read Specific Capsule:</Label>
          <div className="flex gap-4">
            <Input
              id="capsuleId"
              value={capsuleIdInput}
              onChange={e => setCapsuleIdInput(e.target.value)}
              placeholder="Enter capsule ID (e.g., capsule_1234567890)"
              className="w-80"
            />
            <Button
              onClick={handleReadCapsule}
              disabled={busy || !isAuthenticated || isRehydrating || !capsuleIdInput.trim()}
            >
              Read Capsule
            </Button>
          </div>
        </div>
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
                disabled={busy}
                title="Copy to clipboard"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Capsule Information Display */}
      <Card className="mt-6">
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
                {isAuthenticated
                  ? 'No capsule found. You may need to register first.'
                  : 'Please sign in to view your capsule information.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Capsule Read Result Display */}
      {capsuleReadResult && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Capsule Read Result</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Capsule ID</Label>
                  <p className="text-sm text-muted-foreground font-mono">{capsuleReadResult.id}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Subject</Label>
                  <p className="text-sm text-muted-foreground">
                    {'Principal' in capsuleReadResult.subject
                      ? `Principal: ${capsuleReadResult.subject.Principal}`
                      : `Opaque: ${capsuleReadResult.subject.Opaque}`}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Created At</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(Number(capsuleReadResult.created_at) / 1000000).toLocaleString('en-US')}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Updated At</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(Number(capsuleReadResult.updated_at) / 1000000).toLocaleString('en-US')}
                  </p>
                </div>
              </div>

              {/* Memory and Gallery Counts */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Memory Count</Label>
                  <p className="text-sm text-muted-foreground">{capsuleReadResult.memories?.length || 0}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Gallery Count</Label>
                  <p className="text-sm text-muted-foreground">{capsuleReadResult.galleries?.length || 0}</p>
                </div>
              </div>

              {/* Raw Data Display */}
              <div className="mt-4">
                <Label className="text-sm font-medium">Raw Data</Label>
                <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto max-h-64">
                  {JSON.stringify(capsuleReadResult, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
