'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { MemoryActions } from '@/components/memory/memory-actions';
import { Button } from '@/components/ui/button';
import { Loader2, Image as ImageIcon, Video, FileText, Music, ChevronLeft } from 'lucide-react';
import { useAuthGuard } from '@/utils/authentication';
import { format } from 'date-fns';
import { shortenTitle } from '@/lib/utils';
import { MemoryStorageBadge } from '@/components/common/memory-storage-badge';
import { sampleDashboardMemories } from '../sample-data';

// Demo flag - set to true to use mock data for demo
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA_MEMORY === 'true';

interface MemoryAsset {
  id: string;
  assetType: 'original' | 'display' | 'thumb' | 'placeholder' | 'poster' | 'waveform';
  url: string;
  mimeType: string;
  bytes: number;
  width?: number;
  height?: number;
}

interface Memory {
  id: string;
  type: 'image' | 'video' | 'note' | 'audio' | 'document' | 'folder';
  title: string;
  description?: string;
  createdAt: string;
  url?: string; // Legacy field - will be extracted from assets
  content?: string;
  mimeType?: string; // Legacy field - will be extracted from assets
  ownerId?: string;
  thumbnail?: string; // Legacy field - will be extracted from assets
  assets?: MemoryAsset[];
  metadata?: {
    originalPath?: string;
    folderName?: string;
  };
}

// Helper function to extract URL from assets
const getAssetUrl = (assets: MemoryAsset[] | undefined, preferredType: 'display' | 'original' = 'display'): string | undefined => {
  if (!assets || assets.length === 0) return undefined;
  
  // Try to find the preferred asset type first
  const preferredAsset = assets.find(asset => asset.assetType === preferredType);
  if (preferredAsset) return preferredAsset.url;
  
  // Fallback to original if preferred type not found
  const originalAsset = assets.find(asset => asset.assetType === 'original');
  if (originalAsset) return originalAsset.url;
  
  // Fallback to first available asset
  return assets[0]?.url;
};

// Helper function to extract MIME type from assets
const getAssetMimeType = (assets: MemoryAsset[] | undefined): string | undefined => {
  if (!assets || assets.length === 0) return undefined;
  
  // Try to find display asset first, then original
  const displayAsset = assets.find(asset => asset.assetType === 'display');
  if (displayAsset) return displayAsset.mimeType;
  
  const originalAsset = assets.find(asset => asset.assetType === 'original');
  if (originalAsset) return originalAsset.mimeType;
  
  return assets[0]?.mimeType;
};

