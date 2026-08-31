'use client';
import { useEffect, useState, useCallback } from 'react';
import { getAuthClient } from '@/ic/ii';

const ANON = '2vxsx-fae';
const CHANNEL = 'icp-auth';

export function useICPIdentity() {
  const [principal, setPrincipal] = useState<string | null>(null);
  const [isAuthenticated, setIsAuth] = useState(false);
  const [isLoading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const c = await getAuthClient();
      const authed = await c.isAuthenticated();
      if (!authed) {
        setPrincipal(null);
        setIsAuth(false);
      } else {
        const p = c.getIdentity().getPrincipal().toText();
        setPrincipal(p === ANON ? null : p);
        setIsAuth(p !== ANON);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // initial
    refresh();
    // focus/visibility
    const onFocus = () => refresh();
    const onVis = () => document.visibilityState === 'visible' && refresh();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    // cross-tab via BroadcastChannel
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(CHANNEL);
      bc.onmessage = (e) => e.data?.type === 'identity-changed' && refresh();
    } catch {
      // Fallback: storage ping
      const key = '__icp_identity_ping__';
      const onStorage = (ev: StorageEvent) => ev.key === key && refresh();
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    }
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
      bc?.close();
    };
  }, [refresh]);

  return { principal, isAuthenticated, isLoading, refresh };
}
