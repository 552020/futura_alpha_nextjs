'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getAuthClient } from '@/ic/ii';
import {
  FACTORY_CANISTER_ID,
  factoryActor,
  personalBackendActor,
} from '@/ic/factory';
import {
  formatCycles,
  mayCreatePersonalCanister,
  personalCanisterView,
  type PersonalCanisterView,
} from '@/services/personal-canister';
import { fatLogger } from '@/lib/logger';

/**
 * Your personal canister: created by the factory, then handed over so that
 * you are its only controller (see docs/desk/personal-canisters.md).
 */
export function PersonalCanisterCard() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [view, setView] = useState<PersonalCanisterView | null>(null);
  const [mode, setMode] = useState<string | null>(null);
  const [mayCreate, setMayCreate] = useState(true);
  const [cycles, setCycles] = useState<string | null>(null);
  const [principal, setPrincipal] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const authClient = await getAuthClient();
      if (!(await authClient.isAuthenticated())) {
        setSignedIn(false);
        return;
      }
      setSignedIn(true);
      const identity = authClient.getIdentity();
      const factory = await factoryActor(identity);
      const [entry, release, credits, open] = await Promise.all([
        factory.my_personal_canister(),
        factory.release_info(),
        factory.my_personal_credits(),
        factory.personal_open(),
      ]);
      setMayCreate(mayCreatePersonalCanister(credits, open));
      setPrincipal(identity.getPrincipal().toText());
      const next = personalCanisterView(entry[0], release[0]);
      setView(next);
      if (next.state === 'ready') {
        // Ask the canister itself whose it is
        const personal = await personalBackendActor(identity, next.canisterId);
        const m = await personal.canister_mode();
        setMode(
          'Personal' in m
            ? m.Personal.owner.toText() === identity.getPrincipal().toText()
              ? 'yours'
              : 'someone-else'
            : 'shared'
        );
        // What it can still spend before it freezes. Canisters created
        // before this existed have no such method: then show nothing.
        try {
          setCycles(formatCycles(await personal.cycles_liquid_balance()));
        } catch {
          setCycles(null);
        }
      }
    } catch (e) {
      fatLogger.error('Personal canister: load failed', 'fe', {
        data: e instanceof Error ? e : undefined,
      });
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const authClient = await getAuthClient();
      const factory = await factoryActor(authClient.getIdentity());
      const result = await factory.create_personal_canister();
      if ('Err' in result) throw new Error(result.Err);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!FACTORY_CANISTER_ID) return null;

  return (
    <Card data-testid="personal-canister-card">
      <CardHeader>
        <CardTitle>Your personal canister</CardTitle>
        <CardDescription>
          A canister of your own on the Internet Computer. Futura creates it and
          hands it over: after that only you control it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {signedIn === false && (
          <p className="text-sm text-muted-foreground">
            Connect your Internet Identity above to create or see it.
          </p>
        )}

        {signedIn && view?.state === 'none' && !mayCreate && (
          <div
            className="space-y-2 text-sm"
            data-testid="personal-canister-no-credit"
          >
            <p>
              Personal canisters are by invitation for now: each one costs
              Futura real cycles. Send us your principal and we will allow one
              for you.
            </p>
            <p className="font-mono break-all">{principal}</p>
          </div>
        )}

        {signedIn && view?.state === 'none' && mayCreate && (
          <Button
            onClick={create}
            disabled={busy}
            data-testid="personal-canister-create"
          >
            {busy ? 'Creating…' : 'Create my personal canister'}
          </Button>
        )}

        {signedIn && view?.state === 'creating' && (
          <div className="space-y-2">
            <p className="text-sm">
              Creation stopped at step “{view.step}”
              {view.error ? `: ${view.error}` : '.'}
            </p>
            <Button onClick={create} disabled={busy}>
              {busy ? 'Continuing…' : 'Continue'}
            </Button>
          </div>
        )}

        {signedIn && view?.state === 'ready' && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Canister</dt>
            <dd className="font-mono" data-testid="personal-canister-id">
              {view.canisterId}
            </dd>
            <dt className="text-muted-foreground">Control</dt>
            <dd>
              {mode === 'yours' ? (
                <Badge
                  variant="outline"
                  className="text-green-600 border-green-600"
                  data-testid="personal-canister-mode"
                >
                  Only you
                </Badge>
              ) : mode ? (
                <Badge variant="outline" className="text-red-600">
                  Unexpected: {mode}
                </Badge>
              ) : (
                'Checking…'
              )}
            </dd>
            {cycles && (
              <>
                <dt className="text-muted-foreground">Cycles</dt>
                <dd data-testid="personal-canister-cycles">
                  {cycles} left to spend. Futura tops it up when it runs low.
                </dd>
              </>
            )}
            <dt className="text-muted-foreground">Version</dt>
            <dd>
              {view.version ?? 'unknown'}
              {view.updateAvailable && view.latestVersion
                ? ` (version ${view.latestVersion} is available)`
                : ''}
            </dd>
          </dl>
        )}

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
