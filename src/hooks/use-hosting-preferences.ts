import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { parseApiError, normalizeError, type NormalizedError } from '@/lib/error-handling';
import { logger } from '@/lib/logger';

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
      logger.hostingPreferences().info('🚀 Hosting preferences loaded', {
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
      logger.hostingPreferences().info('✅ Hosting preferences updated successfully', {
        updatedPreferences: data,
      });
    },

    onSettled: () => {
      // Still refetch to reconcile any server-side changes
      qc.invalidateQueries({ queryKey: ['me', 'hosting-preferences'] });
    },
  });
}
