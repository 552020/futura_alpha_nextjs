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
import { useIICoAuth } from '@/hooks/use-ii-coauth';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface LinkedAccountsProps {
  showActions?: boolean;
  className?: string;
}

export function LinkedAccounts({ showActions = true, className = '' }: LinkedAccountsProps) {
  const { hasLinkedII, linkedIcPrincipal, isCoAuthActive, statusMessage, statusClass } = useIICoAuth();
  const { toast } = useToast();
  const [isCopying, setIsCopying] = useState(false);

  // Copy Principal to clipboard
  const copyPrincipalToClipboard = async () => {
    if (!linkedIcPrincipal) return;

    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(linkedIcPrincipal);
      toast({
        title: 'Copied!',
        description: 'Principal ID copied to clipboard',
      });
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy principal ID to clipboard',
        variant: 'destructive',
      });
    } finally {
      setIsCopying(false);
    }
  };

  // Handle linking II account
  const handleLinkII = () => {
    try {
      // Redirect to the II-only signin page with callback back to current page
      const currentUrl = window.location.href;
      const signinUrl = `/en/sign-ii-only?callbackUrl=${encodeURIComponent(currentUrl)}`;
      window.location.href = signinUrl;
    } catch (error) {
      console.error('Failed to redirect to II signin page:', error);
      toast({
        title: 'Redirect Failed',
        description: 'Failed to redirect to Internet Identity linking page',
        variant: 'destructive',
      });
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
    return (
      <Card className={className}>
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
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5" />
          Linked Accounts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* II Account Information */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                Internet Identity
              </Badge>
              {isCoAuthActive && (
                <Badge variant="outline" className={`text-xs ${statusClass}`}>
                  {statusMessage}
                </Badge>
              )}
            </div>
          </div>

          {/* Principal Display */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap flex items-center h-6">
              Principal ID:
            </span>
            <code className="flex-1 bg-muted px-2 py-1 rounded text-sm font-mono break-all">{linkedIcPrincipal}</code>
          </div>
        </div>

        {/* Action Buttons */}
        {showActions && (
          <div className="flex gap-2 pt-2 border-t">
            <Button onClick={handleLinkII} variant="outline" size="sm">
              <LinkIcon className="h-4 w-4 mr-2" />
              Re-link II Account
            </Button>
            <Button onClick={copyPrincipalToClipboard} variant="outline" size="sm" disabled={isCopying}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Principal
            </Button>
            <Button
              onClick={handleUnlinkII}
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 dark:text-red-400 dark:hover:text-red-300"
            >
              <Unlink className="h-4 w-4 mr-2" />
              Unlink
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
