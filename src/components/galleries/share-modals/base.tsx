'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface ShareModalBaseProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (data: { email?: string; message: string }) => Promise<void>;
  mode: 'gallery-share' | 'photo-selection';
  // For gallery share mode
  galleryTitle?: string;
  // For photo selection mode
  selectedCount?: number;
}

export function ShareModalBase({
  isOpen,
  onClose,
  onSend,
  mode,
  galleryTitle,
  selectedCount = 0,
}: ShareModalBaseProps) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSending) return;

    // Validation
    if (mode === 'gallery-share' && !email) {
      setError('Email address is required');
      return;
    }

    setError(null);
    setIsSending(true);

    try {
      await onSend({
        email: mode === 'gallery-share' ? email : undefined,
        message,
      });
      setEmail('');
      setMessage('');
      onClose();

      toast({
        title: 'Success',
        description:
          mode === 'gallery-share'
            ? `Gallery shared successfully with ${email}!`
            : 'Your selection has been sent successfully!',
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to ${mode === 'gallery-share' ? 'share gallery' : 'send selection'}`
      );
    } finally {
      setIsSending(false);
    }
  };

  const getTitle = () => {
    if (mode === 'gallery-share') {
      return 'Share Gallery';
    }
    return `Send ${selectedCount} Photo${selectedCount !== 1 ? 's' : ''}`;
  };

  const getDescription = () => {
    if (mode === 'gallery-share') {
      return `Share "${galleryTitle}" with another user. They will receive access to view all memories in this gallery.`;
    }
    return "Your selected photos will be sent to your photographer. Add an optional message below if you'd like to include any special notes or instructions.";
  };

  const getButtonText = () => {
    if (isSending) {
      return mode === 'gallery-share' ? 'Sharing...' : 'Sending...';
    }
    if (mode === 'gallery-share') {
      return 'Share Gallery';
    }
    return `Send ${selectedCount} Photo${selectedCount !== 1 ? 's' : ''}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'gallery-share' && (
            <div>
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSending}
                required
                className="mt-1"
              />
            </div>
          )}

          <div>
            <Label htmlFor="message">
              {mode === 'gallery-share' ? 'Message (optional)' : 'Message'}
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                mode === 'gallery-share'
                  ? 'Add an optional message to include with the share notification'
                  : 'Add an optional message (max 200 characters)'
              }
              maxLength={200}
              rows={4}
              className="w-full mt-1"
              disabled={isSending}
            />
            <p className="text-sm text-muted-foreground mt-1">
              {message.length}/200 characters
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSending || (mode === 'photo-selection' && selectedCount === 0)
              }
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {getButtonText()}
                </>
              ) : (
                getButtonText()
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