export default function MemoryDetailPage() {
  const params = useParams<{ id: string; lang: string }>();
  const { id } = params;
  const router = useRouter();
  const { isAuthorized, isTemporaryUser, userId, redirectToSignIn } = useAuthGuard();
  const [memory, setMemory] = useState<Memory | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMemory = useCallback(async () => {
    try {
      setIsLoading(true);

      if (USE_MOCK_DATA) {
        console.log('🎭 MOCK DATA - Using sample data for memory detail');
        // Find the memory in the sample data
        const mockMemory = sampleDashboardMemories.find(m => m.id === id);

        if (mockMemory) {
          console.log('🔍 Found mock memory:', mockMemory);
          const transformedMemory: Memory = {
            id: mockMemory.id,
            type: mockMemory.type,
            title: mockMemory.title || 'Untitled',
            description: mockMemory.description,
            createdAt: mockMemory.createdAt,
            url: mockMemory.url,
            thumbnail: mockMemory.thumbnail,
            content:
              mockMemory.type === 'note' ? 'This is a sample note content for demonstration purposes.' : undefined,
            mimeType:
              mockMemory.type === 'video'
                ? 'video/mp4'
                : mockMemory.type === 'audio'
                  ? 'audio/mp3'
                  : mockMemory.type === 'document'
                    ? 'text/markdown'
                    : undefined,
            ownerId: 'mock-user-id',
            metadata: mockMemory.metadata,
          };
          setMemory(transformedMemory);
        } else {
          console.log('❌ Mock memory not found:', id);
          setMemory(null);
        }
        return;
      }

      const response = await fetch(`/api/memories/${id}`);

      console.log('Memory API Response:', {
        status: response.status,
        ok: response.ok,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Memory fetch error:', errorData);
        throw new Error(errorData.error || 'Failed to fetch memory');
      }

      const data = await response.json();
      console.log('Memory data:', data);

      if (data.success && data.data) {
        const memoryData = data.data;
        const assets = memoryData.assets || [];
        
        console.log('🔍 Memory assets:', assets);
        
        // Extract URL and MIME type from assets
        const displayUrl = getAssetUrl(assets, 'display');
        const mimeType = getAssetMimeType(assets);
        
        console.log('🔍 Extracted display URL:', displayUrl);
        console.log('🔍 Extracted MIME type:', mimeType);
        
        const transformedMemory: Memory = {
          id: memoryData.id,
          type: memoryData.type,
          title: memoryData.title || 'Untitled',
          description: memoryData.description,
          createdAt: memoryData.createdAt,
          url: displayUrl, // Extract from assets
          content: 'content' in memoryData ? memoryData.content : undefined,
          mimeType: mimeType, // Extract from assets
          ownerId: memoryData.ownerId,
          assets: assets, // Include assets for future use
          metadata: memoryData.metadata,
        };
        setMemory(transformedMemory);
      } else {
        throw new Error('Invalid memory data format');
      }
    } catch (error) {
      console.error('Error fetching memory:', error);
      setMemory(null);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!isAuthorized) {
      redirectToSignIn();
    }
  }, [isAuthorized, redirectToSignIn]);

  useEffect(() => {
    if (isAuthorized && userId) {
      fetchMemory();
    }
  }, [isAuthorized, userId, fetchMemory]);

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/memories/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete memory');

      // Use router.push for smoother navigation
      router.push('/vault');
    } catch (error) {
      console.error('Error deleting memory:', error);
    }
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    console.log('Share memory:', id);
  };

  if (!isAuthorized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!memory) {
    return (
      <div className="container mx-auto px-6 py-8">
        <Button
          variant="ghost"
          size="icon"
          className="mb-6 w-10 h-10 rounded-full bg-black dark:bg-white hover:scale-105 transition-transform"
          onClick={() => router.push(`/${params.lang}/dashboard`)}
        >
          <ChevronLeft className="h-6 w-6 text-white dark:text-black" />
        </Button>
        <h1 className="text-2xl font-bold text-red-600">Memory not found</h1>
        <p className="mt-2">
          The memory you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
        </p>
      </div>
    );
  }

  const getIcon = () => {
    switch (memory.type) {
      case 'image':
        return <ImageIcon className="h-8 w-8" />;
      case 'video':
        return <Video className="h-8 w-8" />;
      case 'note':
        return <FileText className="h-8 w-8" />;
      case 'audio':
        return <Music className="h-8 w-8" />;
      default:
        return null;
    }
  };

  // Check if the current user is the owner
  const isOwner = memory.ownerId === userId;

  // Get display title
  const displayTitle = memory.title?.trim() && memory.title !== memory.id ? memory.title : 'Untitled Memory';
  const shortTitle = shortenTitle(displayTitle, 40);

  return (
    <div className="container mx-auto px-6 py-8">
      <Button
        variant="ghost"
        size="icon"
        className="mb-6 w-10 h-10 rounded-full bg-black dark:bg-white hover:scale-105 transition-transform"
        onClick={() => {
          // Check if the memory belongs to a folder and go back to the folder
          if (memory?.metadata?.folderName) {
            router.push(`/${params.lang}/dashboard/folder/${memory.metadata.folderName}`);
          } else {
            router.push(`/${params.lang}/dashboard`);
          }
        }}
      >
        <ChevronLeft className="h-6 w-6 text-white dark:text-black" />
      </Button>

      {isTemporaryUser && (
        <div className="mb-4 rounded-lg bg-yellow-50 p-4 text-yellow-800">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium">Temporary Account</h3>
              <div className="mt-2 text-sm">
                <p>
                  You are currently using a temporary account. Your memories will be saved, but you need to complete the
                  signup process within 7 days to keep your account and all your memories.
                </p>
                <p className="mt-2">After 7 days, your account and all memories will be automatically deleted.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {getIcon()}
            <div>
              <h1 className="text-xl font-semibold sm:text-2xl md:text-3xl truncate min-w-0" title={displayTitle}>
                {shortTitle}
              </h1>
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground">Saved on {format(new Date(memory.createdAt), 'PPP')}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Storage:</span>
                  <MemoryStorageBadge memoryId={memory.id} memoryType={memory.type} size="sm" showTooltip={true} />
                </div>
              </div>
            </div>
          </div>
          {isOwner && <MemoryActions id={memory.id} onDelete={handleDelete} onShare={handleShare} />}
        </div>
      </div>

      <div className="rounded-lg border p-6">
        {memory.type === 'image' && memory.url && (
          <div className="relative mx-auto h-[600px] w-full">
            <Image
              src={memory.url}
              alt={memory.title || 'Memory image'}
              fill
              className="rounded-lg object-contain"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
            />
          </div>
        )}
        {memory.type === 'video' && memory.url && (
          <video controls className="mx-auto max-h-[600px] rounded-lg">
            <source src={memory.url} type={memory.mimeType} />
            Your browser does not support the video tag.
          </video>
        )}
        {memory.type === 'audio' && memory.url && (
          <audio controls className="mx-auto w-full">
            <source src={memory.url} type={memory.mimeType} />
            Your browser does not support the audio tag.
          </audio>
        )}
        {memory.type === 'note' && (
          <div className="prose max-w-none">
            <p className="whitespace-pre-wrap">{memory.content}</p>
          </div>
        )}
        {memory.description && (
          <div className="mt-4">
            <h2 className="text-xl font-semibold">Description</h2>
            <p className="mt-2">{memory.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
