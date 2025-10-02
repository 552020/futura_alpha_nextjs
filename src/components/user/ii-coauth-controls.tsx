'use client';

/**
 * II Co-Auth Controls Component
 *
 * Displays prominent II co-authentication controls with:
 * - Current II co-auth status
 * - TTL countdown and status
 * - One-click activation button
 * - Session management controls
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { User, UserCheck, Clock, RefreshCw, LogOut, Copy } from 'lucide-react';
import { useIICoAuth } from '@/hooks/use-ii-coauth';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { logger } from '@/lib/logger';
interface IICoAuthControlsProps {
  className?: string;
}

export function IICoAuthControls({ className = '' }: IICoAuthControlsProps) {
  const { update } = useSession();
  const router = useRouter();
  const {
    hasLinkedII,
    isCoAuthActive,
    activeIcPrincipal,
    statusMessage,
    statusClass,
    remainingMinutes,
    disconnectII,
    refreshTTL,
    isExpired,
    requiresReAuth,
  } = useIICoAuth();

  const { toast } = useToast();

  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  // Calculate progress percentage for TTL (15 min = 900 seconds)
  const ttlProgress = remainingMinutes > 0 ? Math.max(0, (remainingMinutes / 15) * 100) : 0;

  // Handle linking II account (redirect to sign-in page)
  const handleLinkII = (signinPagePath = 'sign-ii-only') => {
    try {
      // Redirect to the II-only signin page with callback back to current page
      const currentUrl = window.location.href;
      const locale = window.location.pathname.split('/')[1]; // Extract locale from current path
      const signinUrl = `/${locale}/${signinPagePath}?callbackUrl=${encodeURIComponent(currentUrl)}`;
      router.push(signinUrl);
    } catch (error) {
      logger.error('Failed to redirect to II signin page:', undefined, {
        data: error instanceof Error ? error : undefined,
      });
      toast({
        title: 'Redirect Failed',
        description: 'Failed to redirect to Internet Identity linking page',
        variant: 'destructive',
      });
    }
  };

  // Handle linking II account (inline authentication)
  const _handleLinkIIInline = async () => {
    try {
      // Use the unified authentication flow
      const { handleInternetIdentityAuth } = await import('@/lib/ii-auth-utils');

      await handleInternetIdentityAuth(
        window.location.href, // callbackUrl
        _principal => {
          // Success callback - show success message
          toast({
            title: 'II Authentication Successful',
            description: 'Your Internet Identity is now active for this session',
          });
        },
        errorMessage => {
          // Error callback - show error
          toast({
            title: 'Authentication Failed',
            description: errorMessage,
            variant: 'destructive',
          });
        },
        update // Pass the session update function
      );
    } catch (error) {
      logger.error('Failed to authenticate with II:', undefined, { data: error instanceof Error ? error : undefined });
      toast({
        title: 'Authentication Failed',
        description: 'Failed to authenticate with Internet Identity. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Handle II disconnection
  const handleDisconnectII = async () => {
    setIsDisconnecting(true);
    try {
      await disconnectII();
      toast({
        title: 'II Co-Auth Disconnected',
        description: 'Your Internet Identity is no longer active for this session',
      });
    } catch (error) {
      logger.error('Failed to disconnect II:', undefined, { data: error instanceof Error ? error : undefined });
      toast({
        title: 'Disconnect Failed',
        description: 'Failed to disconnect Internet Identity. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Handle copying principal to clipboard
  const copyPrincipalToClipboard = async () => {
    if (!activeIcPrincipal) return;

    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(activeIcPrincipal);
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

  // Handle TTL refresh
  const handleRefreshTTL = async () => {
    setIsRefreshing(true);
    try {
      await refreshTTL();
      toast({
        title: 'II Co-Auth Refreshed',
        description: 'Your Internet Identity session has been extended',
      });
    } catch (error) {
      logger.error('Failed to refresh II TTL:', undefined, { data: error instanceof Error ? error : undefined });
      toast({
        title: 'Refresh Failed',
        description: 'Failed to refresh Internet Identity session. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // If no linked II account, show nothing
  if (!hasLinkedII) {
    return null;
  }

  return (
    <Card
      className={`border-2 ${
        isCoAuthActive
          ? 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/20'
          : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/20'
      } ${className}`}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {isCoAuthActive ? (
            <UserCheck className="h-6 w-6 text-slate-600" />
          ) : (
            <User className="h-6 w-6 text-slate-600" />
          )}
          Internet Identity Controls
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Information */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              <span className={`text-sm ${statusClass}`}>{statusMessage}</span>
            </div>

            {isCoAuthActive && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{remainingMinutes}m remaining</span>
              </div>
            )}
          </div>

          {/* TTL Progress Bar */}
          {isCoAuthActive && remainingMinutes > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Session Time Remaining</span>
                <span>{remainingMinutes}m</span>
              </div>
              <Progress value={ttlProgress} className="h-2" />
            </div>
          )}

          {/* Principal Display */}
          {activeIcPrincipal && !isExpired && !requiresReAuth && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-sm font-medium">Active Principal:</span>
                <span className="text-sm truncate flex-1">{activeIcPrincipal}</span>
              </div>
              <Button
                onClick={copyPrincipalToClipboard}
                disabled={isCopying}
                variant="ghost"
                size="sm"
                className="ml-2 h-8 w-8 p-0"
              >
                {isCopying ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {!isCoAuthActive || isExpired || requiresReAuth ? (
            // Show Link button when inactive or expired
            <Button onClick={() => handleLinkII()} className="flex-1">
              <User className="h-4 w-4 mr-2" />
              Connect Internet Identity
            </Button>
          ) : (
            // Show management buttons when active and not expired
            <>
              <Button onClick={handleRefreshTTL} disabled={isRefreshing} variant="outline" className="flex-1">
                {isRefreshing ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Extend Session
              </Button>

              <Button
                onClick={handleDisconnectII}
                disabled={isDisconnecting}
                variant="outline"
                className="flex-1 border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/20"
              >
                {isDisconnecting ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4 mr-2" />
                )}
                Disconnect for This Session
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
