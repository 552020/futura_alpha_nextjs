"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export function StorageCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Storage</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="web2-storage">Web2</Label>
            <p className="text-sm text-muted-foreground">Vercel + Neon</p>
          </div>
          <Switch id="web2-storage" defaultChecked />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="web3-storage">Web3</Label>
            <p className="text-sm text-muted-foreground">ICP</p>
          </div>
          <Switch id="web3-storage" />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="web3-managed">Shared Canister</Label>
          </div>
          <Switch id="web3-managed" defaultChecked />
        </div>
      </CardContent>
    </Card>
  );
}
