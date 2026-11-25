'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
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
import { activeBackendCanisterId } from '@/ic/backend';
import {
  writeCanisterChoice,
  type CanisterChoice,
} from '@/ic/canister-choice';
import { personalCanisterView } from '@/services/personal-canister';
import { fatLogger } from '@/lib/logger';

type Target = CanisterChoice['target'];

/**
 * Settings: where memories kept on the Internet Computer live. The shared
 * canister (default) or the user's personal canister, once they have one.
 * Changing it does not move anything: each canister keeps what was stored
 * in it, and the app shows the one that is chosen.
 */
export function CanisterChoiceCard({ lang = 'en' }: { lang?: string }) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [personalId, setPersonalId] = useState<string | null>(null);
  const [target, setTarget] = useState<Target>('shared');
  const [active, setActive] = useState<string | null>(null);
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
      const [entry, release] = await Promise.all([
        factory.my_personal_canister(),
        factory.release_info(),
      ]);
      const view = personalCanisterView(entry[0], release[0]);
      const id = view.state === 'ready' ? view.canisterId : null;
      setPersonalId(id);

      const activeId = activeBackendCanisterId(identity);
      setActive(activeId);
      setTarget(id !== null && activeId === id ? 'personal' : 'shared');
    } catch (e) {
      fatLogger.error('Canister choice: load failed', 'fe', {
        data: e instanceof Error ? e : undefined,
      });
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const choose = async (next: Target) => {
    if (busy || next === target) return;
    setBusy(true);
    setError(null);
    try {
      if (next === 'personal') {
        if (!personalId) throw new Error('You have no personal canister yet');
        const authClient = await getAuthClient();
        const identity = authClient.getIdentity();
        // A new personal canister is empty: it needs the owner's capsule
        // before memories can go into it
        const personal = await personalBackendActor(identity, personalId);
        const capsule = await personal.capsules_read_basic([]);
        if ('Err' in capsule) {
          const created = await personal.capsules_create([]);
          if ('Err' in created) {
            throw new Error(
              `Could not prepare your canister: ${JSON.stringify(created.Err)}`
            );
          }
        }
        writeCanisterChoice({
          target: 'personal',
          canisterId: personalId,
          principal: identity.getPrincipal().toText(),
        });
      } else {
        writeCanisterChoice({ target: 'shared' });
      }
      // Actors and file links are cached all over the app: start clean
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  if (!FACTORY_CANISTER_ID) return null;

  const option = (
    value: Target,
    title: string,
    text: string,
    disabled: boolean
  ) => (
    <label
      className={`flex items-start gap-3 rounded-md border p-3 ${
        disabled ? 'opacity-60' : 'cursor-pointer'
      } ${target === value ? 'border-primary' : ''}`}
    >
      <input
        type="radio"
        name="icp-canister-choice"
        className="mt-1"
        checked={target === value}
        disabled={disabled || busy}
        onChange={() => void choose(value)}
        data-testid={`canister-choice-${value}`}
      />
      <span className="space-y-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-sm text-muted-foreground">{text}</span>
      </span>
    </label>
  );

  return (
    <Card data-testid="canister-choice-card">
      <CardHeader>
        <CardTitle>Where your ICP memories live</CardTitle>
        <CardDescription>
          Memories you keep on the Internet Computer go into one canister.
          Changing this moves nothing: each canister keeps what you stored in
          it, and the app shows the one you choose here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {signedIn === false && (
          <p className="text-sm text-muted-foreground">
            Connect your Internet Identity on the{' '}
            <Link className="underline" href={`/${lang}/user/icp`}>
              ICP page
            </Link>{' '}
            to choose.
          </p>
        )}

        {signedIn && (
          <>
            {option(
              'shared',
              'Shared canister',
              'Run by Futura for all users. Your memories are in your own capsule inside it.',
              false
            )}
            {option(
              'personal',
              'My own canister',
              personalId
                ? `Only you control it: ${personalId}`
                : 'You have no personal canister yet. Create one on the ICP page first.',
              !personalId
            )}
            {!personalId && (
              <p className="text-sm">
                <Link className="underline" href={`/${lang}/user/icp`}>
                  Go to the ICP page
                </Link>
              </p>
            )}
            {active && (
              <p className="text-sm text-muted-foreground">
                In use now:{' '}
                <span
                  className="font-mono"
                  data-testid="canister-choice-active"
                >
                  {active}
                </span>
                . Saved in this browser; choose again on another device.
              </p>
            )}
            {busy && <p className="text-sm">Switching…</p>}
          </>
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
