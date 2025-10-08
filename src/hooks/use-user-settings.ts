'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { parseApiError, type NormalizedError } from '@/lib/error-handling';
import { fatLogger } from '@/lib/logger';
import { useICPIdentity } from '@/hooks/use-icp-identity';
import { useSession } from 'next-auth/react';
import { useAuthenticatedActor } from '@/hooks/use-authenticated-actor';

export interface UserSettings {
  hasAdvancedSettings: boolean;
  updatedAt: string;
}

// ---- Queries ----
export function useUserSettings() {
  const { isAuthenticated, principal, isLoading: icpLoading } = useICPIdentity();
  const { data: session, status: sessionStatus } = useSession();
  const { getActor } = useAuthenticatedActor();

  // Determine user authentication status
  const isICPUser = isAuthenticated && principal;
  const isNeonUser = session?.user?.id;
  const isDualUser = isICPUser && isNeonUser;

  // Create unique query key that includes both authentications if available
  const userKey = isDualUser
    ? `dual-${session.user.id}-${principal}`
    : isICPUser
      ? `icp-${principal}`
      : isNeonUser
        ? `web2-${session.user.id}`
        : 'anonymous';

  return useQuery<UserSettings, NormalizedError>({
    queryKey: ['user-settings', userKey],
    queryFn: async () => {
      if (isDualUser) {
        // Dual Access: Use Web2 as primary source, sync to ICP
        fatLogger.info('🔄 Fetching user settings with dual access - using Web2 as primary', 'fe', {
          userId: session.user.id,
          principal,
        });

        // Get Web2 settings (primary source)
        const res = await fetch('/api/user-settings', {
          cache: 'no-store',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw await parseApiError(res);
        const web2Settings = await res.json();

        // Sync to ICP canister
        try {
          const actor = await getActor();
          const result = await actor.update_user_settings({
            has_advanced_settings: [web2Settings.hasAdvancedSettings],
          });

          if ('Ok' in result) {
            fatLogger.info('✅ Dual access: Web2 settings synced to ICP', 'fe', {
              hasAdvancedSettings: web2Settings.hasAdvancedSettings ?? false,
              userId: session.user.id,
              principal,
            });
          } else {
            fatLogger.warn('⚠️ Dual access: Failed to sync Web2 settings to ICP', 'fe', {
              error: result.Err,
              userId: session.user.id,
              principal,
            });
          }
        } catch (error) {
          fatLogger.warn('⚠️ Dual access: Failed to sync to ICP, continuing with Web2 settings', 'fe', {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: session.user.id,
            principal,
          });
        }

        return web2Settings;
      } else if (isICPUser) {
        // Web3 Only: Call ICP canister
        fatLogger.info('🌐 Fetching user settings from ICP canister (Web3 only)', 'fe', { principal });

        const actor = await getActor();
        const result = await actor.get_user_settings();

        if ('Ok' in result) {
          const icpSettings = result.Ok;
          const settings: UserSettings = {
            hasAdvancedSettings: icpSettings.has_advanced_settings,
            updatedAt: new Date().toISOString(), // ICP doesn't have updatedAt, use current time
          };

          fatLogger.info('🚀 ICP user settings loaded (Web3 only)', 'fe', {
            settings,
            hasAdvancedSettings: settings.hasAdvancedSettings,
            principal,
          });

          return settings;
        } else {
          throw new Error(`ICP canister error: ${result.Err}`);
        }
      } else if (isNeonUser) {
        // Web2 Only: Call Neon database API
        fatLogger.info('🗄️ Fetching user settings from Neon database (Web2 only)', 'fe', { userId: session.user.id });

        const res = await fetch('/api/user-settings', {
          cache: 'no-store',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw await parseApiError(res);
        const data = await res.json();

        fatLogger.info('🚀 Web2 user settings loaded (Web2 only)', 'fe', {
          settings: data,
          hasAdvancedSettings: data.hasAdvancedSettings,
          userId: session.user.id,
        });

        return data;
      } else {
        throw new Error('No authentication found - user must be signed in with either Neon or ICP');
      }
    },
    enabled: !icpLoading && sessionStatus !== 'loading' && Boolean(isICPUser || isNeonUser),
    staleTime: Infinity, // Never consider data stale - fetch only once per session
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes after component unmounts
    refetchOnWindowFocus: false, // Don't refetch when switching tabs
    refetchOnMount: false, // Don't refetch when component mounts if data exists
    refetchOnReconnect: false, // Don't refetch when network reconnects
  });
}

// ---- Mutation ----
type UpdateBody = Partial<UserSettings>;
type Ctx = { previousData?: UserSettings };

export function useUpdateUserSettings() {
  const qc = useQueryClient();
  const { isAuthenticated, principal } = useICPIdentity();
  const { data: session } = useSession();
  const { getActor } = useAuthenticatedActor();

  const isICPUser = isAuthenticated && principal;
  const isNeonUser = session?.user?.id;
  const isDualUser = isICPUser && isNeonUser;
  const userKey = isDualUser
    ? `dual-${session.user.id}-${principal}`
    : isICPUser
      ? `icp-${principal}`
      : isNeonUser
        ? `web2-${session.user.id}`
        : 'anonymous';

  return useMutation<UserSettings, NormalizedError, UpdateBody, Ctx>({
    mutationFn: async body => {
      if (isDualUser) {
        // Dual Access: Update Web2 first, then sync to ICP
        fatLogger.info('🔄 Updating user settings with dual access - updating Web2 first', 'fe', {
          userId: session.user.id,
          principal,
          updates: body,
        });

        // Update Web2 (primary source)
        const res = await fetch('/api/user-settings', {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw await parseApiError(res);
        const web2Settings = await res.json();

        // Sync to ICP canister
        try {
          const actor = await getActor();
          const result = await actor.update_user_settings({
            has_advanced_settings: [web2Settings.hasAdvancedSettings],
          });

          if ('Ok' in result) {
            fatLogger.info('✅ Dual access: Settings updated in both Web2 and ICP', 'fe', {
              updatedSettings: web2Settings,
              userId: session.user.id,
              principal,
            });
          } else {
            fatLogger.warn('⚠️ Dual access: Web2 updated but ICP sync failed', 'fe', {
              error: result.Err,
              userId: session.user.id,
              principal,
            });
          }
        } catch (error) {
          fatLogger.warn('⚠️ Dual access: Web2 updated but ICP sync failed', 'fe', {
            error: error instanceof Error ? error.message : 'Unknown error',
            userId: session.user.id,
            principal,
          });
        }

        return web2Settings;
      } else if (isICPUser) {
        // Web3 Only: Update ICP canister
        fatLogger.info('🌐 Updating user settings in ICP canister (Web3 only)', 'fe', { principal, updates: body });

        const actor = await getActor();
        const result = await actor.update_user_settings({
          has_advanced_settings: body.hasAdvancedSettings ? [body.hasAdvancedSettings] : [],
        });

        if ('Ok' in result) {
          const icpSettings = result.Ok;
          const settings: UserSettings = {
            hasAdvancedSettings: icpSettings.has_advanced_settings,
            updatedAt: new Date().toISOString(),
          };

          fatLogger.info('✅ ICP user settings updated successfully (Web3 only)', 'fe', {
            updatedSettings: settings,
            principal,
          });

          return settings;
        } else {
          throw new Error(`ICP canister error: ${result.Err}`);
        }
      } else if (isNeonUser) {
        // Web2 Only: Update Neon database
        fatLogger.info('🗄️ Updating user settings in Neon database (Web2 only)', 'fe', {
          userId: session.user.id,
          updates: body,
        });

        const res = await fetch('/api/user-settings', {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw await parseApiError(res);
        const data = await res.json();

        fatLogger.info('✅ Web2 user settings updated successfully (Web2 only)', 'fe', {
          updatedSettings: data,
          userId: session.user.id,
        });

        return data;
      } else {
        throw new Error('No authentication found - user must be signed in with either Neon or ICP');
      }
    },

    // optimistic update
    onMutate: async newData => {
      await qc.cancelQueries({ queryKey: ['user-settings', userKey] });
      const previousData = qc.getQueryData<UserSettings>(['user-settings', userKey]);

      if (previousData) {
        qc.setQueryData<UserSettings>(['user-settings', userKey], {
          ...previousData,
          ...newData, // only overrides changed settings
          updatedAt: new Date().toISOString(),
        });
      }
      return { previousData };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previousData) qc.setQueryData(['user-settings', userKey], ctx.previousData);
    },

    onSuccess: data => {
      // Push authoritative server state; avoids a double flicker
      qc.setQueryData<UserSettings>(['user-settings', userKey], data);

      // Log successful settings update
      fatLogger.info('✅ User settings updated successfully', 'fe', {
        updatedSettings: data,
        userType: isICPUser ? 'Web3' : 'Web2',
      });
    },

    onSettled: () => {
      // Still refetch to reconcile any server-side changes
      qc.invalidateQueries({ queryKey: ['user-settings', userKey] });
    },
  });
}
