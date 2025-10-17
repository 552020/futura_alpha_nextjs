'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FolderSelector } from './folder-selector';
import { galleryService } from '@/services/gallery';
import { FolderInfo } from '@/types/gallery';
import { Plus, AlertCircle, Send } from 'lucide-react';
import { useGalleryShare } from '@/hooks/useGalleryShare';

import { fatLogger } from '@/lib/logger';
// Form validation schema
const createGallerySchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  folderName: z.string().min(1, 'Please select a folder'),
  isPublic: z.boolean(),
  shareEmail: z.string().email('Invalid email address').optional().or(z.literal('')),
  shareMessage: z.string().max(200, 'Message must be less than 200 characters').optional(),
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
  const [showShareSection, setShowShareSection] = useState(false);
  const { shareGallery } = useGalleryShare();

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
      title: prefillFolderName ? `Gallery from ${prefillFolderName}` : '',
      description: '',
      folderName: prefillFolderName || '',
      isPublic: false,
      shareEmail: '',
      shareMessage: '',
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
      setShowShareSection(false);
    }
  };

  // Set form values when modal opens with pre-filled folder
  useEffect(() => {
    if (open && hideFolderSelection && prefillFolderName) {
      form.setValue('folderName', prefillFolderName);
      // Auto-generate title if not provided
      if (!form.getValues('title')) {
        form.setValue('title', `Gallery from ${prefillFolderName}`);
      }
    }
  }, [open, hideFolderSelection, prefillFolderName, form]);

  const loadFolders = async () => {
    try {
      setIsLoadingFolders(true);
      const folderList = await galleryService.getFoldersWithImages(false); // Use real data
      setFolders(folderList);
    } catch (error) {
      fatLogger.error('Error loading folders:', 'fe', { data: error instanceof Error ? error : undefined });
      setError('Failed to load folders. Please try again.');
    } finally {
      setIsLoadingFolders(false);
    }
  };

  const onSubmit = async (data: CreateGalleryFormData) => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate email if share section is shown
      if (showShareSection && !data.shareEmail) {
        form.setError('shareEmail', {
          type: 'manual',
          message: 'Email is required when sharing',
        });
        setIsLoading(false);
        return;
      }

      fatLogger.info('Creating gallery', 'fe', { data });

      const gallery = await galleryService.createGalleryFromFolder(
        data.folderName,
        data.title,
        data.description,
        data.isPublic,
        false // Use real data
      );

      fatLogger.info('Gallery created successfully:', 'fe', { gallery });

      // If share section is shown and email is provided, share the gallery
      if (showShareSection && data.shareEmail) {
        try {
          await shareGallery({
            galleryId: gallery.id,
            galleryTitle: data.title,
            email: data.shareEmail,
            message: data.shareMessage,
          });

          fatLogger.info('Gallery shared successfully on creation', 'fe', { data: { galleryId: gallery.id } });
        } catch (shareError) {
          fatLogger.error('Error sharing gallery on creation', 'fe', {
            data: shareError instanceof Error ? shareError : undefined,
          });
          // Don't fail the entire operation if sharing fails
          setError('Gallery created but failed to share. You can share it later from the gallery page.');
        }
      }

      // Success - close modal and notify parent
      setOpen(false);
      form.reset();
      onGalleryCreated?.(gallery.id);
    } catch (error) {
      fatLogger.error('Error creating gallery:', 'fe', { data: error instanceof Error ? error : undefined });
      setError(error instanceof Error ? error.message : 'Failed to create gallery');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFolderSelect = (folderName: string) => {
    form.setValue('folderName', folderName);
    // Auto-generate title if not provided
    if (!form.getValues('title')) {
      form.setValue('title', `Gallery from ${folderName}`);
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

            {/* Share Section - Expandable Card */}
            {!showShareSection ? (
              <button
                type="button"
                onClick={() => setShowShareSection(true)}
                className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all group"
              >
                <div className="flex items-center justify-center gap-2 text-gray-600 group-hover:text-blue-600">
                  <Send className="h-4 w-4" />
                  <span className="font-medium text-sm">Share with someone after creation</span>
                </div>
                <p className="text-xs text-gray-500 mt-1 group-hover:text-blue-500">Click to add a recipient</p>
              </button>
            ) : (
              <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50 dark:bg-blue-950/20 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Send className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-medium text-sm text-blue-900 dark:text-blue-100">Share this gallery</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowShareSection(false);
                      form.setValue('shareEmail', '');
                      form.setValue('shareMessage', '');
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    Remove
                  </button>
                </div>

                <FormField
                  control={form.control}
                  name="shareEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Email address
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="friend@example.com"
                          className="bg-white dark:bg-gray-900"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        The gallery will be shared with this email address after creation.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shareMessage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Message (Optional)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add an optional message..."
                          maxLength={200}
                          rows={3}
                          className="bg-white dark:bg-gray-900 resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        {field.value?.length || 0}/200 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || isLoadingFolders}>
                {isLoading ? 'Creating...' : 'Create Gallery'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
