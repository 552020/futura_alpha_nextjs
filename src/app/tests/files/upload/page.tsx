'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

interface UploadResponse {
  id: string;
  url: string;
  filename: string;
  size: string;
  mimeType: string;
}

export default function TestUpload() {
  const { status } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detectedType, setDetectedType] = useState<string | null>(null);
  const [forceShowAsImage, setForceShowAsImage] = useState(false);

  // Log the response when it changes
  useEffect(() => {
    if (uploadedFile) {
      console.log('Upload response:', uploadedFile);

      try {
        // Check if we need to force image display based on URL or filename
        const url = uploadedFile.url?.toLowerCase() || '';
        const filename = uploadedFile.filename?.toLowerCase() || '';

        // Force image display if URL or filename has image extensions
        if (url.match(/\.(jpg|jpeg|png|gif|webp)($|\?)/) || filename.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
          console.log('Forcing image display based on URL or filename pattern');
          setForceShowAsImage(true);

          // Also set a detected type for display purposes
          let extension = 'jpg';
          if (filename.endsWith('.png')) extension = 'png';
          else if (filename.endsWith('.gif')) extension = 'gif';
          else if (filename.endsWith('.webp')) extension = 'webp';

          setDetectedType(`image/${extension}`);
        } else {
          setForceShowAsImage(false);
        }

        // Still perform standard detection for display purposes
        if (!uploadedFile.mimeType || uploadedFile.mimeType === 'unknown type') {
          let extension = null;

          if (uploadedFile.filename) {
            const parts = uploadedFile.filename.split('.');
            if (parts.length > 1) {
              extension = parts[parts.length - 1].toLowerCase();
            }
          }

          let detectedMimeType = 'application/octet-stream';

          if (extension === 'jpg' || extension === 'jpeg') detectedMimeType = 'image/jpeg';
          else if (extension === 'png') detectedMimeType = 'image/png';
          else if (extension === 'gif') detectedMimeType = 'image/gif';
          else if (extension === 'pdf') detectedMimeType = 'application/pdf';

          console.log('Auto-detected mime type:', detectedMimeType, 'from extension:', extension);
          setDetectedType(detectedMimeType);
        }
      } catch (err) {
        console.error('Error detecting mime type:', err);
      }
    }
  }, [uploadedFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      console.log('Selected file:', selectedFile.type, selectedFile.name);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setError(null);
    setDetectedType(null);
    setForceShowAsImage(false);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      setUploadedFile(data);
    } catch (err) {
      console.error('Error uploading file:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  // If not authenticated, show login button
  if (status === 'unauthenticated') {
    return (
      <div className="p-8 max-w-xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-6">Test File Upload</h1>
        <div className="bg-yellow-50 text-yellow-800 p-4 rounded mb-6">You must be logged in to upload files</div>
        <Button onClick={() => signIn()}>Sign In</Button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Test File Upload</h1>

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="mb-4">
          <input
            type="file"
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-slate-50 file:text-slate-700
              hover:file:bg-slate-100"
          />
        </div>

        <Button type="submit" disabled={uploading || !file}>
          {uploading ? 'Uploading...' : 'Upload File'}
        </Button>
      </form>

      {error && <div className="bg-red-50 text-red-700 p-4 rounded mb-6">{error}</div>}

      {uploadedFile && (
        <div className="bg-green-50 p-6 rounded">
          <h2 className="text-lg font-semibold mb-4">File Uploaded!</h2>

          <div className="mb-4">
            {uploadedFile.mimeType?.startsWith('image/') ||
            detectedType?.startsWith('image/') ||
            forceShowAsImage ||
            uploadedFile.filename?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
              <div className="w-full h-48 flex items-center justify-center bg-slate-100 rounded overflow-hidden mb-2">
                <Image
                  src={uploadedFile.url}
                  alt="Preview"
                  width={120}
                  height={120}
                  className="mt-2 max-h-36 max-w-full object-contain rounded border"
                />
              </div>
            ) : (
              <div className="bg-slate-100 p-4 rounded flex items-center justify-center h-20 mb-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-10 w-10 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
            )}

            <p className="font-medium">{uploadedFile.filename}</p>
            <p className="text-sm text-gray-500">
              {uploadedFile.size} • {uploadedFile.mimeType || detectedType || 'unknown type'}
              {!uploadedFile.mimeType && detectedType && (
                <span className="text-xs text-orange-600"> (auto-detected)</span>
              )}
            </p>
            <p className="text-sm truncate mt-2">
              <a
                href={uploadedFile.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {uploadedFile.url}
              </a>
            </p>
          </div>

          <Button variant="outline" onClick={() => setUploadedFile(null)}>
            Upload Another File
          </Button>
        </div>
      )}
    </div>
  );
}
