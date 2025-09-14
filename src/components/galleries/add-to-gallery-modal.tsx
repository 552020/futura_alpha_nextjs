"use client";

//This modal is made for KOTTIMOTTI

import { useState } from "react";
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Upload, Plus } from "lucide-react";
import { useFileUpload } from "@/hooks/user-file-upload";
import { useToast } from "@/hooks/use-toast";
import { uploadFile } from "@/services/upload";
import { galleryService } from "@/services/gallery";
import { isKOTTIMOTTI } from "@/utils/project-config";

// Form validation schema
const addToGallerySchema = z.object({
  caption: z
    .string()
    .max(200, "Caption must be less than 200 characters")
    .optional(),
});

type AddToGalleryFormData = z.infer<typeof addToGallerySchema>;

interface AddToGalleryModalProps {
  trigger?: React.ReactNode;
  onFilesAdded?: () => void;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AddToGalleryModal({
  trigger,
  onFilesAdded,
  className,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}: AddToGalleryModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const { toast } = useToast();

  // Use external state if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;

  const form = useForm<AddToGalleryFormData>({
    resolver: zodResolver(addToGallerySchema),
    defaultValues: {
      caption: "",
    },
  });

  useFileUpload({
    mode: "files",
    isOnboarding: false,
    onSuccess: () => {
      toast({
        title: "Success",
        description: `${selectedFiles.length} file(s) added to gallery successfully!`,
      });
      setSelectedFiles([]);
      form.reset();
      setOpen(false);
      onFilesAdded?.();
    },
    onError: (error) => {
      setError(error.message);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset form when closing
      form.reset();
      setError(null);
      setSelectedFiles([]);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
    setError(null);
  };

  const onSubmit = async () => {
    if (selectedFiles.length === 0) {
      setError("Please select at least one file to upload");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Upload files one by one using the existing upload service
      const uploadPromises = selectedFiles.map((file) =>
        uploadFile(file, false, undefined, "files")
      );

      const uploadResults = await Promise.all(uploadPromises);

      // For KOTTIMOTTI: Ensure there's a shared gallery after upload
      if (isKOTTIMOTTI()) {
        try {
          // Check if user has a shared gallery
          const galleries = await galleryService.listGalleries(1, 1, false);
          const hasSharedGallery = galleries.galleries.some(
            (gallery) => gallery.isPublic
          );

          if (!hasSharedGallery && uploadResults.length > 0) {
            // Create a shared gallery with the uploaded memories
            const memories = uploadResults.map((result) => ({
              id: result.data.id,
              type: "image",
            }));

            await galleryService.createGalleryFromMemories(
              memories,
              "My Shared Gallery",
              "A shared gallery for all your photos",
              true, // isPublic = true
              false // useMockData = false
            );
          }
        } catch (galleryError) {
          console.error("Error ensuring shared gallery exists:", galleryError);
          // Continue even if gallery creation fails
        }
      }

      toast({
        title: "Success",
        description: `${selectedFiles.length} file(s) added to gallery successfully!`,
      });
      setSelectedFiles([]);
      form.reset();
      setOpen(false);
      onFilesAdded?.();
    } catch (error) {
      console.error("Error uploading files:", error);
      setError(
        error instanceof Error ? error.message : "Failed to upload files"
      );
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className={className}>
            <Plus className="h-4 w-4 mr-2" />
            Add to Gallery
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Photos to Gallery</DialogTitle>
          <DialogDescription>
            Upload new photos to add to your shared gallery. You can select
            multiple files at once.
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

            {/* File Selection */}
            <FormItem>
              <FormLabel>Select Photos</FormLabel>
              <FormControl>
                <div className="space-y-4">
                  <div className="flex items-center justify-center w-full">
                    <label
                      htmlFor="file-upload"
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-4 text-gray-500" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span>{" "}
                          or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">
                          PNG, JPG, WEBP up to 10MB each
                        </p>
                      </div>
                      <input
                        id="file-upload"
                        type="file"
                        className="hidden"
                        multiple
                        accept="image/*"
                        onChange={handleFileSelect}
                      />
                    </label>
                  </div>

                  {/* Selected Files Preview */}
                  {selectedFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">
                        Selected Files ({selectedFiles.length}):
                      </p>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {selectedFiles.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded"
                          >
                            <span className="text-sm truncate flex-1">
                              {file.name}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFile(index)}
                              className="ml-2 h-6 w-6 p-0"
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </FormControl>
              <FormDescription>
                Select one or more image files to add to your gallery. You can
                upload multiple files at once.
              </FormDescription>
            </FormItem>

            {/* Caption */}
            <FormField
              control={form.control}
              name="caption"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Caption (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Add a caption for these photos..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Add a caption that will be applied to all selected photos.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || selectedFiles.length === 0}
              >
                {isLoading
                  ? "Uploading..."
                  : `Upload ${selectedFiles.length} Photo${
                      selectedFiles.length !== 1 ? "s" : ""
                    }`}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
