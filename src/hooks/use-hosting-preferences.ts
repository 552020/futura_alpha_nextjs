import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { parseApiError, normalizeError, type NormalizedError } from '@/lib/error-handling';
import { fatLogger } from '@/lib/logger';

// Hosting preference types matching the database schema
export type FrontendHosting = 'vercel' | 'icp';
export type BackendHosting = 'vercel' | 'icp';
export type DatabaseHosting = 'neon' | 'icp';
export type BlobHosting = 's3' | 'vercel_blob' | 'icp' | 'arweave' | 'ipfs' | 'neon';

export interface HostingPreferences {
  frontendHosting: FrontendHosting;
  backendHosting: BackendHosting;
  databaseHosting: DatabaseHosting[];
  blobHosting: BlobHosting[];
  // Advanced database switching for dashboard
  advancedDatabaseSwitching?: boolean;
  currentDatabaseView?: DatabaseHosting;
  updatedAt?: string;
}

// ---- hosting preference helpers ----
export function getDefaultHostingPreferences(): HostingPreferences {
  return {
    frontendHosting: 'vercel',
    backendHosting: 'vercel',
    databaseHosting: ['neon'],
    blobHosting: ['s3'],
  };
}

export function isHostingPreferenceValid(prefs: Partial<HostingPreferences>): prefs is HostingPreferences {
  return !!(prefs.frontendHosting && prefs.backendHosting && prefs.databaseHosting && prefs.blobHosting);
}

// ---- advanced database switching helpers ----
export function isAdvancedDatabaseSwitchingEnabled(preferences?: HostingPreferences): boolean {
  return !!(preferences?.advancedDatabaseSwitching && preferences?.databaseHosting?.length > 1);
}

export function getAvailableDatabases(preferences?: HostingPreferences): DatabaseHosting[] {
  return preferences?.databaseHosting || ['neon'];
}

export function getCurrentDatabaseView(preferences?: HostingPreferences): DatabaseHosting {
  return preferences?.currentDatabaseView || preferences?.databaseHosting?.[0] || 'neon';
}

export function canSwitchDatabase(preferences?: HostingPreferences): boolean {
  return isAdvancedDatabaseSwitchingEnabled(preferences) && getAvailableDatabases(preferences).length > 1;
}

// Check if both data sources are available for switching in dashboard
export function canSwitchDashboardDataSources(preferences?: HostingPreferences): boolean {
  if (!preferences) return false;
  return preferences.databaseHosting.includes('neon') && preferences.databaseHosting.includes('icp');
}

// ---- automatic data source selection for dashboard ----
export function getRecommendedDashboardDataSource(preferences?: HostingPreferences): 'neon' | 'icp' {
  if (!preferences) return 'neon';

  const { backendHosting, databaseHosting } = preferences;

  // If backend is ICP, prefer ICP data source
  if (backendHosting === 'icp') {
    return 'icp';
  }

  // If backend is Vercel but only ICP database is available, use ICP
  if (backendHosting === 'vercel' && databaseHosting.length === 1 && databaseHosting[0] === 'icp') {
    return 'icp';
  }

  // If both databases are available, prefer Neon (default)
  if (databaseHosting.includes('neon') && databaseHosting.includes('icp')) {
    return 'neon';
  }

  // If only Neon is available, use Neon
  if (databaseHosting.includes('neon')) {
    return 'neon';
  }

  // If only ICP is available, use ICP
  if (databaseHosting.includes('icp')) {
    return 'icp';
  }

  // Fallback to Neon
  return 'neon';
}

// ---- hosting stack helpers (for checkbox logic) ----
export function getWeb2Enabled(preferences?: HostingPreferences): boolean {
  return !!(preferences?.backendHosting === 'vercel' || preferences?.databaseHosting?.includes('neon'));
}

export function getWeb3Enabled(preferences?: HostingPreferences): boolean {
  return !!(preferences?.backendHosting === 'icp' || preferences?.databaseHosting?.includes('icp'));
}

