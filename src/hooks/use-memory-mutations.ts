/**
 * React Query mutations for memory operations
 *
 * This module provides React Query mutations for memory CRUD operations,
 * including optimistic updates and proper cache invalidation.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/query-keys';
import { deleteMemory, deleteAllMemories } from '@/services/memories';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook for deleting a single memory with optimistic updates
 */
export function useDeleteMemory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (memoryId: string) => {
      await deleteMemory(memoryId);
      return memoryId;
    },
    onMutate: async (memoryId) => {
      // Cancel any outgoing refetches - use partial matching for dashboard queries
      await queryClient.cancelQueries({ queryKey: ['memories', 'dashboard'] });
      await queryClient.cancelQueries({
        queryKey: qk.memories.detail(memoryId),
      });

      // Snapshot the previous value
      const previousDashboardData = queryClient.getQueryData([
        'memories',
        'dashboard',
      ]);
      const previousMemoryData = queryClient.getQueryData(
        qk.memories.detail(memoryId)
      );

      // Instead of complex optimistic updates, let's just invalidate and refetch
      // This is simpler and more reliable
      queryClient.invalidateQueries({ queryKey: ['memories', 'dashboard'] });

      // Force refetch as backup
      queryClient.refetchQueries({ queryKey: ['memories', 'dashboard'] });

      return { previousDashboardData, previousMemoryData };
    },
    onError: (error, memoryId, context) => {
      // Rollback on error
      if (context?.previousDashboardData) {
        queryClient.setQueryData(
          qk.memories.dashboard(),
          context.previousDashboardData
        );
      }
      if (context?.previousMemoryData) {
        queryClient.setQueryData(
          qk.memories.detail(memoryId),
          context.previousMemoryData
        );
      }

      toast({
        title: 'Error',
        description: `Failed to delete memory: ${error.message}`,
        variant: 'destructive',
      });
    },
    onSuccess: (memoryId) => {
      // Remove the memory detail from cache
      queryClient.removeQueries({ queryKey: qk.memories.detail(memoryId) });

      toast({
        title: 'Success',
        description: 'Memory deleted successfully',
      });
    },
    onSettled: () => {
      // The invalidation in onMutate should handle the refetch
      // But let's make sure it happens
      queryClient.invalidateQueries({ queryKey: ['memories', 'dashboard'] });
    },
  });
}

/**
 * Hook for deleting multiple memories
 */
export function useDeleteAllMemories() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (options?: {
      type?: 'image' | 'document' | 'note' | 'video' | 'audio';
      folder?: string;
      all?: boolean;
      hostingPreferences?: { backendHosting?: string; blobHosting?: string[] };
    }) => {
      return await deleteAllMemories(options);
    },
    onSuccess: (result) => {
      // Invalidate all memory-related queries
      queryClient.invalidateQueries({ queryKey: qk.memories.dashboard() });
      queryClient.invalidateQueries({ queryKey: ['memories'] });

      toast({
        title: 'Success',
        description: `Deleted ${result.deletedCount} memories`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete memories: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Hook for updating memory metadata
 */
export function useUpdateMemory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Record<string, unknown>>;
    }) => {
      const response = await fetch(`/api/memories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update memory');
      }

      return response.json();
    },
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: qk.memories.detail(id) });
      await queryClient.cancelQueries({ queryKey: ['memories', 'dashboard'] });

      // Snapshot previous values
      const previousMemory = queryClient.getQueryData(qk.memories.detail(id));
      const previousDashboard = queryClient.getQueryData([
        'memories',
        'dashboard',
      ]);

      // Optimistically update memory detail
      queryClient.setQueryData(qk.memories.detail(id), (old: unknown) => ({
        ...(old as Record<string, unknown>),
        ...updates,
      }));

      // Optimistically update dashboard cache
      queryClient.setQueryData(['memories', 'dashboard'], (old: unknown) => {
        if (!old) return old;

        const oldData = old as {
          pages?: Array<{ memories?: Array<{ id: string }> }>;
        };

        if (oldData.pages) {
          // Infinite query structure (dashboard uses useInfiniteQuery)
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              memories:
                page.memories?.map((memory) =>
                  memory.id === id ? { ...memory, ...updates } : memory
                ) || [],
            })),
          };
        }

        return old;
      });

      return { previousMemory, previousDashboard };
    },
    onError: (error, { id }, context) => {
      // Rollback on error
      if (context?.previousMemory) {
        queryClient.setQueryData(
          qk.memories.detail(id),
          context.previousMemory
        );
      }
      if (context?.previousDashboard) {
        queryClient.setQueryData(
          ['memories', 'dashboard'],
          context.previousDashboard
        );
      }

      toast({
        title: 'Error',
        description: `Failed to update memory: ${error.message}`,
        variant: 'destructive',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Memory updated successfully',
      });
    },
    onSettled: (data, error, { id }) => {
      // Always refetch after mutation
      queryClient.invalidateQueries({ queryKey: qk.memories.detail(id) });
      queryClient.invalidateQueries({ queryKey: ['memories', 'dashboard'] });
    },
  });
}
