import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail } from "lucide-react";

type SendToPhotographerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (email: string, message: string) => Promise<void>;
  selectedCount: number;
};

export function SendToPhotographerModal({
  isOpen,
  onClose,
  onConfirm,
  selectedCount,
}: SendToPhotographerModalProps) {
  const [email, setEmail] = useState('Salih@example.com'); // Hardcoded as per requirements
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email) {
      setError('Email is required');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await onConfirm(email, message);
      onClose();
    } catch (err) {
      console.error('Error sending to photographer:', err);
      setError('Failed to send. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Send to Photographer</DialogTitle>
          <DialogDescription>
            You&apos;re about to send {selectedCount} {selectedCount === 1 ? 'image' : 'images'} to the photographer.
            Add an optional message below.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="col-span-3"
              disabled={true} // Disabled as email is hardcoded
            />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="message" className="text-right mt-2">
              Message
            </Label>
            <div className="col-span-3 space-y-2">
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Add a message for the photographer..."
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={handleSubmit}
            disabled={isLoading || !email}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send to Photographer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
