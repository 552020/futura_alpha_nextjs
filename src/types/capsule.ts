import type {
  Capsule,
  CapsuleInfo,
  CapsuleHeader,
  PersonRef,
} from '@/ic/declarations/backend/backend.did.d.ts';

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
 * Unified capsule list item for frontend components
 * Adapter type that works with both CapsuleInfo and CapsuleHeader
 */
export interface CapsuleListItem {
  id: string;
  subject: PersonRef;
  isOwner: boolean;
  isController: boolean;
  isSelfCapsule: boolean;
  boundToNeon: boolean;
  createdAt: bigint;
  updatedAt: bigint;
  memoryCount: bigint;
  galleryCount: bigint;
  connectionCount: bigint;
}

/**
 * Collections state interface (for future use)
 * Extends single capsule state for multiple capsules
 */
export interface CapsulesState {
  // High-level capsule management
  capsules: CapsuleListItem[]; // Array of capsule summaries
  currentCapsule: Capsule | null; // Selected capsule structure

  // UI state
  isLoading: boolean;
  error?: CapsuleError;

  // Navigation state
  selectedCapsuleId: string | null;
}

/**
 * Adapter functions to convert backend types to unified frontend types
 */
export function adaptCapsuleInfo(capsuleInfo: CapsuleInfo): CapsuleListItem {
  return {
    id: capsuleInfo.capsule_id,
    subject: capsuleInfo.subject,
    isOwner: capsuleInfo.is_owner,
    isController: capsuleInfo.is_controller,
    isSelfCapsule: capsuleInfo.is_self_capsule,
    boundToNeon: capsuleInfo.bound_to_neon,
    createdAt: capsuleInfo.created_at,
    updatedAt: capsuleInfo.updated_at,
    memoryCount: capsuleInfo.memory_count,
    galleryCount: capsuleInfo.gallery_count,
    connectionCount: capsuleInfo.connection_count,
  };
}

export function adaptCapsuleHeader(
  capsuleHeader: CapsuleHeader,
  currentUserPrincipal?: string
): CapsuleListItem {
  // Determine if this is a self-capsule by comparing subject to current user's principal
  let isSelfCapsule = false;
  if (currentUserPrincipal && 'Principal' in capsuleHeader.subject) {
    isSelfCapsule =
      capsuleHeader.subject.Principal.toString() === currentUserPrincipal;
  }

  return {
    id: capsuleHeader.id,
    subject: capsuleHeader.subject,
    isOwner: capsuleHeader.owner_count > 0,
    isController: capsuleHeader.controller_count > 0,
    isSelfCapsule: isSelfCapsule,
    boundToNeon: false, // CapsuleHeader doesn't have this info
    createdAt: capsuleHeader.created_at,
    updatedAt: capsuleHeader.updated_at,
    memoryCount: capsuleHeader.memory_count,
    galleryCount: BigInt(0), // CapsuleHeader doesn't have this info
    connectionCount: BigInt(0), // CapsuleHeader doesn't have this info
  };
}

// Re-export backend types for convenience
export type {
  Capsule,
  CapsuleInfo,
  CapsuleHeader,
  PersonRef,
  OwnerState,
  ControllerState,
  CapsuleUpdateData,
} from '@/ic/declarations/backend/backend.did.d.ts';
