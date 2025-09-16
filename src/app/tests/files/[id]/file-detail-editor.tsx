'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, ArrowLeft, Save } from 'lucide-react';
import Image from 'next/image';
import { DBMemory } from '@/db/schema';

// Extended type for test data that includes legacy fields
type TestMemoryData = DBMemory & {
  url?: string;
  size?: number | string;
  mimeType?: string;
  content?: string;
  caption?: string;
  metadata?: {
    originalPath?: string;
    custom?: Record<string, unknown>;
    dateOfMemory?: string;
    size?: number;
    format?: string;
  } | null;
};

// Define proper types for the file details
// interface PhotoData {
//   id: string;
//   url: string;
//   caption: string | null;
//   isPublic: boolean | null;
//   createdAt: string | Date;
//   updatedAt?: string | Date;
//   userId: string;
//   metadata?: {
//     size?: number;
//     format?: string;
//     dimensions?: { width: number; height: number };
//   } | null;
// }

// interface FileData {
//   id: string;
//   url: string;
//   filename: string;
//   mimeType: string;
//   size: number | string;
//   isPublic: boolean | null;
//   createdAt: string | Date;
//   updatedAt?: string | Date;
//   userId: string;
//   metadata?: Record<string, unknown> | null;
// }

// interface TextData {
//   id: string;
//   title: string;
//   content: string;
//   isPublic: boolean | null;
//   createdAt: string | Date;
//   updatedAt?: string | Date;
//   userId: string;
//   metadata?: Record<string, unknown> | null;
// }

type FileDetailsType =
  | {
      type: 'image';
      data: TestMemoryData;
    }
  | {
      type: 'document';
      data: TestMemoryData;
    }
  | {
      type: 'note';
      data: TestMemoryData;
    };

