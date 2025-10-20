'use client';

/**
 * Internet Identity Management Component
 *
 * Unified component that combines:
 * - Active principal display (currently signed in with II)
 * - Linked principals management
 * - Unlink functionality
 * - Real-time status updates
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Loader2, LogOut } from 'lucide-react';
import { useICPIdentity } from '@/hooks/use-icp-identity';
import { useIILinks } from '@/hooks/use-ii-links';
import { useAuthenticatedActor } from '@/hooks/use-authenticated-actor';
import { clearIiSession } from '@/ic/ii';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { getAuthStatus } from '@/lib/utils/auth-status';
import { LinkedAccounts } from './linked-accounts';

import { fatLogger } from '@/lib/logger/fat-logger';

interface InternetIdentityManagementProps {
  className?: string;
}

function shortenPrincipal(principal: string): string {
  return `${principal.slice(0, 5)}…${principal.slice(-5)}`;
}

export function InternetIdentityManagement({ className = '' }: InternetIdentityManagementProps) {
  const { data: session, update } = useSession();
  const { principal, isAuthenticated, isLoading: iiLoading } = useICPIdentity();
  const { linkedIcPrincipals } = useIILinks();
  const { clearActor } = useAuthenticatedActor();
  const { toast } = useToast();
  const router = useRouter();
  const authStatus = getAuthStatus(session);

  // Handle signing in to Internet Identity (redirect to sign-in page)
  const handleSignInII = () => {
    try {
      // Redirect to the II-only signin page with callback back to current page
      const currentUrl = window.location.href;
      const locale = window.location.pathname.split('/')[1]; // Extract locale from current path
      const signinUrl = `/${locale}/sign-ii-only?callbackUrl=${encodeURIComponent(currentUrl)}`;

      // Debug logging for callback URL
      fatLogger.info('Management Component Debug:', 'be', {
        currentUrl,
        locale,
        signinUrl,
        encodedCallbackUrl: encodeURIComponent(currentUrl),
      });

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

  // Handle signing out from Internet Identity
  const handleSignOutII = async () => {
    try {
      // Clear the Internet Identity session
      await clearIiSession();

      // Clear cached backend actor (global cleanup)
      clearActor();

      // Clear II authentication from NextAuth session
      try {
        await update({
          clearActiveIc: true,
        });
        fatLogger.info('Successfully cleared II authentication from NextAuth session', 'fe');
      } catch (error) {
        fatLogger.warn('Failed to clear II authentication from session', 'fe', {
          error: error instanceof Error ? error.message : String(error),
        });
        // Don't fail the sign out if session update fails
      }

      toast({
        title: 'Signed Out',
        description: 'Successfully signed out from Internet Identity',
      });
    } catch (error) {
      fatLogger.error('Failed to sign out from Internet Identity:', 'fe', {
        data: error instanceof Error ? error : undefined,
      });
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast({
        title: 'Sign Out Failed',
        description: `Failed to sign out: ${errorMessage}`,
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className={`border-2 border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/20 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="h-6 w-6 text-slate-600" />
          Internet Identity Management
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Grid - Two Column Layout */}
        <div className="grid grid-cols-[auto_1fr] gap-4 items-start">
          {/* Left Column - Keys */}
          <div className="space-y-4">
            <div className="text-sm font-medium min-h-[1.5rem] flex items-center">Internet Identity Connection</div>
            <div className="text-sm font-medium min-h-[1.5rem] flex items-center">Active Principal</div>
            <div className="text-sm font-medium min-h-[1.5rem] flex items-center">App Login</div>
            <div className="text-sm font-medium min-h-[1.5rem] flex items-center">Linked Principals</div>
          </div>

          {/* Right Column - Values */}
          <div className="space-y-4">
            {/* Internet Identity Connection Status */}
            <div className="min-h-[1.5rem] flex items-center">
              <Badge
                variant="outline"
                className={isAuthenticated ? 'text-green-600 border-green-600' : 'text-gray-500'}
              >
                {isAuthenticated ? 'Connected' : 'Not Connected'}
              </Badge>
            </div>

            {/* Active Principal */}
            <div className="min-h-[1.5rem] flex items-center">
              {iiLoading ? (
                <Badge variant="outline" className="text-gray-500">
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Checking...
                </Badge>
              ) : isAuthenticated && principal ? (
                <Badge variant="outline" className="text-green-600">
                  {shortenPrincipal(principal)}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-gray-500">
                  Not signed in
                </Badge>
              )}
            </div>

            {/* App Login Status */}
            <div className="min-h-[1.5rem] flex items-center">
              <Badge variant="outline" className="text-blue-600">
                {authStatus.providerDisplayName}
              </Badge>
            </div>

            {/* Linked Principals */}
            <div className="min-h-[1.5rem] flex items-center">
              {linkedIcPrincipals.length > 0 ? (
                <Badge variant="outline" className="text-blue-600">
                  {linkedIcPrincipals.length} linked
                </Badge>
              ) : (
                <Badge variant="outline" className="text-gray-500">
                  None
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Linked Accounts Component - Show when there are linked principals */}
        {linkedIcPrincipals.length > 0 && (
          <div className="pt-4 border-t">
            <LinkedAccounts />
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-4 border-t">
          {!isAuthenticated ? (
            <Button onClick={handleSignInII} data-testid="ii-connect">
              <User className="h-4 w-4 mr-2" />
              Connect Internet Identity
            </Button>
          ) : (
            <Button
              onClick={handleSignOutII}
              variant="outline"
              className="border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800/20"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out from Internet Identity
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
