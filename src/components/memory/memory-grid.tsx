import { Memory } from "@/types/memory";
import { MemoryCard } from "./memory-card";
import { DashboardItem } from "@/services/memories";
import { BaseGrid } from "@/components/common/base-grid";

interface MemoryGridProps {
  memories: DashboardItem[] | (Memory & { status: "private" | "shared" | "public"; sharedWithCount?: number })[];
  onDelete?: (id: string) => void;
  onShare?: () => void;
  onEdit?: (id: string) => void;
  onClick?: (memory: Memory | DashboardItem) => void;
  viewMode?: "grid" | "list";
}

export function MemoryGrid({ memories, onDelete, onShare, onEdit, onClick, viewMode = "grid" }: MemoryGridProps) {
  return (
    <BaseGrid
      items={memories}
      renderItem={(memory) => (
        <MemoryCard
          key={memory.id}
          memory={memory}
          onDelete={onDelete || (() => {})}
          onShare={onShare || (() => {})}
          onEdit={onEdit || (() => {})}
          onClick={onClick || (() => {})}
          viewMode={viewMode}
        />
      )}
      viewMode={viewMode}
      gap="sm"
      gridCols={{
        sm: 1,
        md: 2,
        lg: 3,
        xl: 4,
      }}
    />
  );
}
