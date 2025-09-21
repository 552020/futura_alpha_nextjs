'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Filter, Calendar, Grid3X3, List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface BaseTopBarProps<T> {
  items: T[];
  onFilteredItemsChange: (filteredItems: T[]) => void;
  showViewToggle?: boolean;
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  viewMode?: 'grid' | 'list';
  className?: string;

  // Search configuration
  searchPlaceholder?: string;
  searchFields?: (item: T) => string[];

  // Filter configuration
  filterOptions?: Array<{ value: string; label: string }>;
  filterLogic?: (item: T, filterType: string) => boolean;

  // Sort configuration
  sortOptions?: Array<{ value: string; label: string }>;
  sortLogic?: (a: T, b: T, sortBy: string) => number;

  // Action buttons
  leftActions?: React.ReactNode;
  rightActions?: React.ReactNode;
}

export function BaseTopBar<T>({
  items,
  onFilteredItemsChange,
  showViewToggle = true,
  onViewModeChange,
  viewMode = 'grid',
  className = '',

  // Search
  searchPlaceholder = 'Search...',
  searchFields = () => [],

  // Filters
  filterOptions = [{ value: 'all', label: 'All Items' }],
  filterLogic = () => true,

  // Sort
  sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
  ],
  sortLogic = (a: T, b: T, sortBy: string) => {
    switch (sortBy) {
      case 'newest':
        return (
          new Date((b as { createdAt?: string | Date }).createdAt || 0).getTime() -
          new Date((a as { createdAt?: string | Date }).createdAt || 0).getTime()
        );
      case 'oldest':
        return (
          new Date((a as { createdAt?: string | Date }).createdAt || 0).getTime() -
          new Date((b as { createdAt?: string | Date }).createdAt || 0).getTime()
        );
      default:
        return 0;
    }
  },

  // Actions
  leftActions,
  rightActions,
}: BaseTopBarProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const isInitialRender = useRef(true);

  // Filtering and sorting logic
  const filteredItems = useMemo(() => {
    let filtered = [...items];

    // Filter by search query
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        const searchableText = searchFields(item).join(' ').toLowerCase();
        return searchableText.includes(searchLower);
      });
    }

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(item => filterLogic(item, filterType));
    }

    // Sort results
    filtered.sort((a, b) => sortLogic(a, b, sortBy));

    return filtered;
  }, [items, searchQuery, filterType, sortBy, searchFields, filterLogic, sortLogic]);

  // Notify parent component of filtered results
  useEffect(() => {
    // Skip the initial render to prevent infinite loops
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    // Only call when user actually changes search/filter/sort inputs
    if (searchQuery || filterType !== 'all' || sortBy !== 'newest') {
      onFilteredItemsChange(filteredItems);
    }
  }, [searchQuery, filterType, sortBy, onFilteredItemsChange, filteredItems]);

  return (
    <div className={`mb-6 space-y-4 ${className}`}>
      {/* Top row: Action buttons and View toggle */}
      <div className="flex justify-between items-center gap-4">
        {/* Left side: Action buttons */}
        <div className="flex gap-2">{leftActions}</div>

        {/* Right side: View Mode Toggle or custom actions */}
        <div className="flex gap-2">
          {showViewToggle && onViewModeChange && (
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('grid')}
                className="rounded-r-none"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewModeChange('list')}
                className="rounded-l-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          )}
          {rightActions}
        </div>
      </div>

      {/* Bottom row: Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Type Filter */}
        {filterOptions.length > 1 && (
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              {filterOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Sort */}
        {sortOptions.length > 1 && (
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-48">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}
