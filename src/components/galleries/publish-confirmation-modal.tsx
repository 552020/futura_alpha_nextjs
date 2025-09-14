"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Globe, Lock, AlertCircle } from "lucide-react";
import type { GalleryWithItems } from "@/types/gallery";

interface PublishConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  gallery: GalleryWithItems;
  isLoading?: boolean;
}

export function PublishConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  gallery,
  isLoading = false,
}: PublishConfirmationModalProps) {
  const isCurrentlyPublic = gallery.isPublic;
  const actionText = isCurrentlyPublic ? "Hide" : "Publish";

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isCurrentlyPublic ? (
              <Lock className="h-5 w-5 text-orange-500" />
            ) : (
              <Globe className="h-5 w-5 text-blue-500" />
            )}
            {actionText} Gallery
          </DialogTitle>
          <DialogDescription>
            Gallery: <span className="font-medium">{gallery.title}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {isCurrentlyPublic ? (
                <>
                  <strong>Hiding this gallery</strong> will make it private and
                  only accessible to you. Other authenticated users will no
                  longer be able to view this gallery.
                </>
              ) : (
                <>
                  <strong>Publishing this gallery</strong> means it will be
                  visible by all authenticated users (but not to everybody on
                  the internet). Are you sure you want to proceed?
                </>
              )}
            </AlertDescription>
          </Alert>

          <div className="text-sm text-muted-foreground">
            <p>
              <strong>Current status:</strong>{" "}
              <span
                className={`inline-flex items-center gap-1 ${
                  isCurrentlyPublic ? "text-green-600" : "text-orange-600"
                }`}
              >
                {isCurrentlyPublic ? (
                  <>
                    <Globe className="h-3 w-3" />
                    Public
                  </>
                ) : (
                  <>
                    <Lock className="h-3 w-3" />
                    Private
                  </>
                )}
              </span>
            </p>
            <p className="mt-1">
              <strong>After {actionText.toLowerCase()}:</strong>{" "}
              <span
                className={`inline-flex items-center gap-1 ${
                  isCurrentlyPublic ? "text-orange-600" : "text-green-600"
                }`}
              >
                {isCurrentlyPublic ? (
                  <>
                    <Lock className="h-3 w-3" />
                    Private
                  </>
                ) : (
                  <>
                    <Globe className="h-3 w-3" />
                    Public
                  </>
                )}
              </span>
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            className={
              isCurrentlyPublic
                ? "bg-orange-600 hover:bg-orange-700"
                : "bg-blue-600 hover:bg-blue-700"
            }
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {actionText}ing...
              </>
            ) : (
              `${actionText} Gallery`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
