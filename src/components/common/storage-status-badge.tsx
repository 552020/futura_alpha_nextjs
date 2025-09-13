import { Badge } from "@/components/ui/badge";

export type StorageStatus = "icp" | "neon";

interface StorageStatusBadgeProps {
  status: StorageStatus;
  size?: "xs" | "sm" | "md";
  className?: string;
}

export function StorageStatusBadge({ status, size = "sm", className = "" }: StorageStatusBadgeProps) {
  const sizeClasses = {
    xs: "text-[10px] px-1 py-0.5 h-4 min-w-[24px]",
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
  };

  return (
    <Badge variant="secondary" className={`${sizeClasses[size]} font-mono ${className}`}>
      {status.toUpperCase()}
    </Badge>
  );
}

// Mock data for testing
export const mockStorageStatuses = {
  gallery: {
    storedInICP: { status: "icp" as const },
    storedInNeon: { status: "neon" as const },
  },
  memory: {
    storedInICP: { status: "icp" as const },
    storedInNeon: { status: "neon" as const },
  },
};

// Helper function to determine storage status from gallery data
export function getGalleryStorageStatus(gallery: {
  storageStatus?: { status: string };
  icpComplete?: boolean;
  storedInICP?: boolean;
}): StorageStatus {
  // If gallery has storageStatus from our API
  if (gallery.storageStatus) {
    // Map the API status values to our badge values
    switch (gallery.storageStatus.status) {
      case "stored_forever":
        return "icp";
      case "partially_stored":
        return "icp"; // Show as ICP even if partially stored
      case "web2_only":
      default:
        return "neon";
    }
  }

  // Fallback: check if gallery has any ICP storage indicators
  if (gallery.icpComplete || gallery.storedInICP) {
    return "icp";
  }

  return "neon";
}

// Helper function to determine storage status from memory data
export function getMemoryStorageStatus(memory: {
  storageStatus?: { status: string };
  icpComplete?: boolean;
  storedInICP?: boolean;
}): StorageStatus {
  // If memory has storageStatus from our API
  if (memory.storageStatus) {
    return memory.storageStatus.status === "stored_forever" ? "icp" : "neon";
  }

  // Fallback: check if memory has any ICP storage indicators
  if (memory.icpComplete || memory.storedInICP) {
    return "icp";
  }

  return "neon";
}
