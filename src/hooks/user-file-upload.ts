import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useOnboarding } from "@/contexts/onboarding-context";
import { useSession } from "next-auth/react";
import { uploadFile } from "@/services/upload";
import { icpUploadService } from "@/services/icp-upload";
// We'll need to create this context for post-onboarding state
// import { useVault } from '@/contexts/vault-context';
import { useUploadStorage, isUploadStorageExpired } from "@/hooks/use-upload-storage";
import { useStoragePreferences } from "@/hooks/use-storage-preferences";

type UploadMode = "folder" | "files";

interface UseFileUploadProps {
  mode?: UploadMode;
  isOnboarding?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useFileUpload({ isOnboarding = false, mode = "folder", onSuccess, onError }: UseFileUploadProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { addFile: addOnboardingFile, updateUserData, setCurrentStep } = useOnboarding();
  const { data: session } = useSession();

  // const { addFile: addVaultFile } = useVault(); // Future implementation

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: preferences } = useStoragePreferences();
  const uploadStorageMutation = useUploadStorage();

  function mapPrefToBackend(pref?: "neon" | "icp" | "dual"): "neon-db" | "icp-canister" {
    if (pref === "icp") return "icp-canister";
    if (pref === "dual") return "neon-db"; // MVP: prefer neon when dual
    return "neon-db";
  }

  async function requestUploadStorage(preferred?: "neon-db" | "icp-canister") {
    const chosenPreferred = preferred ?? mapPrefToBackend(preferences?.preference);
    const resp = await uploadStorageMutation.mutateAsync({ preferred: chosenPreferred });
    const storage = resp.uploadStorage;

    if (isUploadStorageExpired(storage.expires_at)) {
      throw new Error("Upload storage selection expired. Please try again.");
    }
    return storage;
  }

