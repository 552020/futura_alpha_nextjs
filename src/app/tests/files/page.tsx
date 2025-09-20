'use client';

import { useState } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowDown, Trash2, FileType, FileText } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Image from 'next/image';

// Define types for our data
interface PhotoItem {
  id: string;
  url: string;
  caption?: string;
  createdAt: string;
  isPublic?: boolean;
}

interface FileItem {
  id: string;
  filename: string;
  size: string;
  mimeType: string;
  createdAt: string;
}

interface TextItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

interface FilesResponse {
  photos: PhotoItem[];
  files: FileItem[];
  texts: TextItem[];
}

export default function TestFiles() {
  const router = useRouter();
  const { status } = useSession();
  const [files, setFiles] = useState<FilesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<{ id: string; status: 'deleting' | 'error' | null }>({
    id: '',
    status: null,
  });

  const fetchFiles = async (type?: string) => {
    setLoading(true);
    setError(null);

    try {
      let url = '/api/files';

      // Add query params if provided
      const params = new URLSearchParams();
      if (type) params.append('type', type);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      setFiles(data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch files';
      setError(errorMessage);
      console.error('Error fetching files:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteFile = async (id: string) => {
    // Set deleting status
    setDeleteStatus({ id, status: 'deleting' });

    try {
      const response = await fetch(`/api/files/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      // If deletion was successful, remove the item from state
      if (files) {
        setFiles({
          photos: files.photos.filter(photo => photo.id !== id),
          files: files.files.filter(file => file.id !== id),
          texts: files.texts.filter(text => text.id !== id),
        });
      }

      // Reset delete status
      setDeleteStatus({ id: '', status: null });
    } catch (err) {
      console.error('Error deleting file:', err);
      setDeleteStatus({ id, status: 'error' });

      // Reset status after 3 seconds
      setTimeout(() => {
        setDeleteStatus({ id: '', status: null });
      }, 3000);
    }
  };

  const navigateToDetail = (id: string) => {
    router.push(`/tests/files/${id}`);
  };

  // If not authenticated, show login button
  if (status === 'unauthenticated') {
    return (
      <div className="p-8 max-w-xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-6">Files Test</h1>
        <div className="bg-yellow-50 text-yellow-800 p-4 rounded mb-6">You must be logged in to view your files</div>
        <Button onClick={() => signIn()}>Sign In</Button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Files Test</h1>

      <div className="space-x-2 mb-8">
        <Button onClick={() => fetchFiles()}>
          <ArrowDown className="w-4 h-4 mr-2" />
          Fetch All Files
        </Button>
        <Button variant="outline" onClick={() => fetchFiles('photo')}>
          Photos
        </Button>
        <Button variant="outline" onClick={() => fetchFiles('file')}>
          Files
        </Button>
        <Button variant="outline" onClick={() => fetchFiles('text')}>
          Texts
        </Button>
      </div>

      {loading && <div className="text-center py-12">Loading files...</div>}

      {error && <div className="bg-red-50 text-red-700 p-4 rounded mb-6">Error: {error}</div>}

      {status === 'authenticated' && (
        <div>
          {files && (
            <div className="mt-8 space-y-10">
              {/* Photos Section - COMPACT VERSION */}
              {files.photos && files.photos.length > 0 && (
                <div>
                  <h3 className="font-medium mb-4 text-lg">Photos ({files.photos.length})</h3>
                  <div className="flex flex-wrap gap-2">
                    {files.photos.map(photo => (
                      <div
                        key={photo.id}
                        className="w-20 h-20 border border-gray-200 rounded overflow-hidden bg-gray-50 flex flex-col relative group cursor-pointer"
                        onClick={() => navigateToDetail(photo.id)}
                      >
                        <div className="flex-1 flex items-center justify-center overflow-hidden">
                          <Image
                            src={photo.url}
                            alt=""
                            width={80}
                            height={70}
                            className="max-w-full max-h-[70px] object-contain"
                          />
                        </div>
                        <div className="h-5 flex items-center justify-between px-1 bg-gray-100">
                          <a
                            href={`/api/files/${photo.id}/download`}
                            className="text-xs text-blue-600 hover:underline"
                            onClick={e => e.stopPropagation()}
                            download
                          >
                            Download
                          </a>

                          <button
                            onClick={e => {
                              e.stopPropagation();
                              deleteFile(photo.id);
                            }}
                            disabled={deleteStatus.id === photo.id}
                            className={`text-xs text-red-500 hover:text-red-700 ${
                              deleteStatus.id === photo.id ? 'opacity-50' : ''
                            }`}
                            title="Delete"
                          >
                            {deleteStatus.id === photo.id && deleteStatus.status === 'deleting' ? (
                              '...'
                            ) : (
                              <Trash2 size={10} />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Files Section - Table View */}
              {files.files && files.files.length > 0 && (
                <div>
                  <h3 className="font-medium mb-4 text-lg">Files ({files.files.length})</h3>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]"></TableHead>
                          <TableHead>Filename</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Size</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {files.files.map(file => (
                          <TableRow
                            key={file.id}
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => navigateToDetail(file.id)}
                          >
                            <TableCell>
                              <FileType className="h-5 w-5 text-gray-400" />
                            </TableCell>
                            <TableCell className="font-medium">{file.filename}</TableCell>
                            <TableCell>{file.mimeType.split('/')[1].toUpperCase()}</TableCell>
                            <TableCell>{(parseInt(file.size) / 1024).toFixed(1)} KB</TableCell>
                            <TableCell>{new Date(file.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <a
                                  href={`/api/files/${file.id}/download`}
                                  className="text-blue-500 hover:text-blue-700"
                                  onClick={e => e.stopPropagation()}
                                  download
                                  title="Download"
                                >
                                  <ArrowDown size={14} />
                                </a>
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    deleteFile(file.id);
                                  }}
                                  disabled={deleteStatus.id === file.id}
                                  className={`text-red-500 hover:text-red-700 ${
                                    deleteStatus.id === file.id ? 'opacity-50' : ''
                                  }`}
                                  title="Delete"
                                >
                                  {deleteStatus.id === file.id && deleteStatus.status === 'deleting' ? (
                                    '...'
                                  ) : (
                                    <Trash2 size={14} />
                                  )}
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Texts Section - Table View */}
              {files.texts && files.texts.length > 0 && (
                <div>
                  <h3 className="font-medium mb-4 text-lg">Texts ({files.texts.length})</h3>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]"></TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Content Preview</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {files.texts.map(text => (
                          <TableRow
                            key={text.id}
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => navigateToDetail(text.id)}
                          >
                            <TableCell>
                              <FileText className="h-5 w-5 text-gray-400" />
                            </TableCell>
                            <TableCell className="font-medium">{text.title}</TableCell>
                            <TableCell className="max-w-xs">
                              <div className="truncate text-sm text-gray-500">{text.content}</div>
                            </TableCell>
                            <TableCell>{new Date(text.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <a
                                  href={`/api/files/${text.id}/download`}
                                  className="text-blue-500 hover:text-blue-700"
                                  onClick={e => e.stopPropagation()}
                                  download
                                  title="Download"
                                >
                                  <ArrowDown size={14} />
                                </a>
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    deleteFile(text.id);
                                  }}
                                  disabled={deleteStatus.id === text.id}
                                  className={`text-red-500 hover:text-red-700 ${
                                    deleteStatus.id === text.id ? 'opacity-50' : ''
                                  }`}
                                  title="Delete"
                                >
                                  {deleteStatus.id === text.id && deleteStatus.status === 'deleting' ? (
                                    '...'
                                  ) : (
                                    <Trash2 size={14} />
                                  )}
                                </button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Show if no files found */}
              {!files.photos?.length && !files.files?.length && !files.texts?.length && (
                <div className="text-center p-8 bg-gray-50 rounded">No files found.</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
