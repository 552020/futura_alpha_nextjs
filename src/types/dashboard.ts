import { Memory as BaseMemory } from '@/types/memory';

// Extended Memory interface for dashboard components with additional properties
export interface ExtendedMemory extends Omit<BaseMemory, 'parentFolderId'> {
  tags?: string[];
  isFavorite?: boolean;
  views?: number;
  parentFolderId?: string | null; // Allow null for database compatibility
}
