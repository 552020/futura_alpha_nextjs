'use client';

import { SettingsCard } from './settings-card';

export function PrivacyCard() {
  return (
    <SettingsCard
      title="Privacy"
      description="Control who can see your memories and profile information."
      settings={[
        {
          id: 'profile-visibility',
          label: 'Public Profile',
          description: 'Allow others to find your profile and see basic information.',
          defaultChecked: false,
        },
        {
          id: 'memory-sharing',
          label: 'Memory Sharing',
          description: 'Allow family members to share your memories with others.',
          defaultChecked: true,
        },
      ]}
    />
  );
}
