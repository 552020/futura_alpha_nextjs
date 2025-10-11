'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

interface SettingItem {
  id: string;
  label: string;
  description: string;
  defaultChecked?: boolean;
}

interface SettingsCardProps {
  title: string;
  description: string;
  settings: SettingItem[];
}

export function SettingsCard({ title, description, settings }: SettingsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {settings.map((setting, index) => (
          <div key={setting.id}>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor={setting.id}>{setting.label}</Label>
                <p className="text-sm text-muted-foreground">{setting.description}</p>
              </div>
              <Switch id={setting.id} defaultChecked={setting.defaultChecked} />
            </div>
            {index < settings.length - 1 && <Separator />}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
