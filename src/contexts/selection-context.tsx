import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

type SelectionContextType = {
  selectedItems: Set<string>;
  isSelectMode: boolean;
  toggleSelection: (id: string) => void;
  toggleSelectMode: () => void;
  clearSelection: () => void;
  selectAll: (ids: string[]) => void;
  isSelected: (id: string) => boolean;
};

const SelectionContext = createContext<SelectionContextType | undefined>(undefined);

export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);

  const toggleSelection = useCallback((id: string) => {
    setSelectedItems(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
      return newSelection;
    });
  }, []);

  const toggleSelectMode = useCallback(() => {
    setIsSelectMode(prev => !prev);
    if (isSelectMode) {
      setSelectedItems(new Set());
    }
  }, [isSelectMode]);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedItems(new Set(ids));
  }, []);

  const isSelected = useCallback((id: string) => {
    return selectedItems.has(id);
  }, [selectedItems]);

  return (
    <SelectionContext.Provider
      value={{
        selectedItems,
        isSelectMode,
        toggleSelection,
        toggleSelectMode,
        clearSelection,
        selectAll,
        isSelected,
      }}
    >
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelection() {
  const context = useContext(SelectionContext);
  if (context === undefined) {
    throw new Error('useSelection must be used within a SelectionProvider');
  }
  return context;
}
