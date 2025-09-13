"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Globe, Crown, User } from "lucide-react";

import { useState } from "react";

interface ProfileHeaderProps {
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

export function ProfileHeader({ user }: ProfileHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const isPremium = user.plan === "premium" && user.premiumExpiresAt && new Date(user.premiumExpiresAt) > new Date();

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 border border-slate-200 dark:border-slate-700">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
        {/* Avatar Section */}
        <div className="flex-shrink-0">
          <Avatar className="h-24 w-24 border-4 border-white dark:border-slate-700 shadow-lg">
            <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
            <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
              {user.name ? getInitials(user.name) : "U"}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* User Info Section */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{user.name || "Anonymous User"}</h1>
                {isPremium && (
                  <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0">
                    <Crown className="h-3 w-3 mr-1" />
                    Premium
                  </Badge>
                )}
                {user.role && user.role !== "user" && (
                  <Badge variant="secondary" className="capitalize">
                    {user.role}
                  </Badge>
                )}
              </div>

              {user.metadata?.bio && (
                <p className="text-slate-600 dark:text-slate-300 text-lg mb-4 max-w-2xl">{user.metadata.bio}</p>
              )}
            </div>

            <div className="flex-shrink-0">
              <Button variant="outline" onClick={() => setIsEditing(!isEditing)} className="hidden sm:flex">
                <User className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          </div>

          {/* User Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
            {user.metadata?.location && (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <MapPin className="h-4 w-4" />
                <span className="truncate">{user.metadata.location}</span>
              </div>
            )}

            {user.metadata?.website && (
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <Globe className="h-4 w-4" />
                <a
                  href={
                    user.metadata.website.startsWith("http")
                      ? user.metadata.website
                      : `https://${user.metadata.website}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {user.metadata.website}
                </a>
              </div>
            )}
          </div>

          {/* Premium Status */}
          {user.plan === "premium" && user.premiumExpiresAt && (
            <div className="mt-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                <Crown className="h-4 w-4" />
                <span className="font-medium">Premium Plan</span>
                <span className="text-sm">• Expires {formatDate(user.premiumExpiresAt)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
