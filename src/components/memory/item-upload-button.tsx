import { useState } from "react";
import { Plus, Loader2, Upload } from "lucide-react";
import { useFileUpload } from "@/hooks/user-file-upload";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Button variant interfaces
interface BaseButtonProps {
  onClick: () => void;
  isLoading: boolean;
  buttonText?: string;
}

interface FileInputProps {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

// Individual button components

/**
 * LargeIconButton - Big circular button for prominent upload areas
 * Used in:
 * - Dashboard empty state: /app/[lang]/dashboard/page.tsx
 * - Folder empty state: /app/[lang]/dashboard/folder/[id]/page.tsx
 * - Onboarding flow: /app/[lang]/onboarding/items-upload/items-upload-client.tsx
 * - Onboarding experiment: /app/[lang]/onboarding/items-upload/items-upload-client-experiment.tsx
 */
const LargeIconButton = ({ onClick, isLoading }: BaseButtonProps) => (
  <div
    role="button"
    tabIndex={0}
    onClick={onClick}
    onKeyDown={(e) => e.key === "Enter" && onClick()}
    className="w-20 h-20 rounded-full bg-black hover:bg-white dark:bg-white dark:hover:bg-black flex items-center justify-center cursor-pointer text-white hover:text-black dark:text-black dark:hover:text-white border-2 border-transparent hover:border-black dark:hover:border-white transition-all"
  >
    {isLoading ? <Loader2 size={72} className="animate-spin" /> : <Plus size={72} />}
  </div>
);

/**
 * IconButton - Small icon button for inline uploads
 * Used in: Currently unused in codebase
 */
const IconButton = ({ onClick, isLoading }: BaseButtonProps) => (
  <Button variant="ghost" size="icon" onClick={onClick} disabled={isLoading}>
    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
  </Button>
);

/**
 * DefaultButton - Standard button with text (default variant)
 * Used in: Currently unused in codebase (fallback for unknown variants)
 */
const DefaultButton = ({ onClick, isLoading }: BaseButtonProps) => (
  <Button onClick={onClick} disabled={isLoading} className="gap-2">
    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
    Upload Memory
  </Button>
);

/**
 * AlbumButton - Custom styled button for albums
 * Used in:
 * - Onboarding flow: /app/[lang]/onboarding/items-upload/items-upload-client.tsx
 */
const AlbumButton = ({ onClick, isLoading }: BaseButtonProps) => (
  <button
    onClick={onClick}
    disabled={isLoading}
    className="px-6 py-3 rounded-lg font-medium transition-all duration-200 ease-in-out bg-black text-white hover:bg-gray-800 hover:shadow-md hover:scale-105 dark:bg-white dark:text-black dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {isLoading ? (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Uploading...
      </div>
    ) : (
      "Album"
    )}
  </button>
);

/**
 * OneShotButton - Custom styled button for one-shot uploads
 * Used in:
 * - Onboarding flow: /app/[lang]/onboarding/items-upload/items-upload-client.tsx
 */
const OneShotButton = ({ onClick, isLoading, buttonText }: BaseButtonProps) => (
  <button
    onClick={onClick}
    disabled={isLoading}
    className="px-6 py-3 rounded-lg font-medium transition-all duration-200 ease-in-out bg-white text-black border border-gray-300 hover:bg-gray-50 hover:shadow-md hover:scale-105 dark:bg-gray-900 dark:text-white dark:border-gray-600 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {isLoading ? (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Uploading...
      </div>
    ) : (
      buttonText || "One Shot"
    )}
  </button>
);

/**
 * DashboardAddFolderButton - Dashboard-specific folder upload button
 * Used in:
 * - Dashboard top bar: /components/dashboard/dashboard-top-bar.tsx
 */
const DashboardAddFolderButton = ({ onClick, isLoading, buttonText }: BaseButtonProps) => (
  <button
    onClick={onClick}
    disabled={isLoading}
    className="h-9 px-4 py-1 text-sm font-medium transition-all duration-200 ease-in-out bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-md flex items-center justify-center whitespace-nowrap"
  >
    {isLoading ? (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Uploading...
      </div>
    ) : (
      buttonText || "Add Folder"
    )}
  </button>
);

