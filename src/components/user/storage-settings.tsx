"use client";

import {
  useStoragePreferences,
  useUpdateStoragePreferences,
  prefToToggles,
  togglesToPref,
} from "@/hooks/use-storage-preferences";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export function StorageSettings() {
  const { data: preferences, isLoading, error } = useStoragePreferences();
  const updatePreferences = useUpdateStoragePreferences();

  const handleNeonToggle = (checked: boolean) => {
    // Use centralized mapping functions
    const currentToggles = preferences ? prefToToggles(preferences.preference) : { neon: true, icp: false };
    const newToggles = { ...currentToggles, neon: checked };
    const newPreference = togglesToPref(newToggles.neon, newToggles.icp);

    updatePreferences.mutate({
      preference: newPreference,
      primary: preferences?.primary || "neon-db",
    });
  };

  const handleIcpToggle = (checked: boolean) => {
    // Use centralized mapping functions
    const currentToggles = preferences ? prefToToggles(preferences.preference) : { neon: true, icp: false };
    const newToggles = { ...currentToggles, icp: checked };
    const newPreference = togglesToPref(newToggles.neon, newToggles.icp);

    updatePreferences.mutate({
      preference: newPreference,
      primary: preferences?.primary || "neon-db",
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Storage Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-6 w-12" />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-6 w-12" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Always show toggles, even if there's an error
  const hasInitialError = error || !preferences;

  // Use centralized mapping (with fallback for errors)
  const toggles = preferences ? prefToToggles(preferences.preference) : { neon: true, icp: false };
  const { neon: neonEnabled, icp: icpEnabled } = toggles;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Storage Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Initial error display (if any) */}
        {hasInitialError && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950/20 dark:text-yellow-200">
            <p className="text-sm font-medium">Warning</p>
            <p className="text-sm">{error ? error.userMessage : "No preferences found"}</p>
            {error?.isRetryable && (
              <p className="text-xs text-yellow-600 dark:text-yellow-300 mt-1">
                This error may be temporary. Please try again.
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="web2-storage">Web2</Label>
            <p className="text-sm text-muted-foreground">Vercel + Neon</p>
          </div>
          <Switch
            id="web2-storage"
            checked={neonEnabled}
            onCheckedChange={handleNeonToggle}
            disabled={updatePreferences.isPending || (!icpEnabled && neonEnabled)}
          />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="web3-storage">Web3</Label>
            <p className="text-sm text-muted-foreground">ICP</p>
          </div>
          <Switch
            id="web3-storage"
            checked={icpEnabled}
            onCheckedChange={handleIcpToggle}
            disabled={updatePreferences.isPending || (!neonEnabled && icpEnabled)}
          />
        </div>

        {/* Error Display for mutations */}
        {updatePreferences.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 dark:border-red-800 dark:bg-red-950/20 dark:text-red-200">
            <p className="text-sm font-medium">Error updating preferences</p>
            <p className="text-sm">{updatePreferences.error.userMessage}</p>
            {updatePreferences.error.isRetryable && (
              <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                This error may be temporary. Please try again.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
