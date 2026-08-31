'use client';

/**
 * Linked Accounts Component
 *
 * Displays linked Internet Identity principals with copy/unlink actions.
 * Used by InternetIdentityManagement component.
 */

import { CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Unlink } from 'lucide-react';
import { useIILinks } from '@/hooks/use-ii-links';
import { useICPIdentity } from '@/hooks/use-icp-identity';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { getAuthStatus } from '@/lib/utils/auth-status';
import { fatLogger } from '@/lib/logger';

export function LinkedAccounts() {
  const { data: session } = useSession();
  const { hasLinkedII, linkedIcPrincipals, unlinkII } = useIILinks();
  const { principal } = useICPIdentity();
  const authStatus = getAuthStatus(session);
  const { toast } = useToast();
  const [isCopying, setIsCopying] = useState(false);

  // Use session principal as fallback if no active II session
  const displayPrincipal = principal || authStatus.activeIcPrincipal;

  // Copy Principal to clipboard
  const handleCopyPrincipal = async (principal: string) => {
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(principal);
      toast({
        title: 'Copied!',
        description: 'Principal ID copied to clipboard',
      });
    } catch (error) {
      fatLogger.error('Failed to copy:', 'fe', {
        data: error instanceof Error ? error : undefined,
      });
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy principal ID to clipboard',
        variant: 'destructive',
      });
    } finally {
      setIsCopying(false);
    }
  };

  // Handle unlinking II account
  const handleUnlinkII = async (principal: string) => {
    try {
      // TODO: CRITICAL ARCHITECTURAL DECISION NEEDED
      // Current implementation permanently deletes the account link, potentially losing:
      // - User data associated with that principal
      // - Gallery ownership
      // - Storage permissions
      // - Historical records
      //
      // Consider alternatives:
      // 1. Create new userId for the unlinked principal (preserve data)
      // 2. Transfer ownership to another linked principal
      // 3. Mark as "inactive" instead of deleting
      // 4. Require data migration before unlinking
      //
      // This is LOW PRIORITY but HIGH IMPACT - needs product/tech lead discussion

      await unlinkII(principal);

      toast({
        title: 'Unlinked Successfully',
        description: 'Internet Identity account has been unlinked.',
      });
    } catch (error) {
      fatLogger.error('Failed to unlink II account:', 'fe', {
        data: error instanceof Error ? error : undefined,
      });
      toast({
        title: 'Unlink Failed',
        description: 'Failed to unlink Internet Identity account',
        variant: 'destructive',
      });
    }
  };

  if (!hasLinkedII) {
    return null; // Don't show anything when no linked accounts
  }

  return (
    <>
      <CardContent className="space-y-4">
        {/* Linked Principals Display */}
        <div className="space-y-2">
          {linkedIcPrincipals.map((principal) => (
            <div key={principal} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-2 shrink-0">
                •
              </span>
              <code className="flex-1 bg-muted px-2 py-1 rounded text-sm font-mono truncate min-w-0">
                {principal}
              </code>
              {principal === displayPrincipal && (
                <Badge
                  variant="outline"
                  className="text-xs text-green-600 shrink-0"
                >
                  Active
                </Badge>
              )}
              <Button
                onClick={() => handleCopyPrincipal(principal)}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 shrink-0"
                disabled={isCopying}
              >
                <Copy className="h-3 w-3" />
              </Button>
              <Button
                onClick={() => handleUnlinkII(principal)}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 shrink-0"
              >
                <Unlink className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </>
  );
}
