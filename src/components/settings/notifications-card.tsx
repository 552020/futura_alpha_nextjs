'use client';

import { SettingsCard } from './settings-card';

export function NotificationsCard() {
  return (
    <SettingsCard
      title="Notifications"
      description="Choose how you want to be notified about your memories and family updates."
      settings={[
        {
          id: 'email-notifications',
          label: 'Email Notifications',
          description: 'Receive updates about new memories and family activity.',
          defaultChecked: true,
        },
        {
          id: 'push-notifications',
          label: 'Push Notifications',
          description: 'Get notified when someone shares memories with you.',
          defaultChecked: false,
        },
      ]}
    />
  );
}