export default function FileDetailEditor({ fileDetails }: { fileDetails: FileDetailsType }) {
  const router = useRouter();
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form fields
  const [caption, setCaption] = useState(fileDetails.type === 'image' ? fileDetails.data.description || '' : '');
  const [filename, setFilename] = useState(fileDetails.type === 'document' ? fileDetails.data.title || '' : '');
  const [isPublic, setIsPublic] = useState(fileDetails.data.isPublic === true);
  const [title, setTitle] = useState(fileDetails.type === 'note' ? fileDetails.data.title || '' : '');
  const [content, setContent] = useState(fileDetails.type === 'note' ? fileDetails.data.content || '' : '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      let updateData: Record<string, unknown> = {};
      let requestOptions: RequestInit = {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      };

      // Handle file upload if a file was selected
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);

        if (fileDetails.type === 'image') {
          formData.append('caption', caption);
          formData.append('isPublic', String(isPublic));
        } else if (fileDetails.type === 'document') {
          formData.append('filename', filename);
          formData.append('isPublic', String(isPublic));
        }

        requestOptions = {
          method: 'PATCH',
          body: formData,
        };
      } else {
        // Regular metadata update without file
        if (fileDetails.type === 'image') {
          updateData = {
            caption,
            isPublic,
          };
        } else if (fileDetails.type === 'document') {
          updateData = {
            filename,
            isPublic,
          };
        } else if (fileDetails.type === 'note') {
          updateData = {
            title,
            content,
            isPublic,
          };
        }

        requestOptions.body = JSON.stringify(updateData);
      }

      const response = await fetch(`/api/files/${fileDetails.data.id}`, requestOptions);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error: ${response.status}`);
      }

      // Don't need to use the result, just check if operation succeeded
      await response.json();
      setSuccess('File updated successfully');

      // Reset file input
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Refresh the page after successful update
      router.refresh();
    } catch (err) {
      console.error('Error updating file:', err);
      setError(err instanceof Error ? err.message : 'Failed to update file');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center mb-6">
        <button onClick={() => router.push('/tests/files')} className="text-blue-600 hover:text-blue-800 mr-4">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">
          Edit {fileDetails.type.charAt(0).toUpperCase() + fileDetails.type.slice(1)}
        </h1>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Preview panel */}
            {fileDetails.type === 'image' && (
              <div className="border rounded-lg p-4 bg-white">
                <h2 className="font-medium mb-4">Preview</h2>
                <div className="w-full max-w-[200px] h-[180px] bg-gray-50 flex items-center justify-center rounded overflow-hidden border mx-auto">
                  <Image
                    src={fileDetails.data.url || ''}
                    alt={fileDetails.data.description || ''}
                    width={160}
                    height={140}
                    className="max-w-full max-h-[160px] object-contain"
                  />
                </div>
              </div>
            )}

            <Tabs defaultValue="metadata" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="metadata">Metadata</TabsTrigger>
                {(fileDetails.type === 'image' || fileDetails.type === 'document') && (
                  <TabsTrigger value="replace">Replace File</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="metadata" className="space-y-4">
                {fileDetails.type === 'image' && (
                  <div className="space-y-2">
                    <Label htmlFor="caption">Caption</Label>
                    <Input
                      id="caption"
                      value={caption}
                      onChange={e => setCaption(e.target.value)}
                      placeholder="Add a caption for this photo"
                    />
                  </div>
                )}

                {fileDetails.type === 'document' && (
                  <div className="space-y-2">
                    <Label htmlFor="filename">Filename</Label>
                    <Input
                      id="filename"
                      value={filename}
                      onChange={e => setFilename(e.target.value)}
                      placeholder="Filename"
                    />
                  </div>
                )}

                {fileDetails.type === 'note' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="content">Content</Label>
                      <Textarea
                        id="content"
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        rows={8}
                        placeholder="Text content"
                        className="resize-y"
                      />
                    </div>
                  </>
                )}

                <div className="flex items-center space-x-2">
                  <Switch id="isPublic" checked={isPublic} onCheckedChange={setIsPublic} />
                  <Label htmlFor="isPublic">Make this file public</Label>
                </div>
              </TabsContent>

              <TabsContent value="replace" className="space-y-4">
                {(fileDetails.type === 'image' || fileDetails.type === 'document') && (
                  <div className="space-y-2">
                    <Label htmlFor="file">Upload new file</Label>
                    <Input
                      id="file"
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="cursor-pointer"
                    />
                    {selectedFile && (
                      <p className="text-sm text-gray-500 mt-1">
                        Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                      </p>
                    )}
                  </div>
                )}

                {fileDetails.type === 'note' && (
                  <p className="text-sm text-gray-500 italic">
                    Text content cannot be replaced with a file. Use the metadata tab to update content.
                  </p>
                )}
              </TabsContent>
            </Tabs>

            {/* Success/error messages */}
            {success && <div className="mt-4 p-3 bg-green-50 text-green-800 rounded">{success}</div>}

            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-800 rounded flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                {error}
              </div>
            )}

            {/* Submit button */}
            <div className="mt-6">
              <Button type="submit" disabled={updating} className="w-full">
                {updating ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* File metadata */}
          <div className="border rounded-lg p-6 bg-gray-50 mt-6">
            <h2 className="text-lg font-medium mb-4">Technical Details</h2>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-3">
                <span className="font-medium">ID:</span>
                <span className="col-span-2 font-mono text-gray-700 break-all">{fileDetails.data.id}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="font-medium">Type:</span>
                <span className="col-span-2">{fileDetails.type}</span>
              </div>
              <div className="grid grid-cols-3">
                <span className="font-medium">Created:</span>
                <span className="col-span-2">{new Date(fileDetails.data.createdAt).toLocaleString()}</span>
              </div>
              {fileDetails.data.metadata?.dateOfMemory && (
                <div className="grid grid-cols-3">
                  <span className="font-medium">Date of Memory:</span>
                  <span className="col-span-2">
                    {new Date(fileDetails.data.metadata.dateOfMemory).toLocaleString()}
                  </span>
                </div>
              )}
              {fileDetails.type === 'image' && (
                <>
                  <div className="grid grid-cols-3">
                    <span className="font-medium">URL:</span>
                    <span className="col-span-2 truncate font-mono text-xs text-gray-700">
                      {fileDetails.data.url || 'N/A'}
                    </span>
                  </div>
                  {fileDetails.data.metadata?.size && (
                    <div className="grid grid-cols-3">
                      <span className="font-medium">Size:</span>
                      <span className="col-span-2">{fileDetails.data.metadata.size} bytes</span>
                    </div>
                  )}
                  {fileDetails.data.metadata?.format && (
                    <div className="grid grid-cols-3">
                      <span className="font-medium">Format:</span>
                      <span className="col-span-2">{fileDetails.data.metadata.format}</span>
                    </div>
                  )}
                </>
              )}
              {fileDetails.type === 'document' && (
                <>
                  <div className="grid grid-cols-3">
                    <span className="font-medium">URL:</span>
                    <span className="col-span-2 truncate font-mono text-xs text-gray-700">
                      {fileDetails.data.url || 'N/A'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="font-medium">Size:</span>
                    <span className="col-span-2">{fileDetails.data.size || 'N/A'} bytes</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="font-medium">MIME Type:</span>
                    <span className="col-span-2">{fileDetails.data.mimeType || 'N/A'}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
