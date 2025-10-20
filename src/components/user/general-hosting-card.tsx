'use client';

/**
 * GeneralHostingCard
 *
 * A simplified hosting selection card for non-advanced users.
 * Provides a single toggle between Web2 (Vercel/Neon/S3) and Web3 (ICP) stacks.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

export interface GeneralHostingCardProps {
  isWeb2Enabled: boolean;
  isWeb3Enabled: boolean;
  onWeb2Toggle: (checked: boolean) => void;
  onWeb3Toggle: (checked: boolean) => void;
  isLoading?: boolean;
}

export function GeneralHostingCard({
  isWeb2Enabled,
  isWeb3Enabled,
  onWeb2Toggle,
  onWeb3Toggle,
  isLoading = false,
}: GeneralHostingCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Hosting Stack
          <Badge variant="secondary" className="text-xs">
            Simple Mode
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Web2 Stack */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="web2-stack">Web2 Stack</Label>
            <p className="text-sm text-muted-foreground">
              Backend: Vercel, Database: Neon, Blob: S3 - Traditional cloud infrastructure
            </p>
          </div>
          <Switch id="web2-stack" checked={isWeb2Enabled} onCheckedChange={onWeb2Toggle} disabled={isLoading} />
        </div>

        <Separator />

        {/* Web3 Stack */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="web3-stack">Web3 Stack</Label>
            <p className="text-sm text-muted-foreground">
              Backend: ICP, Database: ICP, Blob: ICP - Decentralized blockchain infrastructure
            </p>
          </div>
          <Switch id="web3-stack" checked={isWeb3Enabled} onCheckedChange={onWeb3Toggle} disabled={isLoading} />
        </div>
      </CardContent>
    </Card>
  );
}
