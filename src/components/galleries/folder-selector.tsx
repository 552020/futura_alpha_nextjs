"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderInfo } from "@/types/gallery";
import { RefreshCw, Folder, Image as ImageIcon } from "lucide-react";

interface FolderSelectorProps {
  folders: FolderInfo[];
  isLoading: boolean;
  selectedFolder: string;
  onFolderSelect: (folderName: string) => void;
  onRefresh?: () => void;
  placeholder?: string;
}

export function FolderSelector({
  folders,
  isLoading,
  selectedFolder,
  onFolderSelect,
  onRefresh,
  placeholder = "Select a folder...",
}: FolderSelectorProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-4 w-32" />
      </div>
    );
  }

  if (folders.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Folder className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">No folders found</span>
          </div>
          {onRefresh && (
            <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          )}
        </div>
        <div className="text-center py-6 border-2 border-dashed border-muted-foreground/25 rounded-lg">
          <Folder className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground mb-2">No folders with memories found</p>
          <p className="text-xs text-muted-foreground">
            Upload memories to folders first, then create galleries from them.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Select value={selectedFolder} onValueChange={onFolderSelect}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {folders.map((folder) => (
              <SelectItem key={folder.name} value={folder.name}>
                <div className="flex items-center space-x-2">
                  <Folder className="h-4 w-4" />
                  <span className="flex-1">{folder.name}</span>
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <ImageIcon className="h-3 w-3" />
                    <span>{folder.imageCount}</span>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {onRefresh && (
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="ml-2">
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        )}
      </div>
      {selectedFolder && (
        <div className="text-xs text-muted-foreground">
          Selected: {selectedFolder} ({folders.find((f) => f.name === selectedFolder)?.imageCount || 0} items)
        </div>
      )}
    </div>
  );
}