export function createHostingPreferencesFromStacks(
  web2Enabled: boolean,
  web3Enabled: boolean
): Partial<HostingPreferences> {
  // Determine backend hosting - if both are enabled, prefer the first one, otherwise use the enabled one
  let backendHosting: BackendHosting;
  if (web2Enabled && web3Enabled) {
    // Both enabled - use Web2 as primary backend
    backendHosting = 'vercel';
  } else if (web2Enabled) {
    backendHosting = 'vercel';
  } else if (web3Enabled) {
    backendHosting = 'icp';
  } else {
    // Neither enabled - this should be prevented by validation
    backendHosting = 'vercel'; // fallback
  }

  // Create database hosting array
  const databaseHosting: DatabaseHosting[] = [];
  if (web2Enabled) databaseHosting.push('neon');
  if (web3Enabled) databaseHosting.push('icp');

  // Create blob hosting array
  const blobHosting: BlobHosting[] = [];
  if (web2Enabled) blobHosting.push('s3');
  if (web3Enabled) blobHosting.push('icp');

  return {
    backendHosting,
    databaseHosting,
    blobHosting,
  };
}

// ---- API helpers ----
async function parseError(res: Response): Promise<NormalizedError> {
  const apiError = await parseApiError(res);
  return normalizeError(apiError);
}

function idempotencyKey() {
  // Safari < 15.4 fallback
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ---- Queries ----
export function useHostingPreferences() {
  return useQuery<HostingPreferences, NormalizedError>({
    queryKey: ['me', 'hosting-preferences'],
    queryFn: async () => {
      const res = await fetch('/api/me/hosting-preferences', {
        cache: 'no-store',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw await parseError(res);
      const data = await res.json();

      // Log when preferences are loaded
      fatLogger.debug('🚀 [HOSTING PREFERENCES] Loaded from API:', 'fe', {
        preferences: data,
        isDefault: JSON.stringify(data) === JSON.stringify(getDefaultHostingPreferences()),
        backendHosting: data.backendHosting,
        databaseHosting: data.databaseHosting,
        blobHosting: data.blobHosting,
      });

      fatLogger.info('🚀 Hosting preferences loaded', 'fe', {
        preferences: data,
        isDefault: JSON.stringify(data) === JSON.stringify(getDefaultHostingPreferences()),
      });

      return data;
    },
    staleTime: Infinity, // Never consider data stale - fetch only once per session
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes after component unmounts
    refetchOnWindowFocus: false, // Don't refetch when switching tabs
    refetchOnMount: false, // Don't refetch when component mounts if data exists
    refetchOnReconnect: false, // Don't refetch when network reconnects
  });
}

// ---- Mutation ----
type UpdateBody = Partial<HostingPreferences>;
type Ctx = { previousData?: HostingPreferences };

export function useUpdateHostingPreferences() {
  const qc = useQueryClient();

  return useMutation<HostingPreferences, NormalizedError, UpdateBody, Ctx>({
    mutationFn: async body => {
      fatLogger.debug('🔄 [HOSTING PREFERENCES] Updating preferences:', 'fe', body);

      const res = await fetch('/api/me/hosting-preferences', {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey(),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw await parseError(res);
      return res.json();
    },

    // optimistic update
    onMutate: async newData => {
      await qc.cancelQueries({ queryKey: ['me', 'hosting-preferences'] });
      const previousData = qc.getQueryData<HostingPreferences>(['me', 'hosting-preferences']);

      if (previousData) {
        qc.setQueryData<HostingPreferences>(['me', 'hosting-preferences'], {
          ...previousData,
          ...newData, // only overrides changed hosting preferences
          updatedAt: new Date().toISOString(),
        });
      }
      return { previousData };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previousData) qc.setQueryData(['me', 'hosting-preferences'], ctx.previousData);
    },

    onSuccess: data => {
      // Push authoritative server state; avoids a double flicker
      qc.setQueryData<HostingPreferences>(['me', 'hosting-preferences'], data);

      // Log successful preference update
      fatLogger.debug('✅ [HOSTING PREFERENCES] Updated successfully:', 'fe', {
        updatedPreferences: data,
        backendHosting: data.backendHosting,
        databaseHosting: data.databaseHosting,
        blobHosting: data.blobHosting,
      });

      fatLogger.info('✅ Hosting preferences updated successfully', 'fe', {
        updatedPreferences: data,
      });
    },

    onSettled: () => {
      // Still refetch to reconcile any server-side changes
      qc.invalidateQueries({ queryKey: ['me', 'hosting-preferences'] });
    },
  });
}
