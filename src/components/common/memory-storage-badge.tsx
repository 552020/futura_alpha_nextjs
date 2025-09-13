/**
 * NOTE: This component is currently NOT USED in memory cards.
 * Storage location info has been moved to the description area for consistency with galleries.
 * 
 * This component is kept for potential future use (e.g., overlay badges, detailed tooltips, etc.)
 * but is not actively rendered in the current UI.
 */

import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useMemoryStorageStatus, type MemoryStorageStatus } from "@/hooks/use-memory-storage-status";

interface MemoryStorageBadgeProps {
  memoryId: string;
  memoryType: string;
  size?: "xs" | "sm";
  className?: string;
  showTooltip?: boolean;
}

export function MemoryStorageBadge({
  memoryId,
  memoryType,
  size = "xs",
  className = "",
  showTooltip = true,
}: MemoryStorageBadgeProps) {
  const { status, data: presenceData } = useMemoryStorageStatus(memoryId, memoryType);

  // Safety check: don't render if required props are missing
  if (!memoryId || !memoryType) {
    return null;
  }

  const getBadgeConfig = () => {
    switch (status) {
      case "stored_forever":
        return {
          text: "ICP",
          variant: "default" as const,
          className:
            "bg-green-100 text-green-800 border-green-200 hover:bg-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-800",
          tooltip: "Stored permanently on Internet Computer",
        };
      case "partially_stored":
        return {
          text: "ICP*",
          variant: "secondary" as const,
          className:
            "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-100 dark:border-orange-800",
          tooltip: "Partially stored on Internet Computer",
        };
      case "web2_only":
        return {
          text: "NEON",
          variant: "secondary" as const,
          className:
            "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
          tooltip: "Stored in standard database",
        };
      case "loading":
        return {
          text: "",
          variant: "secondary" as const,
          className: "bg-gray-100 text-gray-500 border-gray-200",
          tooltip: "Loading storage status...",
        };
      case "error":
        return {
          text: "?",
          variant: "secondary" as const,
          className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-100 dark:border-red-800",
          tooltip: "Error loading storage status",
        };
    }
  };

  const config = getBadgeConfig();

  const sizeClasses = {
    xs: "text-[10px] px-1 py-0.5 h-4 min-w-[24px]",
    sm: "text-xs px-1.5 py-0.5 h-5 min-w-[32px]",
  };

  const badge = (
    <Badge
      variant={config.variant}
      className={`${sizeClasses[size]} font-mono font-medium ${config.className} ${className} flex items-center justify-center`}
    >
      {status === "loading" ? <Loader2 className="h-2 w-2 animate-spin" /> : config.text}
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <div className="relative group">
      {badge}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
        {config.tooltip}
        {presenceData && status !== "loading" && status !== "error" && (
          <div className="text-[10px] text-gray-300 mt-1">
            Meta: {presenceData.metaIcp ? "ICP" : "Neon"} | Asset:{" "}
            {presenceData.assetIcp ? "ICP" : presenceData.assetBlob ? "Blob" : "None"}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to get memory storage status from memory data
export function getMemoryStorageStatusFromData(memory: {
  storageStatus?: { overallStatus: string };
  overallStatus?: string;
}): MemoryStorageStatus {
  const status = memory.storageStatus?.overallStatus || memory.overallStatus;

  switch (status) {
    case "stored_forever":
      return "stored_forever";
    case "partially_stored":
      return "partially_stored";
    case "web2_only":
      return "web2_only";
    default:
      return "web2_only";
  }
}

// Export the type for use in other components
export type { MemoryStorageStatus };
