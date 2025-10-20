'use client';

import { ShareModalBase } from './base';

interface SendSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  onSend: (message: string) => Promise<void>;
}

export function SendSelectionModal({
  isOpen,
  onClose,
  selectedCount,
  onSend,
}: SendSelectionModalProps) {
  const handleSend = async (data: { email?: string; message: string }) => {
    await onSend(data.message);
  };

  return (
    <ShareModalBase
      isOpen={isOpen}
      onClose={onClose}
      onSend={handleSend}
      mode="photo-selection"
      selectedCount={selectedCount}
    />
  );
}
