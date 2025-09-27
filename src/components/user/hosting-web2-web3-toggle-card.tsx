'use client';

/**
 * HostingWeb2Web3ToggleCard
 *
 * NOTE: This component is an ALTERNATIVE to HostingSinglePreferenceCard.
 * They do NOT work together - use one or the other.
 *
 * This component provides a simple Web2 vs Web3 paradigm selection using toggle switches.
 * It's designed for users who want to choose between Web2 and Web3 hosting paradigms
 * rather than specific hosting providers.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export interface HostingWeb2Web3ToggleCardProps {
  title: string;
  web2Label: string;
  web2Description: string;
  web3Label: string;
  web3Description: string;
  web2Default?: boolean;
  web3Default?: boolean;
  showSharedCanister?: boolean;
  sharedCanisterDefault?: boolean;
  onWeb2Change?: () => void;
  onWeb3Change?: () => void;
  onSharedCanisterChange?: (enabled: boolean) => void;
  isLoading?: boolean;
}

export function HostingWeb2Web3ToggleCard({
  title,
  web2Label,
  web2Description,
  web3Label,
  web3Description,
  web2Default = true,
  web3Default = false,
  showSharedCanister = false,
  sharedCanisterDefault = true,
  onWeb2Change,
  onWeb3Change,
  onSharedCanisterChange,
  isLoading = false,
}: HostingWeb2Web3ToggleCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor={`web2-${title.toLowerCase()}`}>{web2Label}</Label>
            <p className="text-sm text-muted-foreground">{web2Description}</p>
          </div>
          <Switch
            id={`web2-${title.toLowerCase()}`}
            checked={web2Default}
            onCheckedChange={onWeb2Change}
            disabled={isLoading}
          />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor={`web3-${title.toLowerCase()}`}>{web3Label}</Label>
            <p className="text-sm text-muted-foreground">{web3Description}</p>
          </div>
          <Switch
            id={`web3-${title.toLowerCase()}`}
            checked={web3Default}
            onCheckedChange={onWeb3Change}
            disabled={isLoading}
          />
        </div>
        {showSharedCanister && (
          <>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor={`web3-managed-${title.toLowerCase()}`}>Shared Canister</Label>
                <p className="text-sm text-muted-foreground">Enable shared ICP canister storage</p>
              </div>
              <Switch
                id={`web3-managed-${title.toLowerCase()}`}
                checked={sharedCanisterDefault}
                onCheckedChange={onSharedCanisterChange}
                disabled={isLoading}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
