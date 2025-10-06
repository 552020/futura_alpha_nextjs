'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useUserSettings, useUpdateUserSettings } from '@/hooks/use-user-settings';

export function AdvancedSettingsCard() {
  const { data: userSettings } = useUserSettings();
  const updateUserSettings = useUpdateUserSettings();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Advanced Settings</CardTitle>
        <CardDescription>Enable advanced features and controls for power users.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="advanced-settings">Show Advanced Settings</Label>
            <p className="text-sm text-muted-foreground">
              Enable advanced hosting preferences and database switching options.
            </p>
          </div>
          <Switch
            id="advanced-settings"
            checked={userSettings?.hasAdvancedSettings || false}
            onCheckedChange={checked => updateUserSettings.mutate({ hasAdvancedSettings: checked })}
            disabled={updateUserSettings.isPending}
          />
        </div>
      </CardContent>
    </Card>
  );
}
