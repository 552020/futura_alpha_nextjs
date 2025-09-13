import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ShareDialogProps {
  memoryId: string;
  onShare?: () => void;
}

export function ShareDialog({ memoryId, onShare }: ShareDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`/api/memories/${memoryId}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: {
            type: "user",
            allUserId: email, // This should be replaced with actual user ID lookup
          },
          sendEmail: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to share memory");
      }

      await response.json();
      // console.log("🎉 SHARE SUCCESS - Memory shared successfully!");
      toast({
        title: "Success!",
        description: "Memory shared successfully!",
      });
      setIsOpen(false);
      onShare?.();
    } catch (error) {
      console.error("Error sharing memory:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to share memory",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Share2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Memory</DialogTitle>
          <DialogDescription>
            Share this memory with another user. They will receive an email with a link to view the memory.
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
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Sharing..." : "Share"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
