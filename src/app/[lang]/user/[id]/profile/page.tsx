import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { LiveChatWrapper } from "@/components/chat/livechat-wrapper";
import { ICPCard } from "@/components/user/icp-card";
import { ProfileHeader } from "@/components/user/profile-header";
import { ProfileInfo } from "@/components/user/profile-info";
// import { ProfileStats } from "@/components/user/profile-stats";

interface Props {
  params: Promise<{ id: string }>;
}

const ProfilePage = async (props: Props) => {
  const resolvedParams = await props.params;
  const session = await auth();

  if (!session) {
    redirect("/en/signin");
  }

  if (session.user.id !== resolvedParams.id) {
    redirect("/unauthorized");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto p-6 max-w-4xl">
        {/* Profile Header with Avatar */}
        <ProfileHeader user={session.user} />

        <div className="space-y-6 mt-8">
          {/* Profile Information */}
          <ProfileInfo user={session.user} />

          {/* Profile Statistics */}
          {/* <ProfileStats /> */}

          {/* ICP Card - Unified Internet Identity Management */}
          <ICPCard />
        </div>

        {/* LiveChat */}
        <div className="mt-8">
          <LiveChatWrapper />
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
