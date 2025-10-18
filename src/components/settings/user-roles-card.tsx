'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

interface UserRolesCardProps {
  isAtLeastDeveloper: boolean;
  isAdmin: boolean;
  devMode: boolean;
  setDevMode: (enabled: boolean) => void;
}

export function UserRolesCard({ isAtLeastDeveloper, isAdmin, devMode, setDevMode }: UserRolesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>User Roles</CardTitle>
        <CardDescription>Enable developer and admin features for testing and system management.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAtLeastDeveloper && (
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="developer-mode">Show Developer Options</Label>
              <p className="text-sm text-muted-foreground">
                Show developer features and testing tools in the interface.
              </p>
            </div>
            <div className="text-sm text-muted-foreground">Enabled (Developer Role)</div>
          </div>
        )}
        {isAtLeastDeveloper && (
          <>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="dev-mode">Developer Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Enable testing features like bulk memory deletion and debug tools.
                </p>
              </div>
              <Switch id="dev-mode" checked={devMode} onCheckedChange={setDevMode} />
            </div>
          </>
        )}
        <Separator />
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="admin-mode">Admin Mode</Label>
            <p className="text-sm text-muted-foreground">Enable administrative features and system-wide controls.</p>
          </div>
          <div className="text-sm text-muted-foreground">{isAdmin ? 'Enabled (Admin Role)' : 'Disabled'}</div>
        </div>
        {(devMode || isAdmin) && (
          <>
            <Separator />
            <div className="rounded-lg bg-yellow-50 p-4 text-yellow-800 dark:bg-yellow-950/20 dark:text-yellow-200">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium">Advanced Features Active</h3>
                  <div className="mt-2 text-sm">
                    <p>
                      {devMode &&
                        "Developer mode is now enabled. You'll see additional testing tools in the dashboard."}
                      {isAtLeastDeveloper && 'Admin features are now enabled. You have access to system-wide controls.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
