'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DeleteAccountModal } from '@/components/modals/delete-account-modal';

export function AccountCard() {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Manage your account settings and preferences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full">
            Export My Data
          </Button>
          <Button variant="destructive" className="w-full" onClick={() => setIsDeleteModalOpen(true)}>
            Delete Account
          </Button>
        </CardContent>
      </Card>

      <DeleteAccountModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} />
    </>
  );
}
