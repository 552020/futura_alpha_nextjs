'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

interface AccountCardProps {
  isTemporaryUser: boolean;
  userId: string;
}

export function AccountCard({ isTemporaryUser, userId }: AccountCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
        <CardDescription>Manage your account settings and preferences.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Account Type</Label>
            <p className="text-sm text-muted-foreground">
              {isTemporaryUser ? 'Temporary Account' : 'Permanent Account'}
            </p>
          </div>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>User ID</Label>
            <p className="text-sm text-muted-foreground font-mono">{userId}</p>
          </div>
        </div>
        <Separator />
        <Button variant="outline" className="w-full">
          Export My Data
        </Button>
        <Button variant="destructive" className="w-full">
          Delete Account
        </Button>
      </CardContent>
    </Card>
  );
}
