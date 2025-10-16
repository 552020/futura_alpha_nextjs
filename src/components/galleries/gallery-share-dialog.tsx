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
import type { DBUser, DBAllUser } from '@/db/types';

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
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupResult, setLookupResult] = useState<{
    found: boolean;
    user?: DBUser;
    allUser?: DBAllUser;
  } | null>(null);
  const { toast } = useToast();

  const handleLookup = async () => {
    if (!email) {
      toast({
        title: 'Error',
        description: 'Please enter an email address',
        variant: 'destructive',
      });
      return;
    }

    setIsLookingUp(true);
    setLookupResult(null);

    try {
      const response = await fetch(`/api/users/lookup?email=${encodeURIComponent(email)}`);
      
      if (response.status === 404) {
        setLookupResult({ found: false });
        toast({
          title: 'User not found',
          description: `No user found with email: ${email}`,
        });
      } else if (response.ok) {
        const data = await response.json();
        setLookupResult({ found: true, user: data.user, allUser: data.allUser });
        toast({
          title: 'User found!',
          description: `Found user: ${data.user.name || data.user.email}`,
        });
      } else {
        throw new Error('Failed to lookup user');
      }
    } catch (error) {
      fatLogger.error('Error looking up user:', 'fe', { data: error instanceof Error ? error : undefined });
      toast({
        title: 'Error',
        description: 'Failed to lookup user',
        variant: 'destructive',
      });
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let allUserId: string;
      let userName: string;
      let isNewUser = false;

      // Step 1: Check if user exists by email
      const lookupResponse = await fetch(`/api/users/lookup?email=${encodeURIComponent(email)}`);
      
      if (lookupResponse.ok) {
        // User exists
        const { allUser, user } = await lookupResponse.json();
        allUserId = allUser.id;
        userName = user.name || user.email;
      } else if (lookupResponse.status === 404) {
        // User doesn't exist, create temporary user
        isNewUser = true;
        const userResponse = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: email.split('@')[0], // Use email prefix as name
            email,
          }),
        });

        if (!userResponse.ok) {
          throw new Error('Failed to create temporary user');
        }

        const { allUser, user } = await userResponse.json();
        allUserId = allUser.id;
        userName = user.name || email.split('@')[0];
      } else {
        throw new Error('Failed to lookup user');
      }

      // Step 2: Share the gallery with the user
      await galleryService.shareGallery(galleryId, {
        sharedWithType: 'user',
        sharedWithId: allUserId,
      });

      // Step 3: Send email notification
      try {
        await fetch('/api/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: email,
            subject: `Gallery "${galleryTitle}" has been shared with you`,
            html: `
              <h2>Gallery Shared</h2>
              <p>Hi ${userName},</p>
              <p>A gallery titled "<strong>${galleryTitle}</strong>" has been shared with you.</p>
              <p>You can now view all memories in this gallery.</p>
              ${isNewUser ? '<p>A temporary account has been created for you. You can sign in to access the gallery.</p>' : ''}
              <p>Best regards,<br/>Your Gallery Team</p>
            `,
            text: `Hi ${userName},\n\nA gallery titled "${galleryTitle}" has been shared with you.\n\nYou can now view all memories in this gallery.\n\n${isNewUser ? 'A temporary account has been created for you. You can sign in to access the gallery.\n\n' : ''}Best regards,\nYour Gallery Team`,
          }),
        });
      } catch (emailError) {
        // Log email error but don't fail the share operation
        fatLogger.error('Error sending share notification email:', 'fe', { data: emailError instanceof Error ? emailError : undefined });
      }

      toast({
        title: 'Success!',
        description: `Gallery "${galleryTitle}" shared successfully with ${email}!`,
      });
      
      setEmail('');
      setLookupResult(null);
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
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    setLookupResult(null);
                  }}
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLookup}
                  disabled={isLookingUp || isLoading || !email}
                >
                  {isLookingUp ? 'Looking up...' : 'Lookup'}
                </Button>
              </div>
            </div>
            
            {lookupResult && (
              <div className={`p-3 rounded-md border ${lookupResult.found ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                {lookupResult.found && lookupResult.user ? (
                  <div className="space-y-2">
                    <p className="font-semibold text-green-800">User Found</p>
                    <div className="text-sm text-green-700 space-y-1">
                      <p><strong>Name:</strong> {lookupResult.user.name || 'N/A'}</p>
                      <p><strong>Email:</strong> {lookupResult.user.email}</p>
                      {lookupResult.user.username && <p><strong>Username:</strong> {lookupResult.user.username}</p>}
                      <p><strong>User Type:</strong> {lookupResult.user.userType || lookupResult.allUser?.type || 'N/A'}</p>
                      {lookupResult.user.role && <p><strong>Role:</strong> {lookupResult.user.role}</p>}
                      {lookupResult.user.plan && <p><strong>Plan:</strong> {lookupResult.user.plan}</p>}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-yellow-800">User Not Found</p>
                    <p className="text-sm text-yellow-700">A temporary user will be created when you share.</p>
                  </div>
                )}
              </div>
            )}
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
