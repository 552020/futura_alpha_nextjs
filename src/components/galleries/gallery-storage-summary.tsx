import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { HardDrive, Database, Cloud } from "lucide-react";
import { useBatchMemoryStorageStatus, getGalleryStorageSummary } from "@/hooks/use-memory-storage-status";
import type { GalleryWithItems } from "@/types/gallery";

interface GalleryStorageSummaryProps {
  gallery: GalleryWithItems;
  onStoreForever?: () => void;
  className?: string;
}

export function GalleryStorageSummary({ gallery, onStoreForever, className = "" }: GalleryStorageSummaryProps) {
  const memories =
    gallery.items
      ?.map((item) => ({
        id: item.memory?.id,
        type: item.memory?.type,
      }))
      .filter((memory) => memory.id && memory.type) || [];

  const { statusMap, isLoading } = useBatchMemoryStorageStatus(memories);
  const summary = getGalleryStorageSummary(statusMap, memories);

  // Don't show if all memories are Web2-only and not loading
  if (!isLoading && summary.overallStatus === "web2_only" && summary.total > 0) {
    return null;
  }

  // Don't show if no memories
  if (summary.total === 0) {
    return null;
  }

  return (
    <div className={`border-b bg-muted/30 ${className}`}>
      <div className="container mx-auto px-6 py-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Storage Status</span>
              </div>
              {summary.overallStatus === "partially_stored" && onStoreForever && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onStoreForever}
                  className="border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950"
                >
                  <HardDrive className="h-4 w-4 mr-2" />
                  Complete Storage
                </Button>
              )}
            </div>
            <div className="text-xs text-muted-foreground">{summary.icpCompletePercentage}% on ICP</div>
          </div>

          {/* Progress Bar */}
          {summary.hasAnyIcp && (
            <div className="space-y-2">
              <Progress value={summary.icpCompletePercentage} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {summary.icpComplete} of {summary.total} memories stored permanently
                </span>
                {summary.icpPartial > 0 && <span>{summary.icpPartial} partially stored</span>}
              </div>
            </div>
          )}

          {/* Storage Breakdown */}
          <div className="flex items-center gap-6 text-xs">
            {summary.icpComplete > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <Cloud className="h-3 w-3 text-green-600" />
                <span className="text-green-700 dark:text-green-300">{summary.icpComplete} on ICP</span>
              </div>
            )}

            {summary.icpPartial > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <Cloud className="h-3 w-3 text-orange-600" />
                <span className="text-orange-700 dark:text-orange-300">{summary.icpPartial} partial</span>
              </div>
            )}

            {summary.web2Only > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                <Database className="h-3 w-3 text-gray-600" />
                <span className="text-gray-700 dark:text-gray-300">{summary.web2Only} on Neon</span>
              </div>
            )}

            {summary.loading > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"></div>
                <span className="text-gray-500">{summary.loading} loading...</span>
              </div>
            )}

            {summary.error > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-red-600 dark:text-red-400">{summary.error} error</span>
              </div>
            )}
          </div>

          {/* Status Message */}
          {!isLoading && (
            <div className="text-xs text-muted-foreground">
              {summary.isFullyOnIcp ? (
                <span className="text-green-700 dark:text-green-300">
                  ✓ All memories are stored permanently on the Internet Computer
                </span>
              ) : summary.hasAnyIcp ? (
                <span className="text-orange-700 dark:text-orange-300">
                  ⚡ Gallery is partially stored on the Internet Computer
                </span>
              ) : (
                <span>Gallery is stored in standard database</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
