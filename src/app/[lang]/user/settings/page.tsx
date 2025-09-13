"use client";

import { useAuthGuard } from "@/utils/authentication";
import { Loader2 } from "lucide-react";
import RequireAuth from "@/components/auth/require-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useInterface } from "@/contexts/interface-context";
import { StorageSettings } from "@/components/user/storage-settings";
import { StorageCard } from "@/components/user/storage-card";

export default function SettingsPage() {
  const { isAuthorized, isTemporaryUser, userId, isLoading } = useAuthGuard();
  const { isAdmin, devMode, setDevMode, isAtLeastDeveloper } = useInterface();

  if (!isAuthorized || isLoading) {
    // Show loading spinner only while status is loading
    if (isLoading) {
      return (
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }

    // Show access denied for unauthenticated users
    return <RequireAuth />;
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your storage, frontend, and account preferences.</p>
        </div>

        {isTemporaryUser && (
          <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20">
            <CardHeader>
              <CardTitle className="text-yellow-800 dark:text-yellow-200">Temporary Account</CardTitle>
              <CardDescription className="text-yellow-700 dark:text-yellow-300">
                You are using a temporary account. Complete your signup to keep your account permanently.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="default" className="w-full">
                Complete Signup
              </Button>
            </CardContent>
          </Card>
        )}

        <StorageCard />

        {/* New Storage Settings Component */}
        <StorageSettings />

        <Card>
          <CardHeader>
            <CardTitle>Frontend</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="web2-frontend">Web2</Label>
                <p className="text-sm text-muted-foreground">Vercel</p>
              </div>
              <Switch id="web2-frontend" defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="web3-frontend">Web3</Label>
                <p className="text-sm text-muted-foreground">ICP</p>
              </div>
              <Switch id="web3-frontend" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Choose how you want to be notified about your memories and family updates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive updates about new memories and family activity.</p>
              </div>
              <Switch id="email-notifications" defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push-notifications">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">Get notified when someone shares memories with you.</p>
              </div>
              <Switch id="push-notifications" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Privacy</CardTitle>
            <CardDescription>Control who can see your memories and profile information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="profile-visibility">Public Profile</Label>
                <p className="text-sm text-muted-foreground">
                  Allow others to find your profile and see basic information.
                </p>
              </div>
              <Switch id="profile-visibility" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="memory-sharing">Memory Sharing</Label>
                <p className="text-sm text-muted-foreground">
                  Allow family members to share your memories with others.
                </p>
              </div>
              <Switch id="memory-sharing" defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Manage your account settings and preferences.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Account Type</Label>
                <p className="text-sm text-muted-foreground">
                  {isTemporaryUser ? "Temporary Account" : "Permanent Account"}
                </p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>User ID</Label>
                <p className="text-sm text-muted-foreground font-mono">{userId}</p>
              </div>
            </div>
            <Separator />
            <Button variant="outline" className="w-full">
              Export My Data
            </Button>
            <Button variant="destructive" className="w-full">
              Delete Account
            </Button>
          </CardContent>
        </Card>

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
                <p className="text-sm text-muted-foreground">
                  Enable administrative features and system-wide controls.
                </p>
              </div>
              <div className="text-sm text-muted-foreground">{isAdmin ? "Enabled (Admin Role)" : "Disabled"}</div>
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
                          {isAtLeastDeveloper &&
                            "Admin features are now enabled. You have access to system-wide controls."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
