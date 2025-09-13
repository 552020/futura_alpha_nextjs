"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Shield, Calendar, Clock, Eye } from "lucide-react";

interface ProfileInfoProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
    plan?: string;
    premiumExpiresAt?: Date | null;
    metadata?: {
      bio?: string;
      location?: string;
      website?: string;
    };
    createdAt?: Date;
    updatedAt?: Date;
  };
}

export function ProfileInfo({ user }: ProfileInfoProps) {
  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRelativeTime = (date: Date | string | null | undefined) => {
    if (!date) return "N/A";
    const now = new Date();
    const targetDate = new Date(date);
    const diffInMs = now.getTime() - targetDate.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
  };

  return (
    <Card className="shadow-lg border-slate-200 dark:border-slate-700">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Details
            </CardTitle>
            {/* <CardDescription>Your account settings and preferences</CardDescription> */}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-3">
          <div className="flex items-center">
            <span className="text-slate-600 dark:text-slate-400 w-24 flex-shrink-0">Email:</span>
            <span className="font-medium">{user.email || "Not set"}</span>
          </div>
          <div className="flex items-center">
            <span className="text-slate-600 dark:text-slate-400 w-24 flex-shrink-0">Joined:</span>
            <span className="font-medium">{formatDate(user.createdAt)}</span>
          </div>
          <div className="flex items-center">
            <span className="text-slate-600 dark:text-slate-400 w-24 flex-shrink-0">Role:</span>
            <Badge variant="secondary" className="capitalize">
              {user.role || "user"}
            </Badge>
          </div>
          <div className="flex items-center">
            <span className="text-slate-600 dark:text-slate-400 w-24 flex-shrink-0">Plan:</span>
            <Badge variant="secondary">{user.plan || "free"}</Badge>
          </div>
          <div className="flex items-center">
            <span className="text-slate-600 dark:text-slate-400 w-24 flex-shrink-0">Status:</span>
            <Badge variant="secondary">Active</Badge>
          </div>
          {user.premiumExpiresAt && (
            <div className="flex items-center">
              <span className="text-slate-600 dark:text-slate-400 w-24 flex-shrink-0">Premium until:</span>
              <span className="font-medium text-sm">{formatDate(user.premiumExpiresAt)}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Extended Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Additional Details
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Bio:</span>
                <span className="font-medium max-w-xs text-right">{user.metadata?.bio || "No bio added"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Location:</span>
                <span className="font-medium">{user.metadata?.location || "Not specified"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Website:</span>
                <span className="font-medium max-w-xs text-right">
                  {user.metadata?.website ? (
                    <a
                      href={
                        user.metadata.website.startsWith("http")
                          ? user.metadata.website
                          : `https://${user.metadata.website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline truncate block"
                    >
                      {user.metadata.website}
                    </a>
                  ) : (
                    "Not specified"
                  )}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Timestamps
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Created:</span>
                <div className="text-right">
                  <div className="font-medium">{formatDate(user.createdAt)}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-500">{formatRelativeTime(user.createdAt)}</div>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Updated:</span>
                <div className="text-right">
                  <div className="font-medium">{formatDate(user.updatedAt)}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-500">{formatRelativeTime(user.updatedAt)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Account Security */}
        <div>
          <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security & Privacy
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="h-4 w-4 text-green-600" />
                <span className="font-medium text-sm">Profile Visibility</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">Your profile is visible to other users</p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-sm">Two-Factor Auth</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {user.plan === "premium" ? "Available" : "Premium feature"}
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-purple-600" />
                <span className="font-medium text-sm">Session Timeout</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {user.plan === "premium" ? "Extended" : "Standard"}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
