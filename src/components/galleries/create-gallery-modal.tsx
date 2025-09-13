"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FolderSelector } from "./folder-selector";
import { galleryService } from "@/services/gallery";
import { FolderInfo } from "@/types/gallery";
import { Plus, AlertCircle } from "lucide-react";

// Form validation schema
const createGallerySchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  folderName: z.string().min(1, "Please select a folder"),
  isPublic: z.boolean(),
});

type CreateGalleryFormData = z.infer<typeof createGallerySchema>;

interface CreateGalleryModalProps {
  trigger?: React.ReactNode;
  onGalleryCreated?: (galleryId: string) => void;
  prefillFolderName?: string;
  className?: string;
  hideFolderSelection?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CreateGalleryModal({
  trigger,
  onGalleryCreated,
  prefillFolderName,
  className,
  hideFolderSelection = false,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}: CreateGalleryModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  // Use external state if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [isLoadingFolders, setIsLoadingFolders] = useState(false);

  const form = useForm<CreateGalleryFormData>({
    resolver: zodResolver(createGallerySchema),
    defaultValues: {
      title: prefillFolderName ? `Gallery from ${prefillFolderName}` : "",
      description: "",
      folderName: prefillFolderName || "",
      isPublic: false,
    },
  });

  // Load folders when modal opens (only if folder selection is not hidden)
  const handleOpenChange = async (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && folders.length === 0 && !hideFolderSelection) {
      await loadFolders();
    }
    if (!newOpen) {
      // Reset form when closing
      form.reset();
      setError(null);
    }
  };

  // Set form values when modal opens with pre-filled folder
  useEffect(() => {
    if (open && hideFolderSelection && prefillFolderName) {
      form.setValue("folderName", prefillFolderName);
      // Auto-generate title if not provided
      if (!form.getValues("title")) {
        form.setValue("title", `Gallery from ${prefillFolderName}`);
      }
    }
  }, [open, hideFolderSelection, prefillFolderName, form]);

  const loadFolders = async () => {
    try {
      setIsLoadingFolders(true);
      const folderList = await galleryService.getFoldersWithImages(false); // Use real data
      setFolders(folderList);
    } catch (error) {
      console.error("Error loading folders:", error);
      setError("Failed to load folders. Please try again.");
    } finally {
      setIsLoadingFolders(false);
    }
  };

  const onSubmit = async (data: CreateGalleryFormData) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log("Creating gallery with data:", data);

      const gallery = await galleryService.createGalleryFromFolder(
        data.folderName,
        data.title,
        data.description,
        data.isPublic,
        false // Use real data
      );

      console.log("Gallery created successfully:", gallery);

      // Success - close modal and notify parent
      setOpen(false);
      form.reset();
      onGalleryCreated?.(gallery.id);
    } catch (error) {
      console.error("Error creating gallery:", error);
      setError(error instanceof Error ? error.message : "Failed to create gallery");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFolderSelect = (folderName: string) => {
    form.setValue("folderName", folderName);
    // Auto-generate title if not provided
    if (!form.getValues("title")) {
      form.setValue("title", `Gallery from ${folderName}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className={className}>
            <Plus className="h-4 w-4 mr-2" />
            Create Gallery
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Gallery from Folder</DialogTitle>
          <DialogDescription>
            Create a new gallery from an existing folder of memories. The gallery will include all items from the
            selected folder.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Folder Selection - Hidden if prefillFolderName is provided */}
            {!hideFolderSelection && (
              <FormField
                control={form.control}
                name="folderName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Folder</FormLabel>
                    <FormControl>
                      <FolderSelector
                        folders={folders}
                        isLoading={isLoadingFolders}
                        selectedFolder={field.value}
                        onFolderSelect={handleFolderSelect}
                        onRefresh={loadFolders}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Show selected folder info when folder selection is hidden */}
            {hideFolderSelection && prefillFolderName && (
              <>
                {/* Hidden form field to maintain form state */}
                <FormField
                  control={form.control}
                  name="folderName"
                  render={({ field }) => <input type="hidden" {...field} value={prefillFolderName} />}
                />

                <div className="space-y-2">
                  <label className="text-sm font-medium">Selected Folder</label>
                  <div className="p-3 bg-muted rounded-md border">
                    <p className="text-sm font-medium">{prefillFolderName}</p>
                    <p className="text-xs text-muted-foreground mt-1">Gallery will be created from this folder</p>
                  </div>
                </div>
              </>
            )}

            {/* Gallery Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gallery Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter gallery title..." {...field} />
                  </FormControl>
                  <FormDescription>
                    Give your gallery a descriptive name to help you organize your memories.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Gallery Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter gallery description..." {...field} />
                  </FormControl>
                  <FormDescription>Add a description to provide more context about this gallery.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Public/Private Toggle */}
            <FormField
              control={form.control}
              name="isPublic"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Public Gallery</FormLabel>
                    <FormDescription>
                      Make this gallery visible to other users. Private galleries are only visible to you.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || isLoadingFolders}>
                {isLoading ? "Creating..." : "Create Gallery"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
