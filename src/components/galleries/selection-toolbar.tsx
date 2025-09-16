import { Button } from "@/components/ui/button";
import { X, Mail, Check } from "lucide-react";
import { useSelection } from "@/contexts/selection-context";

type SelectionToolbarProps = {
  onSendToPhotographer: (selectedIds: string[]) => void;
  className?: string;
};

export function SelectionToolbar({
  onSendToPhotographer,
  className = "",
}: SelectionToolbarProps) {
  const { selectedItems, clearSelection, toggleSelectMode } = useSelection();
  const selectedCount = selectedItems.size;

  if (selectedCount === 0) return null;

  const handleSendToPhotographer = () => {
    onSendToPhotographer(Array.from(selectedItems));
    clearSelection();
  };

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 shadow-lg rounded-full px-6 py-3 flex items-center gap-4 z-50 border border-gray-200 dark:border-gray-700 ${className}`}
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
          <Check className="h-4 w-4 text-blue-600 dark:text-blue-300" />
        </div>
        <span className="font-medium">
          {selectedCount} {selectedCount === 1 ? "item" : "items"} selected
        </span>
      </div>

      <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

      <Button
        variant="ghost"
        size="sm"
        className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        onClick={handleSendToPhotographer}
      >
        <Mail className="h-4 w-4 mr-2" />
        Send to Photographer
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        onClick={clearSelection}
      >
        <X className="h-4 w-4 mr-1" />
        Clear
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        onClick={toggleSelectMode}
      >
        Done
      </Button>
    </div>
  );
}
