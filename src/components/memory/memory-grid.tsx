import { ContentCard } from '@/components/common/content-card';
import { BaseGrid } from '@/components/common/base-grid';
import { Memory } from '@/types/memory';
import { DashboardItem } from '@/services/memories';

interface MemoryGridProps {
  memories: DashboardItem[] | (Memory & { status: 'private' | 'shared' | 'public'; sharedWithCount?: number })[];
  onDelete?: (id: string) => void;
  onShare?: () => void;
  onEdit?: (id: string) => void;
  onClick?: (memory: Memory | DashboardItem) => void;
  viewMode?: 'grid' | 'list';
}

export function MemoryGrid({ memories, onDelete, onShare, onEdit, onClick, viewMode = 'grid' }: MemoryGridProps) {
  return (
    <BaseGrid
      items={memories}
      gap="md"
      gridCols={{ sm: 1, md: 2, lg: 3, xl: 4 }}
      renderItem={(memory) => (
        <ContentCard
          key={memory.id}
          item={memory}
          onClick={(item) => onClick?.(item as Memory | DashboardItem)}
          onDelete={onDelete ? () => onDelete(memory.id) : undefined}
          onShare={onShare || (() => {})}
          onEdit={onEdit ? () => onEdit(memory.id) : undefined}
          viewMode={viewMode}
          contentType="memory"
        />
      )}
    />
  );
}
