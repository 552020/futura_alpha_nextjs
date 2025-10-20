'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { RefreshCw, Users, Database, Upload } from 'lucide-react';
import Link from 'next/link';

interface AdminStats {
  totalUsers: number;
  temporaryUsers: number;
  permanentUsers: number;
  totalMemories: number;
  totalAssets: number;
  recentUploads: Array<{
    id: string;
    title: string;
    type: string;
    createdAt: string;
    ownerId: string;
  }>;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const lang = params?.lang as string;
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Check authentication and authorization
  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (!session) {
      router.push(`/api/auth/signin?callbackUrl=/${lang}/admin`);
      return;
    }

    // Check if user is admin (server-side check will be done in API calls)
    console.log('🔍 [DEBUG] Admin check:', {
      email: session.user?.email,
      role: session.user?.role,
      user: session.user,
    });

    const isAdmin = session.user?.role === 'admin' || session.user?.email?.includes('@futura.now');

    console.log('🔍 [DEBUG] Is admin:', isAdmin);

    if (!isAdmin) {
      router.push(`/${lang}`);
      return;
    }
  }, [session, status, router, lang]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Show loading while checking auth
  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">{status === 'loading' ? 'Checking authentication...' : 'Loading admin data...'}</span>
        </div>
      </div>
    );
  }

  // Show unauthorized if not admin
  if (!session || !session.user) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
            <p className="text-muted-foreground">You need to be logged in to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex flex-wrap min-w-0 items-center justify-between">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href={`/${lang}`}>Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Admin</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex gap-2">
            <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {stats && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-full overflow-x-hidden">
              <Link href={`/${lang}/admin/users`}>
                <Card className="w-full max-w-full overflow-x-hidden cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 min-w-0">
                    <CardTitle className="text-sm font-medium truncate">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalUsers}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.temporaryUsers} temporary, {stats.permanentUsers} permanent
                    </p>
                  </CardContent>
                </Card>
              </Link>

              <Card className="w-full max-w-full overflow-x-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 min-w-0">
                  <CardTitle className="text-sm font-medium truncate">Memories</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalMemories}</div>
                  <p className="text-xs text-muted-foreground">Total memories in database</p>
                </CardContent>
              </Card>

              <Card className="w-full max-w-full overflow-x-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 min-w-0">
                  <CardTitle className="text-sm font-medium truncate">Assets</CardTitle>
                  <Upload className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalAssets}</div>
                  <p className="text-xs text-muted-foreground">Total assets stored</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Recent Uploads</CardTitle>
                  <Upload className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.recentUploads.length}</div>
                  <p className="text-xs text-muted-foreground">Last 10 uploads</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Uploads */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Uploads</CardTitle>
                <CardDescription>Latest memory uploads in the system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.recentUploads.length === 0 ? (
                    <p className="text-muted-foreground">No recent uploads</p>
                  ) : (
                    stats.recentUploads.map(upload => (
                      <div
                        key={upload.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-2 sm:p-3 border rounded-lg w-full max-w-full overflow-x-hidden"
                      >
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {upload.type}
                          </Badge>
                          <span className="font-medium text-sm truncate">{upload.title}</span>
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-0 flex-shrink-0">
                          {new Date(upload.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
