'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
  bucket?: string;
  storageKey?: string;
  storageBackend?: string;
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

// Allow all possible asset types
type AssetType = MemoryAsset['assetType'];

// Helper function to generate presigned URL for private S3 objects
async function generatePresignedUrl(key: string): Promise<string> {
  console.log('🔑 Requesting presigned URL for key:', key);
  try {
    const response = await fetch('/api/s3/presigned-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key }),
    });

    console.log('📡 Presigned URL response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to generate presigned URL:', errorText);
      throw new Error(`Failed to generate presigned URL: ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Received presigned URL:', data.url ? 'URL received' : 'No URL in response');
    
    if (!data.url) {
      throw new Error('No URL returned from presigned URL endpoint');
    }
    
    return data.url;
  } catch (error) {
    console.error('❌ Error in generatePresignedUrl:', error);
    throw error;
  }
}

const getAssetUrl = async (assets: MemoryAsset[] | undefined, preferredType: AssetType = 'display'): Promise<string | undefined> => {
  if (!assets || assets.length === 0) return undefined;

  // Helper function to construct URL from bucket and storageKey
  const constructS3Url = async (asset: MemoryAsset): Promise<string> => {
    console.log('🔍 Constructing URL for asset:', {
      id: asset.id,
      type: asset.assetType,
      hasStorageKey: !!asset.storageKey,
      hasDirectUrl: !!asset.url,
      bucket: asset.bucket
    });

    if (!asset.storageKey) {
      console.log('ℹ️ No storageKey, using direct URL:', asset.url);
      return asset.url || '';
    }
    
    try {
      console.log('🔑 Attempting to get presigned URL for:', asset.storageKey);
      const presignedUrl = await generatePresignedUrl(asset.storageKey);
      console.log('✅ Using presigned URL for asset:', asset.id);
      return presignedUrl;
    } catch (error) {
      console.warn('⚠️ Falling back to direct URL for asset:', {
        id: asset.id,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Fallback to direct URL if presigned URL generation fails
      const bucket = process.env.NEXT_PUBLIC_AWS_S3_BUCKET || process.env.AWS_S3_BUCKET || asset.bucket || 'default-bucket';
      const region = process.env.NEXT_PUBLIC_AWS_S3_REGION || 'eu-central-1';
      const directUrl = `https://${bucket}.s3.${region}.amazonaws.com/${asset.storageKey}`;
      
      console.log('🔄 Using direct URL as fallback:', directUrl);
      return directUrl;
    }
  };

  // Try to find the preferred asset type first
  const preferredAsset = assets.find(asset => asset.assetType === preferredType);
  if (preferredAsset) return constructS3Url(preferredAsset);

  // Fallback to original if preferred type not found
  const originalAsset = assets.find(asset => asset.assetType === 'original');
  if (originalAsset) return constructS3Url(originalAsset);

  // Fallback to first available asset
  return assets[0] ? constructS3Url(assets[0]) : undefined;
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
  // Cache for presigned URLs to prevent duplicate requests
  const urlCache = useRef<Map<string, string>>(new Map());
  
  // Store asset URLs in a ref to avoid re-renders
  const assetUrlsRef = useRef<{
    displayUrl?: string;
    originalUrl?: string;
    mimeType?: string;
  }>({});

  // Function to get a cached URL or generate a new one
  const getCachedAssetUrl = useCallback(async (assets: MemoryAsset[] = [], type: AssetType) => {
    if (!assets.length) return undefined;
    
    // Find the asset
    const asset = assets.find(a => a.assetType === type) || 
                 assets.find(a => a.assetType === 'original') || 
                 assets[0];
    
    if (!asset?.storageKey) return undefined;
    
    // Check cache first
    if (urlCache.current.has(asset.storageKey)) {
      return urlCache.current.get(asset.storageKey);
    }
    
    try {
      // Generate new URL if not in cache
      const url = await getAssetUrl(assets, type);
      if (url) {
        urlCache.current.set(asset.storageKey, url);
      }
      return url;
    } catch (error) {
      console.error('Error generating asset URL:', error);
      return undefined;
    }
  }, []);

  // Function to load asset URLs
  const loadAssetUrls = useCallback(async (assets: MemoryAsset[] = []) => {
    if (!assets.length) return assetUrlsRef.current;
    
    try {
      const [display, original] = await Promise.all([
        getCachedAssetUrl(assets, 'display'),
        getCachedAssetUrl(assets, 'original'),
      ]);
      
      const newAssetUrls = {
        displayUrl: display,
        originalUrl: original,
        mimeType: getAssetMimeType(assets),
      };
      
      assetUrlsRef.current = newAssetUrls;
      return newAssetUrls;
    } catch (error) {
      console.error('Error loading asset URLs:', error);
      return assetUrlsRef.current;
    }
  }, []);

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

        // Load asset URLs if assets exist
        let displayUrl: string | undefined;
        let originalUrl: string | undefined;
        let mimeType: string | undefined;
        
        if (assets && assets.length > 0) {
          const loadedUrls = await loadAssetUrls(assets);
          displayUrl = loadedUrls.displayUrl;
          originalUrl = loadedUrls.originalUrl;
          mimeType = loadedUrls.mimeType;
        }

        console.log('🔍 Extracted display URL:', displayUrl);
        console.log('🔍 Extracted original URL:', originalUrl);
        console.log('🔍 Extracted MIME type:', mimeType);

        // Get the thumbnail URL with caching
        const thumbnailUrl = assets ? (await getCachedAssetUrl(assets, 'thumb')) : undefined;
        
        const transformedMemory: Memory = {
          id: memoryData.id,
          type: memoryData.type,
          title: memoryData.title || 'Untitled',
          description: memoryData.description,
          createdAt: memoryData.createdAt,
          url: displayUrl || originalUrl, // Use display URL if available, fallback to original
          content: 'content' in memoryData ? memoryData.content : undefined,
          mimeType: mimeType,
          ownerId: memoryData.ownerId,
          assets: assets,
          metadata: memoryData.metadata,
          thumbnail: thumbnailUrl || displayUrl || originalUrl,
        };

        console.log('🔄 Transformed memory:', {
          id: transformedMemory.id,
          type: transformedMemory.type,
          url: transformedMemory.url,
          thumbnail: transformedMemory.thumbnail,
          hasAssets: !!assets?.length,
        });

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
  }, [id, loadAssetUrls, getCachedAssetUrl]);

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
