import { ContentCard } from '@/components/common/content-card';
import { BaseGrid } from '@/components/common/base-grid';
import { Memory } from '@/types/memory';
import { DashboardItem } from '@/services/memories';
import { useDeleteMemory } from '@/hooks/use-memory-mutations';

// Import FlexibleItem type from ContentCard
type FlexibleItem = Parameters<typeof ContentCard>[0]['item'];

interface MemoryGridProps {
  memories: DashboardItem[] | (Memory & { status: 'private' | 'shared' | 'public'; sharedWithCount?: number })[];
  onDelete?: (id: string) => void;
  onShare?: () => void;
  onEdit?: (id: string) => void;
  onClick?: (memory: Memory | DashboardItem) => void;
  viewMode?: 'grid' | 'list';
  useReactQuery?: boolean; // New prop to enable React Query mutations
}

export function MemoryGrid({ 
  memories, 
  onDelete, 
  onShare, 
  onEdit, 
  onClick, 
  viewMode = 'grid',
  useReactQuery = false 
}: MemoryGridProps) {
  console.log('🔄 [MEMORY GRID] Component rendering with memories:', memories.length);
  console.log('🔄 [MEMORY GRID] Memory IDs:', memories.map(m => m.id));
  
  const deleteMemoryMutation = useDeleteMemory();

  const handleDelete = (item: FlexibleItem) => {
    if (useReactQuery) {
      deleteMemoryMutation.mutate(item.id);
    } else if (onDelete) {
      onDelete(item.id);
    }
  };
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
          onDelete={handleDelete}
          onShare={onShare || (() => {})}
          onEdit={onEdit ? () => onEdit(memory.id) : undefined}
          viewMode={viewMode}
          contentType="memory"
        />
      )}
    />
  );
}
