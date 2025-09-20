import { Lock, Users, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { usePathname } from 'next/navigation';

type MemoryStatus = 'private' | 'shared' | 'public';

interface MemoryStatusProps {
  status: MemoryStatus;
  sharedWithCount?: number;
  sharedBy?: string;
  className?: string;
}

export function MemoryStatus({ status, sharedWithCount, sharedBy, className }: MemoryStatusProps) {
  const pathname = usePathname();
  const isSharedRoute = pathname.includes('/shared');

  const getStatusConfig = () => {
    switch (status) {
      case 'private':
        return {
          icon: Lock,
          label: 'Private',
          description: 'Only you can see this',
          color: 'text-muted-foreground',
        };
      case 'shared':
        if (isSharedRoute && sharedBy) {
          return {
            icon: Users,
            label: 'Shared',
            description: `Shared by ${sharedBy}`,
            color: 'text-blue-500',
          };
        }
        return {
          icon: Users,
          label: 'Shared',
          description: `Shared with ${sharedWithCount} ${sharedWithCount === 1 ? 'person' : 'people'}`,
          color: 'text-blue-500',
        };
      case 'public':
        return {
          icon: Globe,
          label: 'Public',
          description: 'Anyone can view this',
          color: 'text-green-500',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-1.5 text-sm', config.color, className)}>
            <Icon className="h-4 w-4" />
            <span>{config.label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
