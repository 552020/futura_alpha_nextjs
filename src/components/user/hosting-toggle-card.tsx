'use client';

/**
 * HostingToggleCard
 *
 * NOTE: This component is an ALTERNATIVE to HostingSinglePreferenceCard.
 * They do NOT work together - use one or the other.
 *
 * This component provides hosting provider selection using toggle switches.
 * It supports both single-selection (Web2 vs Web3 paradigm) and multi-selection modes.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

// Reusable toggle item component
export interface HostingToggleItemProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange?: (checked?: boolean) => void;
  disabled?: boolean;
  showSeparator?: boolean;
}

export function HostingToggleItem({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
  showSeparator = true,
}: HostingToggleItemProps) {
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor={id}>{label}</Label>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
        />
      </div>
      {showSeparator && <Separator />}
    </>
  );
}

export interface HostingToggleItem {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange?: (checked?: boolean) => void;
  disabled?: boolean;
}

export interface HostingToggleCardProps {
  title: string;
  items: HostingToggleItem[];
  isLoading?: boolean;
}

export function HostingToggleCard({
  title,
  items,
  isLoading = false,
}: HostingToggleCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item, index) => (
          <HostingToggleItem
            key={item.id}
            id={item.id}
            label={item.label}
            description={item.description}
            checked={item.checked}
            onCheckedChange={item.onCheckedChange}
            disabled={isLoading || item.disabled}
            showSeparator={index < items.length - 1}
          />
        ))}
      </CardContent>
    </Card>
  );
}
