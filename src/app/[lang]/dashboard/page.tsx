'use client';

/**
 * DASHBOARD PAGE (formerly "Vault")
 *
 * This page displays the user's memory collection in a grid/list view.
 * It was previously called "Vault" but has been renamed to "Dashboard"
 * for better UX clarity.
 *
 * Features:
 * - Memory grid/list view with pagination
 * - Upload functionality
 * - Memory management (delete, share, edit)
 * - Folder organization
 * - Search and filtering
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useInfiniteQuery, keepPreviousData, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/query-keys';
import { MemoryGrid } from '@/components/memory/memory-grid';
import { Loader2 } from 'lucide-react';
import { useAuthGuard } from '@/utils/authentication';
import { Memory } from '@/types/memory';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { ItemUploadButton } from '@/components/memory/item-upload-button';
import { useParams } from 'next/navigation';
import RequireAuth from '@/components/auth/require-auth';
import {
  fetchMemories,
  processDashboardItems,
  deleteMemory,
  deleteAllMemories,
  type MemoryWithFolder,
  type DashboardItem,
  type FolderItem,
} from '@/services/memories-client';
import { ExtendedMemory } from '@/types/dashboard';
// import { TawkChat } from '@/components/chat/tawk-chat';
import { DashboardTopBar } from '@/components/dashboard/dashboard-top-bar';
import { sampleDashboardMemories } from '../../../../scripts/data/mock-data/create-dashboard-sample-data';
import { useHostingPreferences, getRecommendedDashboardDataSource } from '@/hooks/use-hosting-preferences';

// Demo flag - set to true to use mock data for demo
// 📝 Sample data generation script: scripts/data/mock-data/create-dashboard-sample-data.ts
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA_DASHBOARD === 'true';

export default function VaultPage() {
  const { isAuthorized, isTemporaryUser, userId, isLoading } = useAuthGuard();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filteredMemories, setFilteredMemories] = useState<DashboardItem[]>([]);
  const params = useParams();

  // Get hosting preferences to determine recommended data source
  const { data: hostingPreferences } = useHostingPreferences();

  // Database source state for switching between ICP and Neon
  // Automatically set based on hosting preferences
  const [dataSource, setDataSource] = useState<'neon' | 'icp' | null>(null);
  const [isAutoSelected, setIsAutoSelected] = useState(true); // Track if data source was auto-selected

  // Update data source when hosting preferences change
  useEffect(() => {
    if (hostingPreferences) {
      const recommendedDataSource = getRecommendedDashboardDataSource(hostingPreferences);
      setDataSource(recommendedDataSource);
      setIsAutoSelected(true); // Mark as auto-selected when preferences change
    }
  }, [hostingPreferences]);

  // Handle manual data source changes
  const handleDataSourceChange = useCallback((newDataSource: 'neon' | 'icp') => {
    setDataSource(newDataSource);
    setIsAutoSelected(false); // Mark as manually selected
  }, []);

  // React Query for dashboard data
  const {
    data,
    isLoading: isLoadingMemories,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: qk.memories.dashboard(userId, params.lang as string, dataSource),
    queryFn: ({ pageParam = 1 }) => {
      return fetchMemories(pageParam as number, dataSource!);
    },
    enabled: dataSource !== null && Boolean(!USE_MOCK_DATA && isAuthorized && !isLoading && userId), // Only run when dataSource is determined AND user is authorized
    initialPageParam: 1,
    getNextPageParam: () => undefined, // No pagination for now
    placeholderData: keepPreviousData,
  });

  // Process items from React Query or mock data
  const items = useMemo(() => {
    if (USE_MOCK_DATA) {
      return processDashboardItems(sampleDashboardMemories as MemoryWithFolder[]);
    }
    return (data?.pages ?? []).flatMap(p => processDashboardItems(p.memories ?? []));
  }, [data]);

  // Dashboard items are already processed by processDashboardItems
  const dashboardItems = items;

  // Mock data handling for demo mode
  useEffect(() => {
    if (USE_MOCK_DATA && isAuthorized && !isLoading) {
      const processedItems = processDashboardItems(sampleDashboardMemories as MemoryWithFolder[]);
      setFilteredMemories(processedItems);
    }
  }, [isAuthorized, isLoading]);

  // Removed automatic redirect - now handled by RequireAuth component in render

  // Handle infinite scroll for React Query
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 100) {
        if (!isFetchingNextPage && hasNextPage && !USE_MOCK_DATA) {
          fetchNextPage();
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  // Initialize filtered memories when items are loaded
  useEffect(() => {
    setFilteredMemories(items);
  }, [items]);

  const handleDelete = async (id: string) => {
    try {
      await deleteMemory(id);
      // Invalidate and refetch dashboard data
      queryClient.invalidateQueries({ queryKey: qk.memories.dashboard() });
      toast({
        title: 'Success',
        description: 'Memory deleted successfully.',
      });
    } catch (_error) {
      toast({
        title: 'Error',
        description: 'Failed to delete memory. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleShare = () => {
    // Invalidate and refetch dashboard data to show any new shares
    queryClient.invalidateQueries({ queryKey: ['memories', 'dashboard'] });
  };

  const handleMemoryClick = (memory: Memory | DashboardItem) => {
    // Check if it's a folder item
    if (memory.type === 'folder') {
      // For folders, use the folderId property (new structure) or fallback to extracting from ID (old structure)
      const folderId = (memory as FolderItem).folderId || memory.id.replace('folder-', '');
      router.push(`/${params.lang}/dashboard/folder/${folderId}`);
    } else {
      // For individual memories, navigate to the memory detail page
      router.push(`/${params.lang}/dashboard/${memory.id}`);
    }
  };

  const handleUploadSuccess = () => {
    // Refresh the memories list to show the new memory
    queryClient.invalidateQueries({ queryKey: ['memories', 'dashboard'] });
  };

  const handleUploadError = (error: Error) => {
    toast({
      title: 'Error',
      description: error.message || 'Failed to upload memory',
      variant: 'destructive',
    });
  };

  const handleFilteredMemoriesChange = useCallback((filtered: ExtendedMemory[]) => {
    setFilteredMemories(filtered as MemoryWithFolder[]);
  }, []);

  const handleClearAllMemories = async () => {
    if (!confirm('Are you sure you want to delete ALL memories? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await deleteAllMemories({
        all: true,
        hostingPreferences: hostingPreferences,
      });
      // Invalidate and refetch dashboard data
      queryClient.invalidateQueries({ queryKey: qk.memories.dashboard() });
      setFilteredMemories([]);
      toast({
        title: 'Success',
        description: `Successfully deleted ${result.deletedCount} memories.`,
      });
    } catch (_error) {
      toast({
        title: 'Error',
        description: 'Failed to clear all memories. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (!isAuthorized || isLoading) {
    // Show loading spinner only while status is loading
    if (isLoading) {
      return (
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }

    // Show access denied for unauthenticated users
    return <RequireAuth />;
  }

  return (
    <div className="container mx-auto px-6 py-8">
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

      {/* DashboardTopBar Component */}
      <DashboardTopBar
        memories={dashboardItems as MemoryWithFolder[]}
        onFilteredMemoriesChange={handleFilteredMemoriesChange}
        showViewToggle={true}
        onViewModeChange={setViewMode}
        viewMode={viewMode}
        showUploadButtons={true}
        onUploadSuccess={handleUploadSuccess}
        onUploadError={handleUploadError}
        onClearAllMemories={handleClearAllMemories}
        dataSource={dataSource || 'neon'}
        onDataSourceChange={handleDataSourceChange}
        isAutoSelected={isAutoSelected}
        hostingPreferences={hostingPreferences}
      />

      {/* Show loading state while fetching */}
      {dataSource === null || isLoadingMemories ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Loading memories...</span>
        </div>
      ) : /* Show empty state if no memories */
      dashboardItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-gray-300 p-16 text-center bg-gray-50 shadow-lg">
          <h3 className="text-4xl font-bold text-gray-800 mb-4">No memories yet</h3>
          <p className="mt-2 text-base text-gray-600 mb-6 max-w-md">
            Start by uploading your first memory. You can add images, videos, audio files, or write notes.
          </p>
          <ItemUploadButton variant="large-icon" onSuccess={handleUploadSuccess} onError={handleUploadError} />
        </div>
      ) : (
        /* Show memories grid */
        <>
          <MemoryGrid
            memories={filteredMemories}
            onDelete={handleDelete}
            onShare={handleShare}
            onClick={handleMemoryClick}
            viewMode={viewMode}
          />

          {/* Load more button for React Query */}
          {hasNextPage && !USE_MOCK_DATA && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isFetchingNextPage ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Tawk.to Chat */}
      {/* <TawkChat /> */}
    </div>
  );
}
