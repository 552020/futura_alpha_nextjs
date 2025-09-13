"use client";

/**
 * II Co-Auth Controls Component
 *
 * Displays prominent II co-authentication controls with:
 * - Current II co-auth status
 * - TTL countdown and status
 * - One-click activation button
 * - Session management controls
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, ShieldCheck, Clock, RefreshCw, LogOut } from "lucide-react";
import { useIICoAuth } from "@/hooks/use-ii-coauth";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface IICoAuthControlsProps {
  className?: string;
}

export function IICoAuthControls({ className = "" }: IICoAuthControlsProps) {
  const {
    hasLinkedII,
    isCoAuthActive,
    activeIcPrincipal,
    statusMessage,
    statusClass,
    remainingMinutes,
    disconnectII,
    refreshTTL,
  } = useIICoAuth();

  const { toast } = useToast();

  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Calculate progress percentage for TTL (15 min = 900 seconds)
  const ttlProgress = remainingMinutes > 0 ? Math.max(0, (remainingMinutes / 15) * 100) : 0;

  // Handle linking II account (redirect to sign-in page)
  const handleLinkII = () => {
    try {
      // Redirect to the II-only signin page with callback back to current page
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

  // If no linked II account, show nothing
  if (!hasLinkedII) {
    return null;
  }

  return (
    <Card
      className={`border-2 ${
        isCoAuthActive
          ? "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/20"
          : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/20"
      } ${className}`}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {isCoAuthActive ? (
            <ShieldCheck className="h-6 w-6 text-slate-600" />
          ) : (
            <Shield className="h-6 w-6 text-slate-600" />
          )}
          Internet Identity Co-Authentication
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
          {activeIcPrincipal && (
            <div className="bg-muted rounded-md p-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-slate-600" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Active Principal</p>
                  <p className="font-mono text-sm break-all">{activeIcPrincipal}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {!isCoAuthActive ? (
            // Show Link button when inactive
            <Button onClick={handleLinkII} className="flex-1">
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

        {/* Status Messages */}
        <div className="text-xs text-muted-foreground space-y-1">
          {isCoAuthActive ? (
            <>
              <p>✅ Your Internet Identity is active and can perform ICP operations</p>
              <p>⏰ Session will expire in {remainingMinutes}m</p>
              <p>🔄 Use &ldquo;Extend Session&rdquo; to refresh your authentication</p>
            </>
          ) : (
            <>
              <p>⚠️ Your Internet Identity is linked but not active for this session</p>
              <p>🔒 Click &ldquo;Activate Internet Identity&rdquo; to enable ICP operations</p>
              <p>⏱️ Activation provides 15 minutes of authenticated access</p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
