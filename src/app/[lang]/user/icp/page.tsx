'use client';

import { useAuthGuard } from '@/utils/authentication';
import { useSession } from 'next-auth/react';

// Prevent static generation of this page
export const dynamic = 'force-dynamic';
import RequireAuth from '@/components/auth/require-auth';
import { InternetIdentityManagement } from '@/components/user/internet-identity-management';
import { Whoami } from '@/components/icp/whoami';
import { Greeting } from '@/components/icp/greeting';
import { CapsuleInfo } from '@/components/icp/capsule-info';

export default function ICPPage() {
  const { isAuthorized, isLoading } = useAuthGuard();
  const { data: _session } = useSession();

  if (!isAuthorized || isLoading) {
    // Show loading spinner only while status is loading
    if (isLoading) {
      return (
        <div className="flex h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-800 dark:border-gray-700 dark:border-t-gray-200" />
        </div>
      );
    }

    // Show access denied for unauthenticated users
    return <RequireAuth />;
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold mb-6">Hello ICP</h1>

      {/* Internet Identity Management - Unified Component */}
      <div className="mb-6">
        <InternetIdentityManagement />
      </div>

      <Whoami />

      <div className="my-6">
        <Greeting />
      </div>

      <div className="my-6">
        <CapsuleInfo />
      </div>
    </div>
  );
}
