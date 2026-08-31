'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

interface SharePermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

interface UserShareData {
  shareType: 'user';
  targetUserId: string;
  permissions: SharePermissions;
}

interface PublicLinkData {
  shareType: 'public';
  expiresAt?: string;
  allowedUsers?: string[];
  allowedRoles?: string[];
  requireAuth?: boolean;
  accessRestrictions?: Record<string, unknown>;
}

interface ShareMemoryParams {
  resourceType: 'memory' | 'folder';
  resourceId: string;
  data: UserShareData | PublicLinkData;
}

interface CreatePublicLinkParams {
  resourceType: 'memory' | 'folder';
  resourceId: string;
  expiresAt?: string;
  allowedUsers?: string[];
  allowedRoles?: string[];
  requireAuth?: boolean;
  accessRestrictions?: Record<string, unknown>;
}

// API functions
const shareResource = async ({
  resourceType,
  resourceId,
  data,
}: ShareMemoryParams) => {
  const response = await fetch(`/api/${resourceType}s/${resourceId}/share`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to share resource');
  }

  return response.json();
};

const createPublicLink = async ({
  resourceType,
  resourceId,
  ...params
}: CreatePublicLinkParams) => {
  const response = await fetch(
    `/api/${resourceType}s/${resourceId}/public-link`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create public link');
  }

  return response.json();
};

// React Query mutations
export function useShareResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: shareResource,
    onSuccess: (_data, _variables) => {
      // Invalidate dashboard queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['memories', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['folders', 'dashboard'] });
    },
  });
}

export function useCreatePublicLink() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createPublicLink,
    onSuccess: (data) => {
      // Copy link to clipboard
      if (data.data?.shareUrl) {
        navigator.clipboard.writeText(data.data.shareUrl);
      }

      // Invalidate dashboard queries
      queryClient.invalidateQueries({ queryKey: ['memories', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['folders', 'dashboard'] });
    },
  });
}

// Helper functions for sharing
export function useSharingMutations() {
  const shareResourceMutation = useShareResource();
  const createPublicLinkMutation = useCreatePublicLink();

  const shareWithUser = async (
    resourceType: 'memory' | 'folder',
    resourceId: string,
    targetUserId: string,
    permissions: SharePermissions
  ) => {
    return shareResourceMutation.mutateAsync({
      resourceType,
      resourceId,
      data: {
        shareType: 'user',
        targetUserId,
        permissions,
      },
    });
  };

  const createLink = async (
    resourceType: 'memory' | 'folder',
    resourceId: string,
    options: {
      expiresAt?: string;
      allowedUsers?: string[];
      allowedRoles?: string[];
      requireAuth?: boolean;
      accessRestrictions?: Record<string, unknown>;
    } = {}
  ) => {
    return createPublicLinkMutation.mutateAsync({
      resourceType,
      resourceId,
      ...options,
    });
  };

  return {
    shareWithUser,
    createLink,
    isSharing: shareResourceMutation.isPending,
    isCreatingLink: createPublicLinkMutation.isPending,
    shareError: shareResourceMutation.error,
    linkError: createPublicLinkMutation.error,
  };
}
