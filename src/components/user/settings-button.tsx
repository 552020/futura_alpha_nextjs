'use client';

import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';

export function SettingsButton() {
  const router = useRouter();
  const params = useParams();
  const lang = (params.lang as string) || 'en';

  const handleSettingsClick = () => {
    // Navigate to settings page
    router.push(`/${lang}/user/settings`);
  };

  return (
    <Button variant="ghost" size="icon" onClick={handleSettingsClick} className="transition-opacity hover:opacity-80">
      <Settings className="h-[1.4rem] w-[1.4rem]" />
      <span className="sr-only">Settings</span>
    </Button>
  );
}