/**
 * DashboardAddFileButton - Dashboard-specific file upload button
 * Used in:
 * - Dashboard top bar: /components/dashboard/dashboard-top-bar.tsx
 */
const DashboardAddFileButton = ({ onClick, isLoading, buttonText }: BaseButtonProps) => (
  <button
    onClick={onClick}
    disabled={isLoading}
    className="h-9 px-4 py-1 text-sm font-medium transition-all duration-200 ease-in-out bg-white text-black border border-gray-300 hover:bg-gray-50 dark:bg-gray-900 dark:text-white dark:border-gray-600 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-md flex items-center justify-center whitespace-nowrap"
  >
    {isLoading ? (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Uploading...
      </div>
    ) : (
      buttonText || "Add File"
    )}
  </button>
);

/**
 * NativeFileInput - Browser's default file input
 * Used in: Currently unused in codebase
 */
const NativeFileInput = ({ onChange }: FileInputProps) => (
  <input
    type="file"
    onChange={onChange}
    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
    multiple={false}
    accept="image/*,video/*,audio/*"
  />
);

// interface ItemUploadButtonProps {
//   isOnboarding?: boolean;
//   variant?: "button" | "icon" | "large-icon" | "native";
//   onSuccess?: () => void;
//   onError?: (error: Error) => void;
// }

type UploadMode = "folder" | "files";

interface ItemUploadButtonProps {
  mode?: UploadMode; // NEW
  isOnboarding?: boolean;
  variant?:
    | "button"
    | "icon"
    | "large-icon"
    | "native"
    | "album-button"
    | "one-shot-button"
    | "dashboard-add-folder"
    | "dashboard-add-file";
  buttonText?: string; // Custom button text
  onSuccess?: () => void;
  onError?: (e: Error) => void;
}

/**
 * ItemUploadButton - A flexible upload button component with multiple variants
 *
 * Variants:
 * - "large-icon": Big circular button for prominent upload areas (onboarding, vault)
 * - "icon": Small icon for inline uploads
 * - "button": Standard button with text (default)
 * - "native": Browser's default file input
 * - "album-button": Custom styled button for albums
 * - "one-shot-button": Custom styled button for one-shot uploads
 * - "dashboard-add-folder": Dashboard-specific folder button
 * - "dashboard-add-file": Dashboard-specific file button
 *
 * TODO: Fix TypeScript overcomplication for webkitdirectory/directory attributes
 * - Current workaround: {...({} as any)} bypasses type checking
 * - Better approach: Extend HTML input interface or use proper type definitions
 * - This is just TypeScript being overly strict about experimental attributes
 */
export function ItemUploadButton({
  mode = "folder",
  isOnboarding = false,
  variant = "button",
  buttonText,
  onSuccess,
  onError,
}: ItemUploadButtonProps) {
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  const { isLoading, fileInputRef, handleUploadClick, handleFileChange } = useFileUpload({
    isOnboarding,
    mode,
    onSuccess: () => {
      setShowUploadDialog(false);
      onSuccess?.();
    },
    onError: (error) => {
      onError?.(error);
    },
  });

  const renderUploadButton = () => {
    if (variant === "native") {
      return <NativeFileInput onChange={handleFileChange} />;
    }

    const commonProps = { onClick: handleUploadClick, isLoading, buttonText };

    switch (variant) {
      case "large-icon":
        return <LargeIconButton {...commonProps} />;
      case "icon":
        return <IconButton {...commonProps} />;
      case "album-button":
        return <AlbumButton {...commonProps} />;
      case "one-shot-button":
        return <OneShotButton {...commonProps} />;
      case "dashboard-add-folder":
        return <DashboardAddFolderButton {...commonProps} />;
      case "dashboard-add-file":
        return <DashboardAddFileButton {...commonProps} />;
      default:
        return <DefaultButton {...commonProps} />;
    }
  };

  return (
    <>
      {/* Hidden file input - only needed for non-native variants */}
      {variant !== "native" && (
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          multiple={false}
          accept="image/*,video/*,audio/*"
        />
      )}

      {/* Upload button */}
      {renderUploadButton()}

      {/* Upload Dialog - shown while uploading */}
      {variant !== "native" && (
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Uploading Memory</DialogTitle>
              <DialogDescription>Please wait while we upload your memory...</DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
