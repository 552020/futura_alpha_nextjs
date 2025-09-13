"use client";

import { Button } from "@/components/ui/button";
import { Memory as BaseMemory } from "@/types/memory";
import { CreateGalleryModal } from "@/components/galleries/create-gallery-modal";
import { BaseTopBar } from "@/components/common/base-top-bar";
import { ImageIcon } from "lucide-react";

// Extended Memory interface for gallery with additional properties
interface ExtendedMemory extends BaseMemory {
  tags?: string[];
  isFavorite?: boolean;
  views?: number;
}

interface FolderTopBarProps {
  memories: ExtendedMemory[];
  onFilteredMemoriesChange: (filteredMemories: ExtendedMemory[]) => void;
  showViewToggle?: boolean;
  onViewModeChange?: (mode: "grid" | "list") => void;
  viewMode?: "grid" | "list";
  className?: string;
  folderName?: string;
  onCreateGallery?: (galleryId?: string) => void;
}

export function FolderTopBar({
  memories,
  onFilteredMemoriesChange,
  showViewToggle = true,
  onViewModeChange,
  viewMode = "grid",
  className = "",
  folderName,
  onCreateGallery,
}: FolderTopBarProps) {
  // Create gallery button action
  const leftActions = (
    <CreateGalleryModal
      prefillFolderName={folderName}
      onGalleryCreated={onCreateGallery}
      hideFolderSelection={true}
      trigger={
        <Button variant="default" size="sm" className="h-9 px-4 py-1 text-sm whitespace-nowrap">
          <ImageIcon className="h-4 w-4 mr-2" />
          Create Gallery from &quot;{folderName}&quot;
        </Button>
      }
    />
  );

  return (
    <BaseTopBar
      items={memories}
      onFilteredItemsChange={onFilteredMemoriesChange}
      showViewToggle={showViewToggle}
      onViewModeChange={onViewModeChange}
      viewMode={viewMode}
      className={className}
      leftActions={leftActions}
      searchPlaceholder="Search memories, tags, or descriptions..."
      searchFields={(memory) => [memory.title, memory.description || "", ...(memory.tags || [])]}
      filterOptions={[
        { value: "all", label: "All Types" },
        { value: "image", label: "Images" },
        { value: "video", label: "Videos" },
        { value: "document", label: "Documents" },
        { value: "audio", label: "Audio" },
      ]}
      filterLogic={(memory, filterType) => {
        if (filterType === "all") return true;
        return memory.type === filterType;
      }}
      sortOptions={[
        { value: "newest", label: "Newest First" },
        { value: "oldest", label: "Oldest First" },
        { value: "most-viewed", label: "Most Viewed" },
        { value: "favorites", label: "Favorites First" },
      ]}
      sortLogic={(a, b, sortBy) => {
        switch (sortBy) {
          case "newest":
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case "oldest":
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          case "most-viewed":
            return ((b as ExtendedMemory).views || 0) - ((a as ExtendedMemory).views || 0);
          case "favorites":
            return ((b as ExtendedMemory).isFavorite ? 1 : 0) - ((a as ExtendedMemory).isFavorite ? 1 : 0);
          default:
            return 0;
        }
      }}
    />
  );
}
