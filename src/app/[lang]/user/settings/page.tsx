'use client';

import { useAuthGuard } from '@/utils/authentication';
import { Loader2 } from 'lucide-react';
import RequireAuth from '@/components/auth/require-auth';
import { Card, CardContent } from '@/components/ui/card';
import { useInterface } from '@/contexts/interface-context';
import { HostingSinglePreferenceCard } from '@/components/user/hosting-single-preference-card';
import { HostingToggleCard } from '@/components/user/hosting-toggle-card';
import {
  useHostingPreferences,
  useUpdateHostingPreferences,
  getWeb2Enabled,
  getWeb3Enabled,
  createHostingPreferencesFromStacks,
} from '@/hooks/use-hosting-preferences';
import { useUserSettings } from '@/hooks/use-user-settings';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TemporaryUserCard,
  NotificationsCard,
  PrivacyCard,
  AccountCard,
  UserRolesCard,
  AdvancedSettingsCard,
} from '@/components/settings';

export default function SettingsPage() {
  const { isAuthorized, isTemporaryUser, isLoading } = useAuthGuard();
  const { isAdmin, devMode, setDevMode, isAtLeastDeveloper } = useInterface();
  const { data: preferences, isLoading: preferencesLoading, error: preferencesError } = useHostingPreferences();
  const updatePreferences = useUpdateHostingPreferences();
  const { data: userSettings } = useUserSettings();

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
      <div className="container mx-auto px-6 py-8 max-w-full">
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
      <div className="container mx-auto px-6 py-8 max-w-full">
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
    <div className="container mx-auto px-6 py-8 max-w-full">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your storage, frontend, and account preferences.</p>
        </div>

        {isTemporaryUser && <TemporaryUserCard />}

        {/* Advanced Settings */}
        <AdvancedSettingsCard />

        {/* Hosting Cards - Only show when advanced settings is enabled */}
        {userSettings?.hasAdvancedSettings && (
          <>
            <HostingToggleCard
              title="Frontend"
              items={[
                {
                  id: 'frontend-web2-vercel',
                  label: 'Web2',
                  description: 'Vercel',
                  checked: preferences?.frontendHosting === 'vercel',
                  onCheckedChange: () => updatePreferences.mutate({ frontendHosting: 'vercel' }),
                },
                {
                  id: 'frontend-web3-icp',
                  label: 'Web3',
                  description: 'ICP',
                  checked: preferences?.frontendHosting === 'icp',
                  onCheckedChange: () => updatePreferences.mutate({ frontendHosting: 'icp' }),
                },
              ]}
              isLoading={updatePreferences.isPending}
            />

            <HostingToggleCard
              title="Backend"
              items={[
                {
                  id: 'backend-web2-vercel',
                  label: 'Web2',
                  description: 'Vercel',
                  checked: getWeb2Enabled(preferences),
                  onCheckedChange: checked => {
                    const currentWeb3 = getWeb3Enabled(preferences);

                    if (checked) {
                      // Enable Web2 stack (backend + database)
                      const newPreferences = createHostingPreferencesFromStacks(true, currentWeb3);
                      updatePreferences.mutate(newPreferences);
                    } else {
                      // Disable Web2 stack - but prevent disabling both
                      if (!currentWeb3) {
                        alert('At least one hosting stack must be enabled. Please enable Web3 stack first.');
                        return;
                      }
                      const newPreferences = createHostingPreferencesFromStacks(false, currentWeb3);
                      updatePreferences.mutate(newPreferences);
                    }
                  },
                },
                {
                  id: 'backend-web3-icp',
                  label: 'Web3',
                  description: 'ICP',
                  checked: getWeb3Enabled(preferences),
                  onCheckedChange: checked => {
                    const currentWeb2 = getWeb2Enabled(preferences);

                    if (checked) {
                      // Enable Web3 stack (backend + database)
                      const newPreferences = createHostingPreferencesFromStacks(currentWeb2, true);
                      updatePreferences.mutate(newPreferences);
                    } else {
                      // Disable Web3 stack - but prevent disabling both
                      if (!currentWeb2) {
                        alert('At least one hosting stack must be enabled. Please enable Web2 stack first.');
                        return;
                      }
                      const newPreferences = createHostingPreferencesFromStacks(currentWeb2, false);
                      updatePreferences.mutate(newPreferences);
                    }
                  },
                },
              ]}
              isLoading={updatePreferences.isPending}
            />

            <HostingToggleCard
              title="Database"
              items={[
                {
                  id: 'database-web2-neon',
                  label: 'Web2',
                  description: 'Neon',
                  checked: getWeb2Enabled(preferences),
                  onCheckedChange: checked => {
                    const currentWeb3 = getWeb3Enabled(preferences);

                    if (checked) {
                      // Enable Web2 stack (backend + database)
                      const newPreferences = createHostingPreferencesFromStacks(true, currentWeb3);
                      updatePreferences.mutate(newPreferences);
                    } else {
                      // Disable Web2 stack - but prevent disabling both
                      if (!currentWeb3) {
                        alert('At least one hosting stack must be enabled. Please enable Web3 stack first.');
                        return;
                      }
                      const newPreferences = createHostingPreferencesFromStacks(false, currentWeb3);
                      updatePreferences.mutate(newPreferences);
                    }
                  },
                },
                {
                  id: 'database-web3-icp',
                  label: 'Web3',
                  description: 'ICP',
                  checked: getWeb3Enabled(preferences),
                  onCheckedChange: checked => {
                    const currentWeb2 = getWeb2Enabled(preferences);

                    if (checked) {
                      // Enable Web3 stack (backend + database)
                      const newPreferences = createHostingPreferencesFromStacks(currentWeb2, true);
                      updatePreferences.mutate(newPreferences);
                    } else {
                      // Disable Web3 stack - but prevent disabling both
                      if (!currentWeb2) {
                        alert('At least one hosting stack must be enabled. Please enable Web2 stack first.');
                        return;
                      }
                      const newPreferences = createHostingPreferencesFromStacks(currentWeb2, false);
                      updatePreferences.mutate(newPreferences);
                    }
                  },
                },
              ]}
              isLoading={updatePreferences.isPending}
            />

            <HostingToggleCard
              title="Blob"
              items={[
                {
                  id: 'blob-aws-s3',
                  label: 'AWS S3',
                  description: 'Amazon Web Services - Reliable cloud storage',
                  checked: preferences?.blobHosting?.includes('s3') ?? false,
                  onCheckedChange: checked => {
                    const currentBlobHosting = preferences?.blobHosting || [];
                    if (checked) {
                      // Add S3 if not already present
                      if (!currentBlobHosting.includes('s3')) {
                        updatePreferences.mutate({ blobHosting: [...currentBlobHosting, 's3'] });
                      }
                    } else {
                      // Remove S3, but ensure at least one provider remains
                      const newBlobHosting = currentBlobHosting.filter(provider => provider !== 's3');
                      if (newBlobHosting.length > 0) {
                        updatePreferences.mutate({ blobHosting: newBlobHosting });
                      }
                    }
                  },
                },
                {
                  id: 'blob-vercel',
                  label: 'Vercel Blob',
                  description: 'Vercel - Fast edge storage',
                  checked: preferences?.blobHosting?.includes('vercel_blob') ?? false,
                  onCheckedChange: checked => {
                    const currentBlobHosting = preferences?.blobHosting || [];
                    if (checked) {
                      // Add Vercel Blob if not already present
                      if (!currentBlobHosting.includes('vercel_blob')) {
                        updatePreferences.mutate({ blobHosting: [...currentBlobHosting, 'vercel_blob'] });
                      }
                    } else {
                      // Remove Vercel Blob, but ensure at least one provider remains
                      const newBlobHosting = currentBlobHosting.filter(provider => provider !== 'vercel_blob');
                      if (newBlobHosting.length > 0) {
                        updatePreferences.mutate({ blobHosting: newBlobHosting });
                      }
                    }
                  },
                },
                {
                  id: 'blob-icp',
                  label: 'ICP',
                  description: 'Internet Computer - Decentralized storage',
                  checked: preferences?.blobHosting?.includes('icp') ?? false,
                  onCheckedChange: checked => {
                    const currentBlobHosting = preferences?.blobHosting || [];
                    if (checked) {
                      // Add ICP if not already present
                      if (!currentBlobHosting.includes('icp')) {
                        updatePreferences.mutate({ blobHosting: [...currentBlobHosting, 'icp'] });
                      }
                    } else {
                      // Remove ICP, but ensure at least one provider remains
                      const newBlobHosting = currentBlobHosting.filter(provider => provider !== 'icp');
                      if (newBlobHosting.length > 0) {
                        updatePreferences.mutate({ blobHosting: newBlobHosting });
                      }
                    }
                  },
                },
              ]}
              isLoading={updatePreferences.isPending}
            />

            {/* Hosting Preferences Component */}
            <HostingSinglePreferenceCard />
          </>
        )}

        {/* Settings Cards */}
        <NotificationsCard />
        <PrivacyCard />
        <AccountCard />
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
