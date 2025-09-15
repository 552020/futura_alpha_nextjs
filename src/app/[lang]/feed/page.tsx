"use client";

/**
 * FEED PAGE - STUB IMPLEMENTATION
 *
 * PURPOSE:
 * This page shows a chronological timeline of memories shared WITH the current user.
 * It's ordered by SHARING DATE (when it was shared) for a social media-like feed experience.
 *
 * STRUCTURE:
 * - Timeline format with sharing events
 * - Most recently shared memories appear first
 * - Shows who shared what and when
 * - Clickable items that navigate to the full memory view
 * - Infinite scroll for loading more items
 *
 * DIFFERENCE FROM /shared:
 * - /shared: Organized by SHARER (grouped by person)
 * - /feed: Organized by SHARING DATE (chronological timeline)
 *
 * NOTE: This is a stub implementation. The actual functionality needs to be
 * properly tested and refined. The API integration is in place but may need
 * adjustments based on real usage patterns.
 */

import { useEffect, useState, useCallback, use } from "react";
import { useInView } from "react-intersection-observer";
import { useAuthGuard } from "@/utils/authentication";
import { Loader2 } from "lucide-react";
import RequireAuth from "@/components/auth/require-auth";
import { Memory } from "@/types/memory";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

interface FeedItem extends Memory {
  status: "shared";
  sharedBy: { id: string; name: string };
  sharedWithCount: number;
  sharedAt: string; // When it was shared with the user
}

export default function FeedPage({ params }: { params: Promise<{ lang: string }> }) {
  // Unwrap params using React.use()
  const { lang } = use(params);

  const { isAuthorized, isTemporaryUser, userId, isLoading } = useAuthGuard();
  const router = useRouter();
  const { toast } = useToast();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const { ref } = useInView();

  // Mock data flag - set to true to use mock data for demo
  const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA_FEED === "true";

  // Sample feed data - Rick Astley video and welcome message
  const sampleFeedItems: FeedItem[] = [
    {
      id: "mock-1",
      type: "video",
      title: "Rick Astley - Never Gonna Give You Up",
      description: "A classic music video that never gets old",
      url: "https://www.youtube.com/embed/dQw4w9WgXcQ?si=rKeJHC7Y8EuIaKLH",
      thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerId: "mock-user-1",
      status: "shared",
      sharedBy: { id: "mock-user-1", name: "Rick Astley" },
      sharedWithCount: 1,
      sharedAt: new Date().toISOString(),
    },
    {
      id: "mock-2",
      type: "note",
      title: "Welcome to the Feed!",
      description:
        "This is where you can see shared content from your family and friends. You can embed YouTube videos, share photos, and post updates.",
      url: "",
      thumbnail: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerId: "mock-user-2",
      status: "shared",
      sharedBy: { id: "mock-user-2", name: "Futura Team" },
      sharedWithCount: 1,
      sharedAt: new Date().toISOString(),
    },
  ];

  const fetchFeedItems = useCallback(async () => {
    if (USE_MOCK_DATA) {
      // Use mock data for demo
      setFeedItems(sampleFeedItems);
      setHasMore(false);
      setIsLoadingFeed(false);
      return;
    }

    try {
      const response = await fetch(`/api/memories/shared?page=${currentPage}&orderBy=sharedAt`);
      if (!response.ok) {
        throw new Error("Failed to fetch feed items");
      }

      const data = await response.json();

      // Transform shared memories into feed items
      const feedItems = data.data.map((memory: any) => ({
        // eslint-disable-line @typescript-eslint/no-explicit-any
        ...memory,
        status: "shared" as const,
        sharedBy: memory.sharedBy || { id: "unknown", name: "Unknown" },
        sharedWithCount: memory.sharedWithCount || 1,
        sharedAt: memory.sharedAt || memory.createdAt, // Use sharing date or fallback to creation date
      }));

      setFeedItems((prev) => {
        if (currentPage === 1) return feedItems;
        return [...prev, ...feedItems];
      });
      setHasMore(data.hasMore);
    } catch (error) {
      console.error("Error fetching feed items:", error);
      toast({
        title: "Error",
        description: "Failed to load feed items. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingFeed(false);
    }
  }, [currentPage, toast, USE_MOCK_DATA, sampleFeedItems]);

  useEffect(() => {
    if (isAuthorized && userId) {
      fetchFeedItems();
    }
  }, [isAuthorized, userId, fetchFeedItems]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 100) {
        if (!isLoadingFeed && hasMore) {
          setCurrentPage((prev) => prev + 1);
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isLoadingFeed, hasMore]);

  const renderMemoryPreview = (item: FeedItem) => {
    switch (item.type) {
      case "image":
        return (
          <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-100">
            {item.thumbnail ? (
              <img src={item.thumbnail} alt={item.title || "Shared image"} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">📷 Image</div>
            )}
          </div>
        );
      case "video":
        return (
          <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-100">
            {item.url && item.url.includes("youtube.com") ? (
              <iframe
                width="100%"
                height="100%"
                src={item.url}
                title={item.title || "Shared video"}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="rounded-lg"
              />
            ) : item.thumbnail ? (
              <img src={item.thumbnail} alt={item.title || "Shared video"} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">🎥 Video</div>
            )}
          </div>
        );
      case "document":
        return (
          <div className="w-full h-24 rounded-lg bg-gray-100 flex items-center justify-center">
            <div className="text-gray-400 text-2xl">📄</div>
          </div>
        );
      case "note":
        return (
          <div className="w-full h-24 rounded-lg bg-gray-100 flex items-center justify-center">
            <div className="text-gray-400 text-2xl">📝</div>
          </div>
        );
      case "audio":
        return (
          <div className="w-full h-24 rounded-lg bg-gray-100 flex items-center justify-center">
            <div className="text-gray-400 text-2xl">🎵</div>
          </div>
        );
      default:
        return (
          <div className="w-full h-24 rounded-lg bg-gray-100 flex items-center justify-center">
            <div className="text-gray-400 text-2xl">📎</div>
          </div>
        );
    }
  };

  if (!isAuthorized || isLoading) {
    // Show loading spinner only while status is loading
    if (isLoading) {
      return (
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }

    // Show access denied for unauthenticated users
    return <RequireAuth />;
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {isTemporaryUser && (
        <div className="mb-4 rounded-lg bg-yellow-50 p-4 text-yellow-800">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium">Temporary Account</h3>
              <div className="mt-2 text-sm">
                <p>
                  You are currently using a temporary account. Your feed will be saved, but you need to complete the
                  signup process within 7 days to keep your account and all your feed items.
                </p>
                <p className="mt-2">After 7 days, your account and all feed items will be automatically deleted.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLoadingFeed ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : feedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <h3 className="text-lg font-medium">No shared memories yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            When someone shares a memory with you, it will appear here in your feed.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {feedItems.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/${lang}/shared/${item.id}`)}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                  {item.sharedBy.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{item.sharedBy.name}</h3>
                    <span className="text-sm text-gray-500">shared a {item.type}</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(item.sharedAt).toLocaleDateString()} at {new Date(item.sharedAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-lg font-medium">{item.title || `Untitled ${item.type}`}</h4>
                {item.description && <p className="text-gray-600 dark:text-gray-300">{item.description}</p>}

                {renderMemoryPreview(item)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Loading indicator */}
      {isLoadingFeed && (
        <div className="mt-8 flex justify-center" ref={ref}>
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}
    </div>
  );
}
