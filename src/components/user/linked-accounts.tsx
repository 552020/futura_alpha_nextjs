'use client';

/**
 * Linked Accounts Component
 *
 * Displays information about linked Internet Identity accounts,
 * including Principal ID and linking status.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, Link as LinkIcon, Unlink } from 'lucide-react';
import { useIILinks } from '@/hooks/use-ii-links';
import { useICPIdentity } from '@/hooks/use-icp-identity';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { getAuthStatus } from '@/lib/utils/auth-status';

import { logger } from '@/lib/logger';

function shortenPrincipal(principal: string): string {
  return `${principal.slice(0, 5)}…${principal.slice(-5)}`;
}

interface LinkedAccountsProps {
  showActions?: boolean;
  className?: string;
  noCard?: boolean; // When true, don't wrap in Card component
}

export function LinkedAccounts({ showActions = true, className = '', noCard = false }: LinkedAccountsProps) {
  const { data: session } = useSession();

  // New hooks
  const { hasLinkedII, linkedIcPrincipals: _linkedIcPrincipals, unlinkII: _unlinkII } = useIILinks();
  const { principal, isAuthenticated } = useICPIdentity();
  const authStatus = getAuthStatus(session);

  // Use session principal as fallback if no active II session
  const displayPrincipal = principal || authStatus.activeIcPrincipal;
  const isCoAuthActive = isAuthenticated || authStatus.hasActiveIcPrincipal;
  const statusMessage = isCoAuthActive ? 'Active' : 'Not Connected';
  const statusClass = isCoAuthActive ? 'text-green-600' : 'text-gray-500';
  const { toast } = useToast();
  const [isCopying, setIsCopying] = useState(false);

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
      logger.error('Failed to copy:', undefined, { data: error instanceof Error ? error : undefined });
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
  const handleUnlinkII = () => {
    // This would typically show confirmation dialog
    toast({
      title: 'Unlink II Account',
      description: 'This action will remove your linked Internet Identity account.',
      variant: 'destructive',
    });
    // TODO: Implement II unlinking flow
  };

  if (!hasLinkedII) {
    const content = (
      <>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Linked Accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="text-muted-foreground mb-4">
              <p className="text-sm">No Internet Identity account linked yet</p>
              <p className="text-xs mt-1">Link your II account to enable ICP operations</p>
            </div>
            {showActions && (
              <Button onClick={handleLinkII} variant="outline" size="sm">
                <LinkIcon className="h-4 w-4 mr-2" />
                Link Internet Identity
              </Button>
            )}
          </div>
        </CardContent>
      </>
    );

    return noCard ? content : <Card className={className}>{content}</Card>;
  }

  const content = (
    <>
      <CardContent className="space-y-4">
        {/* Linked Principals Display */}
        <div className="space-y-2">
          {_linkedIcPrincipals.map(principal => (
            <div key={principal} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-2 shrink-0">•</span>
              <code className="flex-1 bg-muted px-2 py-1 rounded text-sm font-mono truncate min-w-0">{principal}</code>
              {principal === displayPrincipal && (
                <Badge variant="outline" className="text-xs text-green-600 shrink-0">
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
                onClick={handleUnlinkII}
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

  return noCard ? content : <Card className={className}>{content}</Card>;
}
