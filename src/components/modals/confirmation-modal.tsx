'use client';

import { useState } from 'react';
import { fatLogger } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  isLoading?: boolean;
  loadingText?: string;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  isLoading = false,
  loadingText = 'Loading...',
}: ConfirmationModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsProcessing(true);
      await onConfirm();
    } catch (error) {
      // Error handling is done in the parent component
      fatLogger.error('Confirmation action failed', 'fe', { error });
    } finally {
      setIsProcessing(false);
    }
  };

  const isButtonDisabled = isLoading || isProcessing;
  const buttonText = isButtonDisabled ? loadingText : confirmText;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isButtonDisabled}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={handleConfirm}
            disabled={isButtonDisabled}
          >
            {buttonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
