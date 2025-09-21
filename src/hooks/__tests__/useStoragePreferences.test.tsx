import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';
import {
  useStoragePreferences,
  useUpdateStoragePreferences,
  prefToToggles,
  togglesToPref,
} from '../useStoragePreferences';

// Mock fetch
global.fetch = vi.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'TestWrapper';
  return Wrapper;
};

describe('useStoragePreferences', () => {
  it('should convert preference to toggles correctly', () => {
    expect(prefToToggles('neon')).toEqual({ neon: true, icp: false });
    expect(prefToToggles('icp')).toEqual({ neon: false, icp: true });
    expect(prefToToggles('dual')).toEqual({ neon: true, icp: true });
  });

  it('should convert toggles to preference correctly', () => {
    expect(togglesToPref(true, false)).toBe('neon');
    expect(togglesToPref(false, true)).toBe('icp');
    expect(togglesToPref(true, true)).toBe('dual');
    expect(togglesToPref(false, false)).toBe('neon'); // fallback
  });

  it('should fetch storage preferences', async () => {
    const mockData = {
      preference: 'dual',
      primary: 'neon-db',
      allowed: { icp: true, neon: true },
      updatedAt: '2024-01-01T00:00:00Z',
    };

    (fetch as vi.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const { result } = renderHook(() => useStoragePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockData);
  });

  it('should handle fetch errors', async () => {
    (fetch as vi.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useStoragePreferences(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });
});

describe('useUpdateStoragePreferences', () => {
  it('should update storage preferences', async () => {
    const mockResponse = {
      success: true,
      data: {
        preference: 'icp',
        primary: 'icp-canister',
        allowed: { icp: true, neon: true },
        updatedAt: '2024-01-01T00:00:00Z',
      },
    };

    (fetch as vi.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useUpdateStoragePreferences(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      preference: 'icp',
      primary: 'icp-canister',
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(fetch).toHaveBeenCalledWith('/api/me/storage', {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': expect.any(String),
      },
      body: JSON.stringify({
        preference: 'icp',
        primary: 'icp-canister',
      }),
    });
  });

  it('should handle update errors', async () => {
    (fetch as vi.Mock).mockResolvedValueOnce({
      ok: false,
      statusText: 'Bad Request',
      json: async () => ({ message: 'Invalid preference' }),
    });

    const { result } = renderHook(() => useUpdateStoragePreferences(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      preference: 'invalid' as Pref,
      primary: 'neon-db',
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });
});
