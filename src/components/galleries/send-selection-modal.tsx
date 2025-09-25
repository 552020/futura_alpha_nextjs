'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

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
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSending) return;

    setError(null);
    setIsSending(true);

    try {
      await onSend(message);
      setMessage('');
      onClose();
      toast({
        title: 'Success',
        description: 'Your selection has been sent successfully!',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send selection');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md border border-gray-200">
        <h2 className="text-xl font-semibold mb-2">Send {selectedCount} Photo{selectedCount !== 1 ? 's' : ''}</h2>
        
        <p className="text-sm text-gray-600 mb-4">
          Your selected photos will be sent to your photographer. 
          Add an optional message below if you&apos;d like to include any special notes or instructions.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add an optional message (max 200 characters)"
              maxLength={200}
              rows={4}
              className="w-full"
              disabled={isSending}
            />
            <p className="text-sm text-muted-foreground mt-1">
              {message.length}/200 characters
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex justify-end space-x-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSending || selectedCount === 0}>
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                `Send ${selectedCount} Photo${selectedCount !== 1 ? 's' : ''}`
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
