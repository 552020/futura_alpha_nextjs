'use client';

import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil, Share2, Trash2 } from 'lucide-react';

interface BaseCardProps<T> {
  item: T;
  onClick: (item: T) => void;
  onEdit?: (item: T) => void;
  onShare?: (item: T) => void;
  onDelete?: (item: T) => void;

  // Content renderers
  renderPreview: (item: T) => React.ReactNode;
  renderTitle: (item: T) => React.ReactNode;
  renderDescription?: (item: T) => React.ReactNode;
  renderStorageBadge?: (item: T) => React.ReactNode;
  renderLeftStatus: (item: T) => React.ReactNode;

  // Styling
  className?: string;
}

export function BaseCard<T>({
  item,
  onClick,
  onEdit,
  onShare,
  onDelete,
  renderPreview,
  renderTitle,
  renderDescription,
  renderStorageBadge,
  renderLeftStatus,
  className = '',
}: BaseCardProps<T>) {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md flex flex-col h-full ${className}`}
      onClick={() => onClick(item)}
    >
      <CardContent className="px-2 pt-4 pb-2 flex-1">
        {/* Preview section */}
        <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted flex items-center justify-center">
          {renderPreview(item)}
        </div>

        {/* Title */}
        <h3 className="mt-2 text-sm font-medium truncate" title={String(renderTitle(item))}>
          {renderTitle(item)}
        </h3>

        {/* Description (optional) */}
        {renderDescription && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{renderDescription(item)}</p>
        )}

        {/* Storage Badge (optional) */}
        {renderStorageBadge && (
          <div className="mt-1 flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Storage:</span>
            {renderStorageBadge(item)}
          </div>
        )}
      </CardContent>

      {/* Footer with controls */}
      <CardFooter className="p-2">
        <div className="flex w-full items-center justify-between">
          {/* Left side - Status items */}
          <div className="flex items-center gap-3">{renderLeftStatus(item)}</div>

          {/* Right side - Action buttons */}
          <div className="flex items-center gap-0.5">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={e => {
                  e.stopPropagation();
                  onEdit(item);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {onShare && (
              <Button
                variant="ghost"
                size="icon"
                onClick={e => {
                  e.stopPropagation();
                  onShare(item);
                }}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={e => {
                  e.stopPropagation();
                  onDelete(item);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
