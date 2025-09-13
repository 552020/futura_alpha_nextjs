"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { useAuthGuard } from "@/utils/authentication";
import { Loader2 } from "lucide-react";
import RequireAuth from "@/components/auth/require-auth";

interface FeedItem {
  id: string;
  type: "youtube" | "text" | "image";
  title: string;
  content: string;
  createdAt: string;
  author: string;
}

export default function FeedPage() {
  const { isAuthorized, isTemporaryUser, userId, isLoading } = useAuthGuard();
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(true);

  // Sample feed data - in a real app, this would come from an API
  const sampleFeedItems = useMemo<FeedItem[]>(
    () => [
      {
        id: "1",
        type: "youtube",
        title: "Rick Astley - Never Gonna Give You Up",
        content: "https://www.youtube.com/embed/dQw4w9WgXcQ?si=rKeJHC7Y8EuIaKLH",
        createdAt: new Date().toISOString(),
        author: "Rick Astley",
      },
      {
        id: "2",
        type: "text",
        title: "Welcome to the Feed!",
        content:
          "This is where you can see shared content from your family and friends. You can embed YouTube videos, share photos, and post updates.",
        createdAt: new Date().toISOString(),
        author: "Futura Team",
      },
    ],
    []
  );

  // Removed automatic redirect - now handled by RequireAuth component in render

  useEffect(() => {
    if (isAuthorized && userId) {
      // Simulate loading feed data
      setTimeout(() => {
        setFeedItems(sampleFeedItems);
        setIsLoadingFeed(false);
      }, 1000);
    }
  }, [isAuthorized, userId, sampleFeedItems]);

  const renderFeedItem = (item: FeedItem) => {
    switch (item.type) {
      case "youtube":
        return (
          <div className="aspect-video w-full">
            <iframe
              width="100%"
              height="100%"
              src={item.content}
              title={item.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              className="rounded-lg"
            />
          </div>
        );
      case "text":
        return (
          <div className="prose max-w-none">
            <p className="text-gray-700 dark:text-gray-300">{item.content}</p>
          </div>
        );
      case "image":
        return (
          <div className="relative w-full h-64">
            <Image
              src={item.content}
              alt={item.title}
              fill
              className="rounded-lg object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        );
      default:
        return null;
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
          <h3 className="text-lg font-medium">No feed items yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            When your family shares content, it will appear here in the feed.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {feedItems.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {item.author.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold">{item.author}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <h4 className="text-lg font-medium mb-3">{item.title}</h4>

              {renderFeedItem(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
