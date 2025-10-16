import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { galleryService } from '@/services/gallery';
import { fatLogger } from '@/lib/logger';

interface GalleryShareDialogProps {
  galleryId: string;
  galleryTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShare?: () => void;
}

export function GalleryShareDialog({
  galleryId,
  galleryTitle,
  open,
  onOpenChange,
  onShare,
}: GalleryShareDialogProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Step 1: Look up or create user by email
      // For now, we'll create a temporary user if they don't exist
      // TODO: Add user lookup endpoint to check if user exists first
      const userResponse = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: email.split('@')[0], // Use email prefix as name
          email,
        }),
      });

      if (!userResponse.ok) {
        throw new Error('Failed to create or find user');
      }

      const { allUser } = await userResponse.json();

      // Step 2: Share the gallery with the user
      await galleryService.shareGallery(galleryId, {
        sharedWithType: 'user',
        sharedWithId: allUser.id,
      });

      toast({
        title: 'Success!',
        description: `Gallery "${galleryTitle}" shared successfully with ${email}!`,
      });
      
      setEmail('');
      onOpenChange(false);
      onShare?.();
    } catch (error) {
      fatLogger.error('Error sharing gallery:', 'fe', { data: error instanceof Error ? error : undefined });
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to share gallery',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Gallery</DialogTitle>
          <DialogDescription>
            Share &quot;{galleryTitle}&quot; with another user. They will receive access to view all memories in this gallery.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleShare}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Sharing...' : 'Share'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
