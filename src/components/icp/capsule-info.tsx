'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getAuthClient } from '@/ic/ii';
import { useAuthenticatedActor } from '@/hooks/use-authenticated-actor';
import { useState } from 'react';
import { logger } from '@/lib/logger';
import type { CapsuleInfo, Capsule } from '@/ic/declarations/backend/backend.did';

/**
 * CapsuleInfo Component
 *
 * Provides functionality to:
 * 1. Get basic capsule information for the authenticated user
 * 2. Read specific capsule data by ID
 * 3. Display capsule information in a structured format
 */
export function CapsuleInfo() {
  const [capsuleInfo, setCapsuleInfo] = useState<CapsuleInfo | null>(null);
  const [capsuleReadResult, setCapsuleReadResult] = useState<Capsule | null>(null);
  const [capsuleIdInput, setCapsuleIdInput] = useState('');
  const [busy, setBusy] = useState(false);
  const { getActor, clearActor } = useAuthenticatedActor();
  const { toast } = useToast();

  const handleGetCapsuleInfo = async () => {
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
      const authenticatedActor = await getActor();
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
        clearActor();
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
  };

  const handleReadCapsule = async () => {
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
      const authenticatedActor = await getActor();
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
          description: `No capsule found with that ID, or you don&apos;t have access: ${
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
        clearActor();
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
  };

  return (
    <div className="space-y-6">
      {/* Basic Capsule Info Section */}
      <div className="space-y-4">
        <Button onClick={handleGetCapsuleInfo} disabled={busy} className="w-40">
          {busy ? 'Loading...' : 'Get Capsule Info'}
        </Button>

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

      {/* Specific Capsule Reading Section */}
      <div className="space-y-4">
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
            <Button onClick={handleReadCapsule} disabled={busy || !capsuleIdInput.trim()} className="w-32">
              {busy ? 'Reading...' : 'Read Capsule'}
            </Button>
          </div>
        </div>

        {/* Capsule Read Result Display */}
        {capsuleReadResult && (
          <Card>
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
    </div>
  );
}
