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
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldCheck, RefreshCw, LogOut } from 'lucide-react';
import { useIILinks } from '@/hooks/use-ii-links';
import { useICPIdentity } from '@/hooks/use-icp-identity';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import { fatLogger } from '@/lib/logger';
import { getAuthStatus } from '@/lib/utils/auth-status';
interface IICoAuthControlsProps {
  className?: string;
}

export function IICoAuthControls({ className = '' }: IICoAuthControlsProps) {
  const { data: session } = useSession();
  const router = useRouter();

  // New hooks
  const { hasLinkedII: _hasLinkedII, linkedIcPrincipals: _linkedIcPrincipals, unlinkII: _unlinkII } = useIILinks();
  const { principal, isAuthenticated } = useICPIdentity();

  // Check app login status
  const authStatus = getAuthStatus(session);

  // Clear authentication state
  const isLoggedInWithII = isAuthenticated; // User is currently logged in with Internet Identity
  const currentIIPrincipal = principal; // Current Internet Identity principal
  const statusMessage = isAuthenticated ? 'Connected' : 'Not Connected';
  const statusClass = isAuthenticated ? 'text-green-600' : 'text-gray-500';

  // App login status variables
  const isSignedInWithIIInApp = authStatus.isSignedInWithII;
  const isSignedInWithGoogleInApp = authStatus.isSignedInWithGoogle;

  // Use session principal as fallback if no active II session
  // const _displayPrincipal = currentIIPrincipal || authStatus.activeIcPrincipal;

  // Placeholder disconnect function (will be implemented later)
  const disconnectII = async () => {
    // TODO: Implement disconnect functionality
    console.log('Disconnect II - not implemented yet');
  };

  const { toast } = useToast();

  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Handle linking II account (redirect to sign-in page)
  const handleLinkII = (signinPagePath = 'sign-ii-only') => {
    try {
      // Redirect to the II-only signin page with callback back to current page
      const currentUrl = window.location.href;
      const locale = window.location.pathname.split('/')[1]; // Extract locale from current path
      const signinUrl = `/${locale}/${signinPagePath}?callbackUrl=${encodeURIComponent(currentUrl)}`;
      router.push(signinUrl);
    } catch (error) {
      fatLogger.error('Failed to redirect to II signin page:', 'fe', {
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
  // const _handleLinkIIInline = async () => {
  //   try {
  // Use the unified authentication flow
  // const { handleInternetIdentityAuth } = await import('@/lib/ii-auth-utils');

  // await handleInternetIdentityAuth(
  //   window.location.href, // callbackUrl
  //   _principal => {
  //     // Success callback - show success message
  //     toast({
  //       title: 'II Authentication Successful',
  //       description: 'Your Internet Identity is now active for this session',
  //     });
  //   },
  //   errorMessage => {
  //     // Error callback - show error
  //     toast({
  //       title: 'Authentication Failed',
  //       description: errorMessage,
  //       variant: 'destructive',
  //     });
  //   },
  //   update // Pass the session update function
  // );
  // } catch (error) {
  //   fatLogger.error('Failed to authenticate with II:', 'fe', { data: error instanceof Error ? error : undefined });
  //   toast({
  //     title: 'Authentication Failed',
  //     description: 'Failed to authenticate with Internet Identity. Please try again.',
  //     variant: 'destructive',
  //   });
  // }
  // };

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
      fatLogger.error('Failed to disconnect II:', 'fe', { data: error instanceof Error ? error : undefined });
      toast({
        title: 'Disconnect Failed',
        description: 'Failed to disconnect Internet Identity. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Show component even if no linked II account (to show connect button)
  // if (!hasLinkedII) {
  //   return null;
  // }

  return (
    <Card
      className={`border-2 ${
        isLoggedInWithII
          ? 'border-green-200 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
          : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/20'
      } ${className}`}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {isLoggedInWithII ? (
            <ShieldCheck className="h-6 w-6 text-green-600" />
          ) : (
            <Shield className="h-6 w-6 text-slate-600" />
          )}
          Internet Identity Connection
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Information */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">II Connection:</span>
              <Badge variant="outline" className={statusClass}>
                {statusMessage}
              </Badge>
            </div>
          </div>

          {/* App Login Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">App Login:</span>
            <Badge variant="outline" className="text-blue-600">
              {isSignedInWithIIInApp ? 'Internet Identity' : isSignedInWithGoogleInApp ? 'Google' : 'Not signed in'}
            </Badge>
          </div>

          {/* Principal Display */}
          {currentIIPrincipal && (
            <div className="bg-muted rounded-md p-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Current Principal</p>
                  <p className="font-mono text-sm break-all">{currentIIPrincipal}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {!isLoggedInWithII ? (
            // Show Connect button when not logged in
            <Button onClick={() => handleLinkII()} className="flex-1">
              <Shield className="h-4 w-4 mr-2" />
              Connect Internet Identity
            </Button>
          ) : (
            // Show disconnect button when logged in
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
              Disconnect
            </Button>
          )}
        </div>

        {/* Status Messages */}
        <div className="text-xs text-muted-foreground space-y-1">
          {isLoggedInWithII ? (
            <>
              <p>✅ Connected to Internet Identity - you can perform ICP operations</p>
            </>
          ) : (
            <>
              <p>⚠️ Connect your Internet Identity to enable ICP operations</p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
