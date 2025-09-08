import { useMutation } from "@tanstack/react-query";

export interface UploadStorage {
  chosen_storage: "icp-canister" | "neon-db" | "vercel-blob";
  idem: string;
  expires_at: string; // ISO
  ttl_seconds: number;
  limits?: { inline_max: number; chunk_size: number; max_chunks: number };
  icp?: { canister_id: string; network?: string };
}

export interface UploadStorageResponse {
  uploadStorage: UploadStorage;
}

export function isUploadStorageExpired(expires_at: string): boolean {
  return Date.now() > new Date(expires_at).getTime();
}

type Vars = { preferred?: "icp-canister" | "neon-db" };

export function useUploadStorage() {
  return useMutation<UploadStorageResponse, Error, Vars>({
    mutationFn: async (vars) => {
      const res = await fetch("/api/upload/intent", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key":
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
        body: JSON.stringify({ storagePreference: { preferred: vars?.preferred } }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  });
}
