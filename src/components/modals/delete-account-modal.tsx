'use client';

import { signOut } from 'next-auth/react';
import { toast } from '@/hooks/use-toast';
import { fatLogger } from '@/lib/logger';
import { ConfirmationModal } from './confirmation-modal';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeleteAccountModal({
  isOpen,
  onClose,
}: DeleteAccountModalProps) {
  const handleDeleteAccount = async () => {
    try {
      const response = await fetch('/api/user/account', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete account');
      }

      // Show success message
      toast({
        title: 'Account Deleted',
        description: 'Your account has been successfully deleted.',
      });

      // Sign out and redirect to home
      await signOut({ callbackUrl: '/' });
    } catch (error) {
      fatLogger.error('Failed to delete account:', 'fe', {
        data: error instanceof Error ? error : undefined,
      });

      toast({
        title: 'Delete Failed',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to delete account. Please try again.',
        variant: 'destructive',
      });

      // Re-throw to prevent modal from closing on error
      throw error;
    }
  };

  return (
    <ConfirmationModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleDeleteAccount}
      title="Delete Account"
      description="Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your data."
      confirmText="Delete Account"
      cancelText="Cancel"
      variant="destructive"
      loadingText="Deleting..."
    />
  );
}
