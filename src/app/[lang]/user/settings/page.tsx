'use client';

import { useAuthGuard } from '@/utils/authentication';
import { Loader2 } from 'lucide-react';
import RequireAuth from '@/components/auth/require-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useInterface } from '@/contexts/interface-context';
import { HostingSinglePreferenceCard } from '@/components/user/hosting-single-preference-card';
import { HostingWeb2Web3ToggleCard } from '@/components/user/hosting-web2-web3-toggle-card';
import { useHostingPreferences, useUpdateHostingPreferences, type BlobHosting } from '@/hooks/use-hosting-preferences';
import { Skeleton } from '@/components/ui/skeleton';

function TemporaryUserCard() {
  return (
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
  );
}

interface SettingItem {
  id: string;
  label: string;
  description: string;
  defaultChecked?: boolean;
}

interface SettingsCardProps {
  title: string;
  description: string;
  settings: SettingItem[];
}

function SettingsCard({ title, description, settings }: SettingsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {settings.map((setting, index) => (
          <div key={setting.id}>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor={setting.id}>{setting.label}</Label>
                <p className="text-sm text-muted-foreground">{setting.description}</p>
              </div>
              <Switch id={setting.id} defaultChecked={setting.defaultChecked} />
            </div>
            {index < settings.length - 1 && <Separator />}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// Notifications Settings Card Component
function NotificationsCard() {
  return (
    <SettingsCard
      title="Notifications"
      description="Choose how you want to be notified about your memories and family updates."
      settings={[
        {
          id: 'email-notifications',
          label: 'Email Notifications',
          description: 'Receive updates about new memories and family activity.',
          defaultChecked: true,
        },
        {
          id: 'push-notifications',
          label: 'Push Notifications',
          description: 'Get notified when someone shares memories with you.',
          defaultChecked: false,
        },
      ]}
    />
  );
}

// Privacy Settings Card Component
function PrivacyCard() {
  return (
    <SettingsCard
      title="Privacy"
      description="Control who can see your memories and profile information."
      settings={[
        {
          id: 'profile-visibility',
          label: 'Public Profile',
          description: 'Allow others to find your profile and see basic information.',
          defaultChecked: false,
        },
        {
          id: 'memory-sharing',
          label: 'Memory Sharing',
          description: 'Allow family members to share your memories with others.',
          defaultChecked: true,
        },
      ]}
    />
  );
}

// Account Settings Card Component
function AccountCard({ isTemporaryUser, userId }: { isTemporaryUser: boolean; userId: string }) {
  return (
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
              {isTemporaryUser ? 'Temporary Account' : 'Permanent Account'}
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
  );
}

// User Roles Card Component
function UserRolesCard({
  isAtLeastDeveloper,
  isAdmin,
  devMode,
  setDevMode,
}: {
  isAtLeastDeveloper: boolean;
  isAdmin: boolean;
  devMode: boolean;
  setDevMode: (enabled: boolean) => void;
}) {
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

// Helper function to handle shared canister toggle logic
function handleSharedCanisterChange(
  enabled: boolean,
  currentBlobHosting: BlobHosting[],
  updatePreferences: ReturnType<typeof useUpdateHostingPreferences>
) {
  if (enabled) {
    // Add ICP to the list if not already present
    const newBlobHosting: BlobHosting[] = currentBlobHosting.includes('icp')
      ? currentBlobHosting
      : ['icp', ...currentBlobHosting.filter(h => h !== 'icp')];
    updatePreferences.mutate({
      blobHosting: newBlobHosting,
    });
  } else {
    // Remove ICP from the list
    const newBlobHosting: BlobHosting[] = currentBlobHosting.filter(h => h !== 'icp');
    updatePreferences.mutate({
      blobHosting: newBlobHosting.length > 0 ? newBlobHosting : ['s3'],
    });
  }
}

export default function SettingsPage() {
  const { isAuthorized, isTemporaryUser, userId, isLoading } = useAuthGuard();
  const { isAdmin, devMode, setDevMode, isAtLeastDeveloper } = useInterface();
  const { data: preferences, isLoading: preferencesLoading, error: preferencesError } = useHostingPreferences();
  const updatePreferences = useUpdateHostingPreferences();

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

  // Show loading state for preferences
  if (preferencesLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground mt-2">Manage your storage, frontend, and account preferences.</p>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Show error state for preferences
  if (preferencesError) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground mt-2">Manage your storage, frontend, and account preferences.</p>
          </div>
          <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
            <CardContent className="pt-6">
              <p className="text-red-800 dark:text-red-200">
                Failed to load hosting preferences. Please refresh the page.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your storage, frontend, and account preferences.</p>
        </div>

        {isTemporaryUser && <TemporaryUserCard />}

        {/* Hosting Cards */}
        <HostingWeb2Web3ToggleCard
          title="Frontend"
          web2Label="Web2"
          web2Description="Vercel"
          web3Label="Web3"
          web3Description="ICP"
          web2Default={preferences?.frontendHosting === 'vercel'}
          web3Default={preferences?.frontendHosting === 'icp'}
          onWeb2Change={() => updatePreferences.mutate({ frontendHosting: 'vercel' })}
          onWeb3Change={() => updatePreferences.mutate({ frontendHosting: 'icp' })}
          isLoading={updatePreferences.isPending}
        />

        <HostingWeb2Web3ToggleCard
          title="Backend"
          web2Label="Web2"
          web2Description="Vercel"
          web3Label="Web3"
          web3Description="ICP"
          web2Default={preferences?.backendHosting === 'vercel'}
          web3Default={preferences?.backendHosting === 'icp'}
          onWeb2Change={() => updatePreferences.mutate({ backendHosting: 'vercel' })}
          onWeb3Change={() => updatePreferences.mutate({ backendHosting: 'icp' })}
          isLoading={updatePreferences.isPending}
        />

        <HostingWeb2Web3ToggleCard
          title="Database"
          web2Label="Web2"
          web2Description="Neon"
          web3Label="Web3"
          web3Description="ICP"
          web2Default={preferences?.databaseHosting?.[0] === 'neon'}
          web3Default={preferences?.databaseHosting?.[0] === 'icp'}
          onWeb2Change={() => updatePreferences.mutate({ databaseHosting: ['neon'] })}
          onWeb3Change={() => updatePreferences.mutate({ databaseHosting: ['icp'] })}
          isLoading={updatePreferences.isPending}
        />

        <HostingWeb2Web3ToggleCard
          title="Blob"
          web2Label="Web2"
          web2Description="S3"
          web3Label="Web3"
          web3Description="ICP"
          web2Default={preferences?.blobHosting?.[0] === 's3'}
          web3Default={preferences?.blobHosting?.[0] === 'icp'}
          showSharedCanister={true}
          sharedCanisterDefault={preferences?.blobHosting?.includes('icp')}
          onWeb2Change={() => updatePreferences.mutate({ blobHosting: ['s3'] })}
          onWeb3Change={() => updatePreferences.mutate({ blobHosting: ['icp'] })}
          onSharedCanisterChange={(enabled: boolean) => {
            const currentBlobHosting = preferences?.blobHosting || ['s3'];
            handleSharedCanisterChange(enabled, currentBlobHosting, updatePreferences);
          }}
          isLoading={updatePreferences.isPending}
        />

        {/* Hosting Preferences Component */}
        <HostingSinglePreferenceCard />

        {/* Settings Cards */}
        <NotificationsCard />
        <PrivacyCard />
        <AccountCard isTemporaryUser={isTemporaryUser || false} userId={userId || ''} />
        <UserRolesCard
          isAtLeastDeveloper={isAtLeastDeveloper}
          isAdmin={isAdmin}
          devMode={devMode}
          setDevMode={setDevMode}
        />
      </div>
    </div>
  );
}
