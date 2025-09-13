"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Image, Folder, Share2, TrendingUp, Calendar, Trophy, Zap } from "lucide-react";
import { useState, useEffect } from "react";

// This component displays user activity statistics and achievements

export function ProfileStats() {
  const [stats, setStats] = useState({
    totalMemories: 0,
    totalGalleries: 0,
    sharedItems: 0,
    storageUsed: 0,
    storageLimit: 100, // GB
    streakDays: 0,
    achievements: 0,
    lastActive: new Date(),
  });

  // Simulate loading stats (in real app, this would be an API call)
  useEffect(() => {
    const loadStats = async () => {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Mock data - replace with real API calls
      setStats({
        totalMemories: 127,
        totalGalleries: 8,
        sharedItems: 23,
        storageUsed: 45.7,
        storageLimit: 100,
        streakDays: 12,
        achievements: 7,
        lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      });
    };

    loadStats();
  }, []);

  const storagePercentage = (stats.storageUsed / stats.storageLimit) * 100;
  const isStorageWarning = storagePercentage > 80;
  const isStorageCritical = storagePercentage > 95;

  const formatStorage = (gb: number) => {
    if (gb >= 1) return `${gb.toFixed(1)} GB`;
    return `${(gb * 1024).toFixed(0)} MB`;
  };

  const formatLastActive = (date: Date) => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    if (diffInDays < 7) return `${diffInDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className="shadow-lg border-slate-200 dark:border-slate-700">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Activity & Statistics
        </CardTitle>
        <CardDescription>Your memory storage and sharing activity</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-center mb-2">
              <Image className="h-6 w-6 text-blue-600" aria-hidden="true" />
            </div>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {stats.totalMemories.toLocaleString()}
            </div>
            <div className="text-sm text-blue-600 dark:text-blue-400">Memories</div>
          </div>

          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-center mb-2">
              <Folder className="h-6 w-6 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.totalGalleries}</div>
            <div className="text-sm text-purple-600 dark:text-purple-400">Galleries</div>
          </div>

          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-center mb-2">
              <Share2 className="h-6 w-6 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">{stats.sharedItems}</div>
            <div className="text-sm text-green-600 dark:text-green-400">Shared</div>
          </div>

          <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-center mb-2">
              <Trophy className="h-6 w-6 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">{stats.achievements}</div>
            <div className="text-sm text-orange-600 dark:text-orange-400">Achievements</div>
          </div>
        </div>

        {/* Storage Usage */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-slate-700 dark:text-slate-300">Storage Usage</h4>
            <Badge
              variant={isStorageCritical ? "destructive" : isStorageWarning ? "secondary" : "default"}
              className={isStorageCritical ? "bg-red-500" : isStorageWarning ? "bg-yellow-500" : "bg-green-500"}
            >
              {storagePercentage.toFixed(1)}%
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
              <span>Used: {formatStorage(stats.storageUsed)}</span>
              <span>Limit: {formatStorage(stats.storageLimit)}</span>
            </div>
            <Progress value={storagePercentage} className="h-2" />
            <div className="text-xs text-slate-500 dark:text-slate-500">
              {isStorageCritical
                ? "Storage almost full! Consider upgrading your plan."
                : isStorageWarning
                ? "Storage usage is getting high."
                : "Plenty of storage space available."}
            </div>
          </div>
        </div>

        {/* Activity Streak */}
        <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="h-5 w-5 text-yellow-600" />
            <span className="font-semibold text-yellow-800 dark:text-yellow-200">Activity Streak</span>
          </div>
          <div className="text-2xl font-bold text-yellow-800 dark:text-yellow-200 mb-1">{stats.streakDays} days</div>
          <div className="text-sm text-yellow-700 dark:text-yellow-300">
            Keep it up! You&apos;re on a roll with your memories.
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-3">
          <h4 className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Recent Activity
          </h4>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded">
              <span className="text-slate-600 dark:text-slate-400">Last active:</span>
              <span className="font-medium">{formatLastActive(stats.lastActive)}</span>
            </div>

            <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded">
              <span className="text-slate-600 dark:text-slate-400">This week:</span>
              <span className="font-medium">Added 12 new memories</span>
            </div>

            <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded">
              <span className="text-slate-600 dark:text-slate-400">This month:</span>
              <span className="font-medium">Created 3 new galleries</span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
          <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-3">Quick Actions</h4>
          <div className="grid grid-cols-2 gap-3">
            <button className="p-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors text-left">
              <div className="flex items-center gap-2">
                <Image className="h-4 w-4 text-blue-600" aria-hidden="true" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Upload Memories</span>
              </div>
            </button>

            <button className="p-3 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/40 rounded-lg border border-purple-200 dark:border-purple-800 transition-colors text-left">
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-900 dark:text-purple-100">Create Gallery</span>
              </div>
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
