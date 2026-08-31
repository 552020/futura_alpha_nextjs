'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { fatLogger } from '@/lib/logger';
import type { BackendActor } from '@/ic/backend';

/**
 * Greeting Component
 *
 * Component for testing backend connectivity by sending a greeting.
 * Allows users to enter their name and receive a personalized greeting from the backend.
 */
export function Greeting() {
  const [greeting, setGreeting] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const handleGreetSubmit = async () => {
    if (busy) return; // UX safety: prevent double-clicks
    setBusy(true);
    try {
      const nameInput = document.getElementById('name') as HTMLInputElement;
      const name = nameInput?.value || '';

      if (!name || name.trim() === '') {
        toast({
          title: 'Name Required',
          description: 'Please enter your name',
          variant: 'destructive',
        });
        return;
      }

      const { backendActor } = await import('@/ic/backend');
      const actor: BackendActor = await backendActor();

      const greetingResult = await actor.greet(name);
      setGreeting(greetingResult);

      toast({
        title: 'Greeting Sent',
        description: 'Successfully received greeting from backend',
      });
    } catch (error) {
      fatLogger.error('Greeting failed', 'fe', { data: error as Error });
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      toast({
        title: 'Greeting Failed',
        description: `Failed to send greeting: ${errorMessage}`,
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {greeting ? (
        <div className="flex gap-4">
          <Button onClick={() => setGreeting('')} className="w-32">
            Clear
          </Button>
          <div className="w-64 h-10 px-3 py-2 border border-input bg-background text-sm ring-offset-background flex items-center font-semibold text-foreground">
            {greeting}
          </div>
        </div>
      ) : (
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={busy}
            onClick={handleGreetSubmit}
            className="w-32"
          >
            {busy ? 'Sending...' : 'Send Greeting'}
          </Button>
          <Input
            id="name"
            name="name"
            type="text"
            placeholder="Enter your name"
            className="w-64"
            disabled={busy}
          />
        </div>
      )}
    </div>
  );
}
