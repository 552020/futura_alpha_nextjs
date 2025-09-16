import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useIICoAuth } from '../use-ii-coauth';

// Mock the checkIICoAuthTTL function
vi.mock('@/lib/ii-coauth-ttl', () => ({
  checkIICoAuthTTL: vi.fn(() => ({
    status: 'inactive',
    remainingMinutes: 0,
    isExpired: false,
    isInGracePeriod: false,
    isWarning: false,
  })),
  requiresIIReAuth: vi.fn(() => false),
}));

// Mock NextAuth useSession
const mockUseSession = vi.fn();
vi.mock('next-auth/react', () => ({
  useSession: mockUseSession,
}));

describe('useIICoAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return initial state when no session', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: vi.fn(),
    });

    const { result } = renderHook(() => useIICoAuth());

    expect(result.current.hasLinkedII).toBe(false);
    expect(result.current.isCoAuthActive).toBe(false);
    expect(result.current.linkedIcPrincipal).toBeUndefined();
    expect(result.current.activeIcPrincipal).toBeUndefined();
    expect(result.current.statusMessage).toBe('II Not Active');
  });

  it('should detect linked II account when present', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'user-123',
          linkedIcPrincipal: 'test-principal-123',
        },
      },
      status: 'authenticated',
      update: vi.fn(),
    });

    const { result } = renderHook(() => useIICoAuth());

    expect(result.current.hasLinkedII).toBe(true);
    expect(result.current.linkedIcPrincipal).toBe('test-principal-123');
    expect(result.current.isCoAuthActive).toBe(false);
  });

  it('should detect active II co-auth when both principal and timestamp present', () => {
    const now = Date.now();
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'user-123',
          linkedIcPrincipal: 'test-principal-123',
          icpPrincipal: 'test-principal-123',
          icpPrincipalAssertedAt: now,
        },
      },
      status: 'authenticated',
      update: vi.fn(),
    });

    const { result } = renderHook(() => useIICoAuth());

    expect(result.current.hasLinkedII).toBe(true);
    expect(result.current.isCoAuthActive).toBe(true);
    expect(result.current.activeIcPrincipal).toBe('test-principal-123');
    expect(result.current.assertedAt).toBe(now);
  });

  it('should provide correct status message for different states', () => {
    // Test inactive state
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'user-123',
          linkedIcPrincipal: 'test-principal-123',
        },
      },
      status: 'authenticated',
      update: vi.fn(),
    });

    const { result } = renderHook(() => useIICoAuth());
    expect(result.current.statusMessage).toBe('II Not Active');

    // Test active state
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'user-123',
          linkedIcPrincipal: 'test-principal-123',
          icpPrincipal: 'test-principal-123',
          icpPrincipalAssertedAt: Date.now(),
        },
      },
      status: 'authenticated',
      update: vi.fn(),
    });

    const { result: result2 } = renderHook(() => useIICoAuth());
    expect(result2.current.statusMessage).toContain('II Active');
  });

  it('should provide action functions', () => {
    const mockUpdate = vi.fn();
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'user-123',
          linkedIcPrincipal: 'test-principal-123',
        },
      },
      status: 'authenticated',
      update: mockUpdate,
    });

    const { result } = renderHook(() => useIICoAuth());

    expect(typeof result.current.activateII).toBe('function');
    expect(typeof result.current.disconnectII).toBe('function');
    expect(typeof result.current.refreshTTL).toBe('function');
  });
});