  async function verifyUpload(args: {
    appMemoryId: string;
    backend: "neon-db" | "icp-canister" | "vercel-blob";
    idem: string;
    size?: number | null;
    checksum_sha256?: string | null;
    remote_id?: string | null;
  }) {
    try {
      await fetch("/api/upload/verify", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_memory_id: args.appMemoryId,
          backend: args.backend,
          idem: args.idem,
          checksum_sha256: args.checksum_sha256 ?? null,
          size: args.size ?? null,
          remote_id: args.remote_id ?? null,
        }),
      });
    } catch {
      // best-effort in MVP; do not block UI
    }
  }

  //   const handleUploadClick = () => {
  //     fileInputRef.current?.click();
  //   };

  //   const handleFolderUploadClick = () => {
  //     const el = fileInputRef.current;
  //     if (!el) return;

  //     el.setAttribute("webkitdirectory", "");
  //     el.setAttribute("directory", "");
  //     el.multiple = true;

  //     el.click();
  //   };

  const handleUploadClick = () => {
    const el = fileInputRef.current;
    if (!el) return;

    // reset to file mode first
    el.removeAttribute("webkitdirectory");
    el.removeAttribute("directory");
    el.multiple = false;

    if (mode === "folder") {
      el.setAttribute("webkitdirectory", "");
      el.setAttribute("directory", "");
      el.multiple = true;
    }

    el.click();
  };

  const checkFileSize = (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      console.error("❌ File too large");
      throw new Error("File too large");
    }
  };

  const updateOnboardingContext = (data: { data: { ownerId: string; id: string } }, file: File, url: string) => {
    // console.log("👤 Updating user data with:", {
    //   allUserId: data.data.ownerId,
    //   memoryId: data.data.id,
    // });

    updateUserData({
      allUserId: data.data.ownerId,
      isTemporary: !session,
      memoryId: data.data.id,
    });

    // Add file to context without user data
    const fileToAdd = {
      url,
      file,
      uploadedAt: new Date(),
      memoryId: data.data.id,
      fileType: file.type,
    };
    // console.log("📝 Adding file to onboarding context:", fileToAdd);
    addOnboardingFile(fileToAdd);

    // Set the next step based on authentication status
    if (session) {
      // console.log("🔄 Setting current step to share (authenticated user)");
      setCurrentStep("share");
    } else {
      // console.log("🔄 Setting current step to user-info (unauthenticated user)");
      setCurrentStep("user-info");
    }
  };

  const processSingleFile = async (file: File, skipSuccess = false, existingUserId?: string) => {
    try {
      checkFileSize(file);

      // Create a temporary URL for preview
      const url = URL.createObjectURL(file);

      // 1) Request upload storage (MVP mock)
      const storage = await requestUploadStorage();

      let data:
        | {
            data?: { id: string };
            results?: Array<{ memoryId: string; size?: number; checksum_sha256?: string | null }>;
            userId?: string;
            successfulUploads?: number;
          }
        | undefined;

      // 2) Route to appropriate upload service based on chosen storage
      if (storage.chosen_storage === "icp-canister") {
        // Pre-check Internet Identity authentication before attempting ICP upload
        const isAuthenticated = await icpUploadService.isAuthenticated();
        if (!isAuthenticated) {
          throw new Error("Please connect your Internet Identity to upload to ICP");
        }

        const icpResult = await icpUploadService.uploadFile(file, storage, () => {});

        // Convert ICP result to expected format
        data = {
          data: { id: icpResult.memoryId },
          results: [
            {
              memoryId: icpResult.memoryId,
              size: icpResult.size,
              checksum_sha256: icpResult.checksum_sha256,
            },
          ],
        };
      } else {
        // Upload to Neon/Vercel Blob (existing path)
        data = (await uploadFile(file, isOnboarding, existingUserId, mode)) as unknown as typeof data;
      }

      // 3) Verify after upload (best-effort)
      const appMemoryId = data?.data?.id;
      if (appMemoryId) {
        await verifyUpload({
          appMemoryId,
          backend: storage.chosen_storage,
          idem: storage.idem,
          size: file.size,
          checksum_sha256: data?.results?.[0]?.checksum_sha256 ?? null,
          remote_id: data?.results?.[0]?.memoryId ?? appMemoryId,
        });
      }

      if (isOnboarding && data) {
        updateOnboardingContext(
          { data: { ownerId: data.userId ?? "", id: data.data?.id ?? appMemoryId ?? "" } },
          file,
          url
        );
      }

      if (!skipSuccess) {
        onSuccess?.();
      }
    } catch (error) {
      let title = "Something went wrong";
      let description = "Please try uploading again.";

      if (error instanceof Error && error.message === "File too large") {
        title = "File too large";
        description = "Please upload a file smaller than 50MB.";
      }

      if (error instanceof Error && error.message.includes("intent")) {
        title = "Upload not ready";
        description = error.message;
      }

      console.error("❌ Upload error:", error);

      toast({ variant: "destructive", title, description });

      onError?.(error as Error);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (mode == "folder") {
      const files = event.target.files;
      if (!files) return;

      if (files.length > 25) {
        toast({
          variant: "destructive",
          title: "Too many files",
          description: "Please select a folder with 25 files or fewer.",
        });
        return;
      }

      setIsLoading(true);

      try {
        // 1) Request upload storage (MVP mock)
        const storage = await requestUploadStorage();

        let data:
          | {
              results?: Array<{
                memoryId: string;
                size?: number;
                checksum_sha256?: string | null;
                name?: string;
                type?: string;
              }>;
              userId?: string;
              successfulUploads?: number;
            }
          | undefined;

        // 2) Route to appropriate upload service based on chosen storage
        if (storage.chosen_storage === "icp-canister") {
          // Pre-check Internet Identity authentication before attempting ICP upload
          const isAuthenticated = await icpUploadService.isAuthenticated();
          if (!isAuthenticated) {
            throw new Error("Please connect your Internet Identity to upload to ICP");
          }

          const icpResults = await icpUploadService.uploadFolder(Array.from(files), storage, () => {});

          // Convert ICP results to expected format
          data = {
            results: icpResults.map((result, index) => ({
              memoryId: result.memoryId,
              size: result.size,
              name: files[index].name,
              type: files[index].type,
              checksum_sha256: result.checksum_sha256,
            })),
          };
        } else {
          // Upload folder to Neon/Vercel Blob (existing path)
          const formData = new FormData();
          Array.from(files).forEach((file) => {
            formData.append("file", file);
          });

          const endpoint = isOnboarding ? "/api/memories/upload/onboarding/folder" : "/api/memories/upload/folder";
          const response = await fetch(endpoint, { method: "POST", body: formData });

          type FolderResp = {
            error?: string;
            userId?: string;
            successfulUploads?: number;
            results?: Array<{ memoryId: string; size?: number; checksum_sha256?: string | null }>;
          };
          const json = (await response.json()) as FolderResp;
          data = json;

          if (!response.ok) {
            throw new Error(json?.error || "Folder upload failed");
          }
        }

        // Best-effort verify first reported memory
        const appMemoryId = data?.results?.[0]?.memoryId;
        if (appMemoryId) {
          await verifyUpload({
            appMemoryId,
            backend: storage.chosen_storage,
            idem: storage.idem,
            size: data?.results?.[0]?.size || null,
            checksum_sha256: data?.results?.[0]?.checksum_sha256 || null,
            remote_id: data?.results?.[0]?.memoryId || appMemoryId,
          });
        }

        // Update context with results (onboarding)
        if (isOnboarding && data?.successfulUploads && data.successfulUploads > 0) {
          updateUserData({
            uploadedFileCount: data.successfulUploads,
            allUserId: data.userId ?? "",
            memoryId: data.results?.[0]?.memoryId ?? "",
          });

          if (session) {
            setCurrentStep("share");
          } else {
            setCurrentStep("user-info");
          }
        }

        onSuccess?.();
      } catch (error) {
        console.error("Folder upload error:", error);
        toast({
          variant: "destructive",
          title: "Upload failed",
          description: error instanceof Error ? error.message : "Please try again.",
        });
        onError?.(error as Error);
      } finally {
        setIsLoading(false);
      }
    }

    if (mode == "files") {
      const file = event.target.files?.[0];
      if (!file) return;
      setIsLoading(true);
      await processSingleFile(file, false, undefined);
      setIsLoading(false);
    }
  };

  return { isLoading, fileInputRef, handleUploadClick, handleFileChange };
}
