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

import { useEffect, useState, useCallback } from 'react';
import { MemoryGrid } from '@/components/memory/memory-grid';
import { Loader2 } from 'lucide-react';
import { useInView } from 'react-intersection-observer';
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
} from '@/services/memories';
import { ExtendedMemory } from '@/types/dashboard';
import { TawkChat } from '@/components/chat/tawk-chat';
import { DashboardTopBar } from '@/components/dashboard/dashboard-top-bar';
import { sampleDashboardMemories } from '../../../../scripts/mock-data/create-dashboard-sample-data';

import { logger } from '@/lib/logger';
// Demo flag - set to true to use mock data for demo
// 📝 Sample data generation script: scripts/mock-data/create-dashboard-sample-data.ts
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA_DASHBOARD === 'true';

export default function VaultPage() {
  // logger.info("🔍 Dashboard component rendered", 'dashboard:fe');
  const { isAuthorized, isTemporaryUser, userId, isLoading } = useAuthGuard();
  // logger.info("🔍 Dashboard auth state:", 'dashboard:fe', { isAuthorized, isTemporaryUser, userId, isLoading });
  const router = useRouter();
  const { toast } = useToast();
  const [memories, setMemories] = useState<DashboardItem[]>([]);
  const [isLoadingMemories, setIsLoadingMemories] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredMemories, setFilteredMemories] = useState<DashboardItem[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Dashboard items are already processed by processDashboardItems
  const dashboardItems = memories;
  const params = useParams();

  const fetchDashboardMemories = useCallback(async () => {
    logger.dashboard('fe').info('🚀 ENTERING fetchMemories function', { service: 'fetchMemories', currentPage, USE_MOCK_DATA, timestamp: new Date().toISOString() });

    if (USE_MOCK_DATA) {
      logger.dashboard('fe').info('🎭 MOCK DATA - Using sample data for demo', { service: 'fetchMemories' });
      const processedItems = processDashboardItems(sampleDashboardMemories as MemoryWithFolder[]);
      setMemories(processedItems);
      setHasMore(false);
      setIsLoadingMemories(false);
      return;
    }

    try {
      // logger.dashboard('fe').info("🔄 FETCH MEMORIES - Starting fetch:", {
      //   page: currentPage,
      //   timestamp,
      // });

      // logger.dashboard('fe').info("CALLING fetchMemories");
      const result = await fetchMemories(currentPage);
      // logger.dashboard('fe').info("EXITED fetchMemories");

      // logger.dashboard('fe').info("CALLING processDashboardItems");
      const processedItems = processDashboardItems(result.memories);
      // logger.dashboard('fe').info("EXITED processDashboardItems");

      // logger.dashboard('fe').info("FETCH MEMORIES - Success:", {
      //   memoriesCount: result.memories.length,
      //   processedItemsCount: processedItems.length,
      //   hasMore: result.hasMore,
      //   timestamp,
      // });

      // logger.dashboard('fe').info("About to set memories with processedItems:", processedItems);
      setMemories(prev => {
        const newMemories = currentPage === 1 ? processedItems : [...prev, ...processedItems];
        // logger.dashboard('fe').debug("Setting memories to:", newMemories);
        return newMemories;
      });
      setHasMore(result.hasMore);
    } catch (error) {
      logger.dashboard().error('FETCH MEMORIES ERROR', error instanceof Error ? error : undefined, {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        status: (error as Error & { status?: number })?.status,
        statusText: (error as Error & { statusText?: string })?.statusText,
        details: (error as Error & { details?: Record<string, unknown> })?.details,
        timestamp,
      });

      // Show more specific error message if available
      const errorMessage = error instanceof Error ? error.message : 'Failed to load memories. Please try again.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoadingMemories(false);
    }
    // logger.dashboard('fe').info("EXITING fetchMemories function");
  }, [currentPage, toast]);

  // Removed automatic redirect - now handled by RequireAuth component in render

  useEffect(() => {
    // logger.dashboard('fe').debug("Auth check:", { isAuthorized, userId, isLoading });
    if (isAuthorized && !isLoading) {
      // logger.dashboard('fe').info("CALLING fetchDashboardMemories");
      fetchDashboardMemories();
      // logger.dashboard('fe').info("EXITED fetchDashboardMemories");
    } else {
      // logger.dashboard('fe').debug("Not authorized or still loading");
    }
  }, [isAuthorized, isLoading, userId, fetchDashboardMemories]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 100) {
        if (!isLoadingMemories && hasMore) {
          setCurrentPage(prev => prev + 1);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isLoadingMemories, hasMore]);

  // Initialize filtered memories when memories are loaded
  useEffect(() => {
    logger.dashboard().info('🔍 Dashboard useEffect - memories changed:', {
      memoriesCount: memories.length,
      memories: memories.map(m => ({ id: m.id, type: m.type, title: m.title })),
    });
    setFilteredMemories(memories);
  }, [memories]);

  const handleDelete = async (id: string) => {
    try {
      await deleteMemory(id);
      setMemories(prev => prev.filter(memory => memory.id !== id));
      toast({
        title: 'Success',
        description: 'Memory deleted successfully.',
      });
    } catch (error) {
      logger.dashboard('fe').error('Error deleting memory', error as Error);
      toast({
        title: 'Error',
        description: 'Failed to delete memory. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleShare = () => {
    // Refresh the memories list to show any new shares
    fetchDashboardMemories();
  };

  const handleMemoryClick = (memory: Memory | DashboardItem) => {
    // logger.dashboard('fe').debug("Memory clicked:", { type: memory.type, id: memory.id });

    // Check if it's a folder item
    if (memory.type === 'folder') {
      // For folders, use the folderId property (new structure) or fallback to extracting from ID (old structure)
      const folderId = (memory as FolderItem).folderId || memory.id.replace('folder-', '');
      // logger.dashboard('fe').debug("Navigating to folder:", { folderId });
      router.push(`/${params.lang}/dashboard/folder/${folderId}`);
    } else {
      // For individual memories, navigate to the memory detail page
      // logger.dashboard('fe').debug("Navigating to memory:", { memoryId: memory.id });
      router.push(`/${params.lang}/dashboard/${memory.id}`);
    }
  };

  const handleUploadSuccess = () => {
    // Refresh the memories list to show the new memory
    fetchDashboardMemories();
  };

  const handleUploadError = (error: Error) => {
    toast({
      title: 'Error',
      description: error.message || 'Failed to upload memory',
      variant: 'destructive',
    });
  };

  const handleFilteredMemoriesChange = useCallback((filtered: ExtendedMemory[]) => {
    logger.dashboard().info('🔍 handleFilteredMemoriesChange called:', {
      filteredCount: filtered.length,
      filtered: filtered.map(f => ({ id: f.id, type: f.type, title: f.title })),
    });
    setFilteredMemories(filtered as MemoryWithFolder[]);
  }, []);

  const handleClearAllMemories = async () => {
    if (!confirm('Are you sure you want to delete ALL memories? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await deleteAllMemories({ all: true });
      setMemories([]);
      setFilteredMemories([]);
      toast({
        title: 'Success',
        description: `Successfully deleted ${result.deletedCount} memories.`,
      });
    } catch (error) {
      logger.dashboard('fe').error('Error clearing all memories', error as Error);
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
      />

      {/* Show loading state while fetching */}
      {isLoadingMemories ? (
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
        </>
      )}

      {/* Tawk.to Chat */}
      <TawkChat />
    </div>
  );
}
