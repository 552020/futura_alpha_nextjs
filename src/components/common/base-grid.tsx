interface BaseItem {
  id: string;
}

interface BaseGridProps<T extends BaseItem> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  emptyState?: React.ReactNode;
  className?: string;
  gap?: 'sm' | 'md' | 'lg';
  gridCols?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  selectionMode?: boolean;
  selectedItems?: Set<string>;
  ratings?: Record<string, number>;
  hiddenItems?: Set<string>;
  onSelectionToggle?: (itemId: string, checked: boolean) => void;
  onRate?: (itemId: string, rating: number) => void;
  onHide?: (itemId: string) => void;
  onUnhide?: (itemId: string) => void;
}

const gapClasses = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
};

export function BaseGrid<T extends BaseItem>({
  items,
  renderItem,
  emptyState,
  className = '',
  gap = 'md',
  gridCols = { sm: 1, md: 2, lg: 3, xl: 4 },
}: BaseGridProps<T>) {
  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  // Build grid classes
  const gridClasses = [
    'grid',
    'grid-cols-1', // Always start with 1 column
    gapClasses[gap],
    // Add responsive breakpoints only if specified
    gridCols.sm && `sm:grid-cols-${gridCols.sm}`,
    gridCols.md && `md:grid-cols-${gridCols.md}`,
    gridCols.lg && `lg:grid-cols-${gridCols.lg}`,
    gridCols.xl && `xl:grid-cols-${gridCols.xl}`,
  ]
    .filter(Boolean) // Remove undefined values
    .join(' ');

  return (
    <div className={`${gridClasses} ${className}`.trim()}>
      {items.map((item, index) => (
        <div key={item.id}>{renderItem(item, index)}</div>
      ))}
    </div>
  );
}
