import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type Pref = "neon" | "icp" | "dual";
export type Primary = "neon-db" | "icp-canister" | "vercel-blob";

export interface StoragePreferences {
  preference: Pref;
  primary: Primary;
  allowed: { icp: boolean; neon: boolean };
  updatedAt?: string;
}

// ---- enum ↔ toggle helpers ----
export function prefToToggles(pref: Pref) {
  return {
    neon: pref === "neon" || pref === "dual",
    icp: pref === "icp" || pref === "dual",
  };
}

export function togglesToPref(neon: boolean, icp: boolean): Pref {
  if (neon && icp) return "dual";
  if (neon) return "neon";
  if (icp) return "icp";
  return "neon"; // MVP rule: at least one on
}

// ---- API helpers ----
async function parseError(res: Response) {
  try {
    const data = await res.json();
    return new Error(data?.message || `HTTP ${res.status} ${res.statusText}`);
  } catch {
    const text = await res.text();
    return new Error(text || `HTTP ${res.status} ${res.statusText}`);
  }
}

function idempotencyKey() {
  // Safari < 15.4 fallback
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ---- Queries ----
export function useStoragePreferences() {
  return useQuery<StoragePreferences>({
    queryKey: ["me", "storage"],
    queryFn: async () => {
      const res = await fetch("/api/me/storage", {
        cache: "no-store",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw await parseError(res);
      return res.json();
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
}

// ---- Mutation ----
type UpdateBody = { preference: Pref; primary: Primary };
type Ctx = { previousData?: StoragePreferences };

export function useUpdateStoragePreferences() {
  const qc = useQueryClient();

  return useMutation<StoragePreferences, Error, UpdateBody, Ctx>({
    mutationFn: async (body) => {
      const res = await fetch("/api/me/storage", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey(),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw await parseError(res);
      return res.json();
    },

    // optimistic update
    onMutate: async (newData) => {
      await qc.cancelQueries({ queryKey: ["me", "storage"] });
      const previousData = qc.getQueryData<StoragePreferences>(["me", "storage"]);

      if (previousData) {
        qc.setQueryData<StoragePreferences>(["me", "storage"], {
          ...previousData,
          ...newData, // only overrides preference/primary
          updatedAt: new Date().toISOString(),
        });
      }
      return { previousData };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previousData) qc.setQueryData(["me", "storage"], ctx.previousData);
    },

    onSuccess: (data) => {
      // Push authoritative server state; avoids a double flicker
      qc.setQueryData<StoragePreferences>(["me", "storage"], data);
    },

    onSettled: () => {
      // Still refetch to reconcile policy/allowed flags if they changed
      qc.invalidateQueries({ queryKey: ["me", "storage"] });
    },
  });
}
