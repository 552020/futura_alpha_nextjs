'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import posthog from 'posthog-js';
import { useEffect, useState } from 'react';

type PostHogEventProperties = {
  property?: string;
  button_type?: string;
  location?: string;
  action_type?: string;
  timestamp?: string;
  [key: string]: string | number | boolean | undefined;
};

export default function PostHogTestPage() {
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const [isPosthogReady, setIsPosthogReady] = useState(false);
  const [configDump, setConfigDump] = useState<string | null>(null);

  useEffect(() => {
    if (posthog.config) {
      setConfigDump(JSON.stringify(posthog.config, null, 2));
    }
  }, []);

  useEffect(() => {
    // Check if PostHog is properly initialized
    if (posthog.config) {
      setIsPosthogReady(true);
    }
  }, []);

  useEffect(() => {
    // expose to window
    // @ts-expect-error: This is a temporary workaround for type incompatibility
    window.posthog = posthog;
  }, []);

  const testEvents = [
    {
      name: 'test_event',
      properties: { property: 'test_value' },
    },
    {
      name: 'button_click',
      properties: { button_type: 'primary', location: 'test_page' },
    },
    {
      name: 'user_action',
      properties: { action_type: 'test', timestamp: new Date().toISOString() },
    },
  ];

  const handleTestEvent = (eventName: string, properties: PostHogEventProperties) => {
    posthog.capture(eventName, properties);
    setLastEvent(`Event &ldquo;${eventName}&rdquo; sent at ${new Date().toLocaleTimeString()}`);
    console.log('PostHog event sent:', { eventName, properties });
  };

  return (
    <div className="container mx-auto p-8">
      <Card className="p-6">
        <h1 className="text-2xl font-bold mb-4">PostHog Test Page</h1>

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">PostHog Status</h2>
          <p className={`text-sm ${isPosthogReady ? 'text-green-600' : 'text-red-600'}`}>
            PostHog is {isPosthogReady ? 'ready' : 'not ready'}
          </p>
          {isPosthogReady && <p className="text-sm text-muted-foreground mt-1">Project ID: {posthog.config.token}</p>}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Test Events</h2>
          <div className="grid gap-3">
            {testEvents.map(event => (
              <Button key={event.name} onClick={() => handleTestEvent(event.name, event.properties)} variant="outline">
                Send &ldquo;{event.name}&rdquo;
              </Button>
            ))}
          </div>
        </div>

        {lastEvent && (
          <div className="mt-6 p-4 bg-muted rounded-md">
            <h2 className="text-sm font-semibold mb-2">Last Event Sent</h2>
            <p className="text-sm" dangerouslySetInnerHTML={{ __html: lastEvent }} />
          </div>
        )}

        {configDump && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-2">Debug Information</h2>
            <pre className="text-xs bg-muted p-4 rounded-md overflow-auto">{configDump}</pre>
          </div>
        )}
      </Card>
    </div>
  );
}
