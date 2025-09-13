"use client";

import { useEffect, useState, useCallback } from "react";
import { MemoryGrid } from "@/components/memory/memory-grid";
import { Loader2 } from "lucide-react";
import { useAuthGuard } from "@/utils/authentication";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { ItemUploadButton } from "@/components/memory/item-upload-button";
import { Button } from "@/components/ui/button";
import { FolderTopBar } from "@/components/dashboard/folder-top-bar";
import { TawkChat } from "@/components/chat/tawk-chat";
import {
  fetchAndNormalizeMemories,
  deleteMemory,
  type NormalizedMemory,
  type DashboardItem,
} from "@/services/memories";
import { Memory } from "@/types/memory";
import { sampleDashboardMemories } from "../../sample-data";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Demo flag - set to true to use mock data for demo
// const USE_MOCK_DATA = true;
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA_FOLDER === "true";

export default function FolderPage() {
  // console.log("🔍 Folder page component rendered");
  const { isAuthorized, userId, redirectToSignIn, isLoading } = useAuthGuard();
  // console.log("🔍 Folder page auth state:", { isAuthorized, isTemporaryUser, userId, isLoading });

  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [memories, setMemories] = useState<NormalizedMemory[]>([]);
  const [isLoadingMemories, setIsLoadingMemories] = useState(true);
  const [folderName, setFolderName] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const folderId = params.id as string;
  // console.log("🔍 Folder ID:", folderId);

  const fetchFolderMemories = useCallback(async () => {
    // console.log("🚀 ENTERING fetchFolderMemories function");

    if (USE_MOCK_DATA) {
      // console.log("🎭 MOCK DATA - Using sample data for folder");
      // console.log("🔍 Looking for folder:", folderId);
      // console.log("🔍 Available memories:", sampleDashboardMemories.length);
      // console.log(
      //   "🔍 Sample memories with metadata:",
      //   sampleDashboardMemories
      //     .filter((m) => m.metadata?.folderName)
      //     .map((m) => ({ id: m.id, folderName: m.metadata?.folderName }))
      // );

      // Filter mock memories by folder name
      const folderMemories = sampleDashboardMemories.filter((memory) => memory.metadata?.folderName === folderId);

      // console.log("🔍 Mock folder memories found:", folderMemories.length);

      if (folderMemories.length > 0) {
        setFolderName(folderMemories[0].metadata?.folderName || folderId);
        setMemories(folderMemories);
      } else {
        // console.log("❌ No mock memories found for folder:", folderId);
        toast({
          title: "Folder not found",
          description: "This folder doesn't exist or is empty.",
          variant: "destructive",
        });
        router.push(`/${params.lang}/dashboard`);
      }
      setIsLoadingMemories(false);
      return;
    }

    try {
      // Get all memories and filter by folder
      const result = await fetchAndNormalizeMemories(1);
      const folderMemories = result.memories;

      // console.log("🔍 Folder memories found:", folderMemories.length);
      // console.log("🔍 Folder ID:", folderId);
      // console.log("🔍 Cleaned folder ID:", folderId.replace("folder-", ""));
      // console.log("🔍 First memory folder name:", folderMemories[0]?.metadata?.folderName);

      if (folderMemories.length > 0) {
        const actualFolderName = folderMemories[0].metadata?.folderName || folderId;
        // console.log("🔍 Setting folder name to:", actualFolderName);
        setFolderName(actualFolderName);
        setMemories(folderMemories);
      } else {
        // console.log("❌ No memories found for folder:", folderId);
        toast({
          title: "Folder not found",
          description: "This folder doesn't exist or is empty.",
          variant: "destructive",
        });
        router.push(`/${params.lang}/dashboard`);
      }
    } catch (error) {
      console.error("❌ FETCH FOLDER MEMORIES ERROR:", error);
      toast({
        title: "Error",
        description: "Failed to load folder contents. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingMemories(false);
    }
    // console.log("🚀 EXITING fetchFolderMemories function");
  }, [folderId, params.lang, router, toast]);

  useEffect(() => {
    if (!isAuthorized) {
      redirectToSignIn();
    }
  }, [isAuthorized, redirectToSignIn]);

  useEffect(() => {
    // console.log("🔍 Folder useEffect - Auth check:", { isAuthorized, userId, isLoading });
    if (isAuthorized && !isLoading && folderId) {
      // console.log("🚀 CALLING fetchFolderMemories");
      fetchFolderMemories();
      // console.log("✅ EXITED fetchFolderMemories");
    } else {
      // console.log("🔍 Folder useEffect - Not authorized, still loading, or no folderId");
    }
  }, [isAuthorized, isLoading, userId, folderId, fetchFolderMemories]);

  const handleDelete = async (id: string) => {
    try {
      await deleteMemory(id);
      setMemories((prev) => prev.filter((memory) => memory.id !== id));
      toast({
        title: "Success",
        description: "Memory deleted successfully.",
      });
    } catch (error) {
      console.error("Error deleting memory:", error);
      toast({
        title: "Error",
        description: "Failed to delete memory. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleShare = () => {
    // Refresh the memories list to show any new shares
    fetchFolderMemories();
  };

  const handleEdit = (memoryId: string) => {
    // TODO: Implement edit functionality
    console.log("Edit memory:", memoryId);
    toast({
      title: "Edit",
      description: "Edit functionality coming soon!",
    });
  };

  const handleMemoryClick = (memory: Memory | DashboardItem) => {
    // Navigate to the memory detail page
    router.push(`/${params.lang}/dashboard/${memory.id}`);
  };

  const handleUploadSuccess = () => {
    // Refresh the memories list to show the new memory
    fetchFolderMemories();
  };

  const handleUploadError = (error: Error) => {
    toast({
      title: "Error",
      description: error.message || "Failed to upload memory",
      variant: "destructive",
    });
  };

  const handleBackToDashboard = () => {
    router.push(`/${params.lang}/dashboard`);
  };

  const handleGalleryCreated = (galleryId?: string) => {
    toast({
      title: "Success",
      description: "Gallery created successfully!",
    });

    // Navigate to the newly created gallery if we have the ID
    if (galleryId) {
      router.push(`/${params.lang}/gallery/${galleryId}`);
    } else {
      // Fallback: navigate to galleries list
      router.push(`/${params.lang}/gallery`);
    }
  };

  if (!isAuthorized || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Breadcrumb Navigation */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Button variant="ghost" size="sm" onClick={handleBackToDashboard} className="p-0 h-auto text-sm">
                Dashboard
              </Button>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-sm">{folderName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* FolderTopBar Component */}
      <FolderTopBar
        memories={memories}
        onFilteredMemoriesChange={() => {}} // No filtering needed for folder view
        showViewToggle={true}
        onViewModeChange={setViewMode}
        viewMode={viewMode}
        folderName={folderName}
        onCreateGallery={handleGalleryCreated}
      />

      {memories.length === 0 && !isLoadingMemories ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-gray-300 p-16 text-center bg-gray-50 shadow-lg">
          <h3 className="text-4xl font-bold text-gray-800 mb-4">Folder is empty</h3>
          <p className="mt-2 text-base text-gray-600 mb-6 max-w-md">
            This folder doesn&apos;t contain any memories yet. Start by uploading your first memory.
          </p>
          <ItemUploadButton variant="large-icon" onSuccess={handleUploadSuccess} onError={handleUploadError} />
        </div>
      ) : (
        <MemoryGrid
          memories={memories}
          onDelete={handleDelete}
          onShare={handleShare}
          onEdit={handleEdit}
          onClick={handleMemoryClick}
          viewMode={viewMode}
        />
      )}

      {/* Loading indicator */}
      {isLoadingMemories && (
        <div className="mt-8 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {/* Tawk.to Chat */}
      <TawkChat />
    </div>
  );
}
