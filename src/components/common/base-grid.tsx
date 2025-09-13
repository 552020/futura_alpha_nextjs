import { cn } from "@/lib/utils";

interface BaseGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  emptyState?: React.ReactNode;
  viewMode?: "grid" | "list";
  gridCols?: {
    sm?: number; // 640px+
    md?: number; // 768px+
    lg?: number; // 1024px+
    xl?: number; // 1280px+
  };
  gap?: "sm" | "md" | "lg"; // gap-4, gap-6, gap-8
  className?: string;
}

// Default responsive grid configuration
const defaultGridCols = {
  sm: 1, // 640px+ : 1 column
  md: 2, // 768px+ : 2 columns
  lg: 3, // 1024px+ : 3 columns
  xl: 4, // 1280px+ : 4 columns
};

const defaultGap = "md"; // gap-6 (24px)

export function BaseGrid<T>({
  items,
  renderItem,
  emptyState,
  viewMode = "grid",
  gridCols = defaultGridCols,
  gap = defaultGap,
  className,
}: BaseGridProps<T>) {
  // Handle empty state
  if (items.length === 0) {
    return emptyState || null;
  }

  // Handle list view mode
  if (viewMode === "list") {
    return (
      <div className={cn("space-y-4", className)}>
        {items.map((item, index) => (
          <div key={index}>{renderItem(item, index)}</div>
        ))}
      </div>
    );
  }

  // Build responsive grid classes
  const gapClasses = {
    sm: "gap-4", // 16px
    md: "gap-6", // 24px
    lg: "gap-8", // 32px
  };

  const gridClasses = [
    "grid",
    "grid-cols-1", // Always start with 1 column
    gapClasses[gap],
    // Add responsive breakpoints only if specified
    gridCols.sm && `sm:grid-cols-${gridCols.sm}`,
    gridCols.md && `md:grid-cols-${gridCols.md}`,
    gridCols.lg && `lg:grid-cols-${gridCols.lg}`,
    gridCols.xl && `xl:grid-cols-${gridCols.xl}`,
  ]
    .filter(Boolean) // Remove undefined values
    .join(" ");

  return (
    <div className={cn(gridClasses, className)}>
      {items.map((item, index) => (
        <div key={index}>{renderItem(item, index)}</div>
      ))}
    </div>
  );
}
