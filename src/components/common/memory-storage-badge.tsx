import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { useMemoryStorageStatus, type MemoryStorageStatus } from '@/hooks/use-memory-storage-status';

interface MemoryStorageBadgeProps {
  memoryId: string;
  memoryType: string;
  dataSource?: 'neon' | 'icp';
  size?: 'xs' | 'sm';
  className?: string;
  showTooltip?: boolean;
  storageStatus?: {
    storageLocations: string[];
  };
}

export function MemoryStorageBadge({
  memoryId,
  memoryType,
  dataSource,
  size = 'xs',
  className = '',
  showTooltip = true,
  storageStatus,
}: MemoryStorageBadgeProps) {
  // DEBUG: Log the incoming props
  console.log('🔍 [MemoryStorageBadge] memoryId:', memoryId);
  console.log('🔍 [MemoryStorageBadge] memoryType:', memoryType);
  console.log('🔍 [MemoryStorageBadge] dataSource:', dataSource);
  console.log('🔍 [MemoryStorageBadge] hasStorageStatus:', !!storageStatus);
  console.log('🔍 [MemoryStorageBadge] storageLocations:', storageStatus?.storageLocations);

  // Only call the hook if storageStatus is not provided
  const { status, data: presenceData } = useMemoryStorageStatus(
    storageStatus ? '' : memoryId,
    storageStatus ? '' : memoryType,
    dataSource
  );

  // Use provided storageStatus if available, otherwise use hook result
  const finalStatus: MemoryStorageStatus = storageStatus ? storageStatus.storageLocations : status;

  // DEBUG: Log the final status
  console.log('🔍 [MemoryStorageBadge] finalStatus:', finalStatus);
  console.log('🔍 [MemoryStorageBadge] isArray:', Array.isArray(finalStatus));
  console.log('🔍 [MemoryStorageBadge] statusFromHook:', status);

  // Safety check: don't render if required props are missing
  if (!memoryId || !memoryType) {
    return null;
  }

  const getBadgeConfig = () => {
    if (finalStatus === 'loading') {
      return {
        text: '',
        variant: 'secondary' as const,
        className: 'bg-gray-100 text-gray-500 border-gray-200',
        tooltip: 'Loading storage status...',
      };
    }

    if (finalStatus === 'error') {
      return {
        text: '?',
        variant: 'secondary' as const,
        className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900 dark:text-red-100 dark:border-red-800',
        tooltip: 'Error loading storage status',
      };
    }

    // Handle array of storage locations
    if (Array.isArray(finalStatus)) {
      const locations = finalStatus;
      const hasIcp = locations.includes('icp');
      const hasNeon = locations.includes('neon');
      const hasOther = locations.some(loc => !['icp', 'neon'].includes(loc));

      if (hasIcp && hasNeon) {
        return {
          text: 'ICP+NEON',
          variant: 'default' as const,
          className:
            'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-100 dark:border-blue-800',
          tooltip: `Stored on: ${locations.join(', ')}`,
        };
      } else if (hasIcp) {
        return {
          text: 'ICP',
          variant: 'default' as const,
          className:
            'bg-green-100 text-green-800 border-green-200 hover:bg-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-800',
          tooltip: `Stored on: ${locations.join(', ')}`,
        };
      } else if (hasNeon) {
        return {
          text: 'NEON',
          variant: 'secondary' as const,
          className:
            'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
          tooltip: `Stored on: ${locations.join(', ')}`,
        };
      } else if (hasOther) {
        return {
          text: locations[0]?.toUpperCase() || 'OTHER',
          variant: 'secondary' as const,
          className:
            'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-100 dark:border-purple-800',
          tooltip: `Stored on: ${locations.join(', ')}`,
        };
      } else {
        return {
          text: 'UNKNOWN',
          variant: 'secondary' as const,
          className: 'bg-gray-100 text-gray-500 border-gray-200',
          tooltip: 'Storage location unknown',
        };
      }
    }

    // Fallback for unexpected status
    return {
      text: '?',
      variant: 'secondary' as const,
      className: 'bg-gray-100 text-gray-500 border-gray-200',
      tooltip: 'Unknown storage status',
    };
  };

  const config = getBadgeConfig();

  const sizeClasses = {
    xs: 'text-[10px] px-1 py-0.5 h-4 min-w-[24px]',
    sm: 'text-xs px-1.5 py-0.5 h-5 min-w-[32px]',
  };

  const badge = (
    <Badge
      variant={config.variant}
      className={`${sizeClasses[size]} font-mono font-medium ${config.className} ${className} flex items-center justify-center`}
    >
      {finalStatus === 'loading' ? <Loader2 className="h-2 w-2 animate-spin" /> : config.text}
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
        {presenceData && Array.isArray(finalStatus) && finalStatus.length > 0 && (
          <div className="text-[10px] text-gray-300 mt-1">Locations: {finalStatus.join(', ')}</div>
        )}
      </div>
    </div>
  );
}

// Helper function to get memory storage status from memory data
export function getMemoryStorageStatusFromData(memory: {
  storageStatus?: { storageLocations?: string[] };
}): MemoryStorageStatus {
  return memory.storageStatus?.storageLocations || [];
}

// Export the type for use in other components
export type { MemoryStorageStatus };
