import type { Capsule, CapsuleInfo } from '@/ic/declarations/backend/backend.did.d.ts';

/**
 * Error types for capsule operations
 */
export type CapsuleError =
  | { kind: 'connection'; message: string }
  | { kind: 'authExpired'; message: string }
  | { kind: 'unauthorized'; message: string }
  | { kind: 'notFound'; message: string }
  | { kind: 'invalid'; message: string }
  | { kind: 'internal'; message: string };

/**
 * Single capsule state interface
 * Uses backend Capsule type directly - no adapter needed
 */
export interface CapsuleState {
  // Core capsule data (using actual backend types)
  capsule: Capsule | null;

  // UI state
  isLoading: boolean;
  error?: CapsuleError;
}

/**
 * Collections state interface (for future use)
 * Extends single capsule state for multiple capsules
 */
export interface CapsulesState {
  // High-level capsule management
  capsules: CapsuleInfo[]; // Array of capsule summaries
  currentCapsule: Capsule | null; // Selected capsule structure

  // UI state
  isLoading: boolean;
  error?: CapsuleError;

  // Navigation state
  selectedCapsuleId: string | null;
}

// Re-export backend types for convenience
export type {
  Capsule,
  CapsuleInfo,
  PersonRef,
  OwnerState,
  ControllerState,
  CapsuleUpdateData,
} from '@/ic/declarations/backend/backend.did.d.ts';
