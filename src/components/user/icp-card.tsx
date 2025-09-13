"use client";

/**
 * ICP Card Component
 *
 * Unified card that combines:
 * - Internet Identity linking status
 * - Co-authentication controls
 * - Principal management
 * - Session management
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, Clock, RefreshCw, LogOut, Copy, Link as LinkIcon } from "lucide-react";
import { useIICoAuth } from "@/hooks/use-ii-coauth";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface ICPCardProps {
  className?: string;
}

export function ICPCard({ className = "" }: ICPCardProps) {
  const {
    hasLinkedII,
    linkedIcPrincipal,
    isCoAuthActive,
    statusMessage,
    statusClass,
    remainingMinutes,
    disconnectII,
    refreshTTL,
  } = useIICoAuth();

  const { toast } = useToast();

  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  // Calculate progress percentage for TTL (15 min = 900 seconds)
  const ttlProgress = remainingMinutes > 0 ? Math.max(0, (remainingMinutes / 15) * 100) : 0;

  // Copy Principal to clipboard
  const copyPrincipalToClipboard = async () => {
    if (!linkedIcPrincipal) return;

    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(linkedIcPrincipal);
      toast({
        title: "Copied!",
        description: "Principal ID copied to clipboard",
      });
    } catch (error) {
      console.error("Failed to copy:", error);
      toast({
        title: "Copy Failed",
        description: "Failed to copy principal ID to clipboard",
        variant: "destructive",
      });
    } finally {
      setIsCopying(false);
    }
  };

  // Handle linking II account
  const handleLinkII = () => {
    try {
      const currentUrl = window.location.href;
      const signinUrl = `/en/sign-ii-only?callbackUrl=${encodeURIComponent(currentUrl)}`;
      window.location.href = signinUrl;
    } catch (error) {
      console.error("Failed to redirect to II signin page:", error);
      toast({
        title: "Redirect Failed",
        description: "Failed to redirect to Internet Identity linking page",
        variant: "destructive",
      });
    }
  };

  // Handle II activation - redirect to II sign-in
  const handleActivateII = async () => {
    try {
      // Redirect to the II-only signin page with callback back to current page
      const currentUrl = window.location.href;
      const signinUrl = `/en/sign-ii-only?callbackUrl=${encodeURIComponent(currentUrl)}`;
      window.location.href = signinUrl;
    } catch (error) {
      console.error("Failed to redirect to II signin page:", error);
      toast({
        title: "Redirect Failed",
        description: "Failed to redirect to Internet Identity sign-in page",
        variant: "destructive",
      });
    }
  };

  // Handle II disconnection
  const handleDisconnectII = async () => {
    setIsDisconnecting(true);
    try {
      await disconnectII();
      toast({
        title: "II Co-Auth Disconnected",
        description: "Your Internet Identity is no longer active for this session",
      });
    } catch (error) {
      console.error("Failed to disconnect II:", error);
      toast({
        title: "Disconnect Failed",
        description: "Failed to disconnect Internet Identity. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Handle TTL refresh
  const handleRefreshTTL = async () => {
    setIsRefreshing(true);
    try {
      await refreshTTL();
      toast({
        title: "II Co-Auth Refreshed",
        description: "Your Internet Identity session has been extended",
      });
    } catch (error) {
      console.error("Failed to refresh II TTL:", error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh Internet Identity session. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // If no linked II account, show linking prompt
  if (!hasLinkedII) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Internet Computer (ICP)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <div className="text-muted-foreground mb-4">
              <p className="text-sm">No Internet Identity account linked yet</p>
              <p className="text-xs mt-1">Link your II account to enable ICP operations</p>
            </div>
            <Button onClick={handleLinkII} variant="outline" size="sm">
              <LinkIcon className="h-4 w-4 mr-2" />
              Link Internet Identity
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-2 border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/20 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-6 w-6 text-slate-600" />
          Internet Computer (ICP)
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Information */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              <Badge variant="outline" className={statusClass}>
                {statusMessage}
              </Badge>
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
          <div className="bg-muted rounded-md p-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">Principal ID</p>
                <p className="font-mono text-sm break-all">{linkedIcPrincipal}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyPrincipalToClipboard}
                disabled={isCopying}
                className="ml-2 flex-shrink-0"
                title="Copy to clipboard"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {!isCoAuthActive ? (
            // Show Activate button when inactive
            <Button onClick={handleActivateII} className="flex-1">
              <Shield className="h-4 w-4 mr-2" />
              Sign in with Internet Identity
            </Button>
          ) : (
            // Show management buttons when active
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

        {/* Additional Actions */}
        <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
          <Button onClick={handleLinkII} variant="outline" size="sm" className="flex-1">
            <LinkIcon className="h-4 w-4 mr-2" />
            Re-link II Account
          </Button>
          <Button
            onClick={copyPrincipalToClipboard}
            variant="outline"
            size="sm"
            disabled={isCopying}
            className="flex-1"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Principal
          </Button>
        </div>

        {/* Status Messages */}
        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-slate-200 dark:border-slate-700">
          {isCoAuthActive ? (
            <>
              <p>✅ Your Internet Identity is active and can perform ICP operations</p>
              <p>⏰ Session will expire in {remainingMinutes}m</p>
              <p>🔄 Use &ldquo;Extend Session&rdquo; to refresh your authentication</p>
            </>
          ) : (
            <>
              <p>⚠️ Your Internet Identity is linked but not active for this session</p>
              <p>🔒 Click &ldquo;Sign in with Internet Identity&rdquo; to enable ICP operations</p>
              <p>⏱️ Activation provides 15 minutes of authenticated access</p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
