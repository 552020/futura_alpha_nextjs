'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { RefreshCw, Users, User, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface User {
  id: string;
  allUserId: string;
  name: string;
  email: string;
  role: string;
  emailVerified: string | null;
  createdAt: string;
  type: 'user' | 'temporary';
}

interface UsersStats {
  totalUsers: number;
  permanentUsers: number;
  temporaryUsers: number;
  users: User[];
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const lang = params?.lang as string;
  const [stats, setStats] = useState<UsersStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Check authentication and authorization
  useEffect(() => {
    if (status === 'loading') return; // Still loading

    if (!session) {
      router.push(`/api/auth/signin?callbackUrl=/${lang}/admin/users`);
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

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  const handleCleanupTempUsers = async () => {
    console.log('Cleanup temp users clicked');
    if (!confirm('Are you sure you want to clean up all temporary users? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/cleanup', { method: 'POST' });
      const result = await response.json();

      if (result.success) {
        alert(
          `Cleanup completed! Deleted ${result.deleted.allUsers} allUsers, ${result.deleted.memories} memories, ${result.deleted.assets} assets`
        );
        await fetchUsers();
      } else {
        alert('Cleanup failed: ' + result.error);
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
      alert('Cleanup failed: ' + error);
    }
  };

  const handleCleanupTestUsers = async () => {
    console.log('Cleanup test users clicked');
    if (!confirm('Are you sure you want to clean up all test users? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch('/api/admin/cleanup-test', { method: 'POST' });
      const result = await response.json();

      if (result.success) {
        alert(`Test users cleanup completed! Deleted ${result.deleted} test users`);
        await fetchUsers();
      } else {
        alert('Test users cleanup failed: ' + result.error);
      }
    } catch (error) {
      console.error('Test users cleanup failed:', error);
      alert('Test users cleanup failed: ' + error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Show loading while checking auth
  if (status === 'loading' || loading) {
    return (
      <div className="w-full max-w-full overflow-x-hidden">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin" />
            <span className="ml-2">{status === 'loading' ? 'Checking authentication...' : 'Loading users...'}</span>
          </div>
        </div>
      </div>
    );
  }

  // Show unauthorized if not admin
  if (!session || !session.user) {
    return (
      <div className="w-full max-w-full overflow-x-hidden">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-red-600">Access Denied</h1>
              <p className="text-muted-foreground">You need to be logged in to access this page.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="container mx-auto p-6 space-y-6">
        {/* Breadcrumb */}
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
                <BreadcrumbLink asChild>
                  <Link href={`/${lang}/admin`}>Admin</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Users</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="flex gap-2">
            <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={handleCleanupTempUsers} variant="outline" size="sm" className="cursor-pointer">
              <Trash2 className="h-4 w-4 mr-1" />
              Clean Temp
            </Button>
            <Button onClick={handleCleanupTestUsers} variant="outline" size="sm" className="cursor-pointer">
              <Trash2 className="h-4 w-4 mr-1" />
              Clean Test
            </Button>
          </div>
        </div>

        {stats && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-full overflow-x-hidden">
              <Card className="w-full max-w-full overflow-x-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 min-w-0">
                  <CardTitle className="text-sm font-medium truncate">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">All users in system</p>
                </CardContent>
              </Card>

              <Card className="w-full max-w-full overflow-x-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 min-w-0">
                  <CardTitle className="text-sm font-medium truncate">Permanent Users</CardTitle>
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.permanentUsers}</div>
                  <p className="text-xs text-muted-foreground">Registered users</p>
                </CardContent>
              </Card>

              <Card className="w-full max-w-full overflow-x-hidden">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 min-w-0">
                  <CardTitle className="text-sm font-medium truncate">Temporary Users</CardTitle>
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.temporaryUsers}</div>
                  <p className="text-xs text-muted-foreground">Onboarding users</p>
                </CardContent>
              </Card>
            </div>

            {/* Users List */}
            <Card className="w-full max-w-full overflow-x-hidden">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  All Users
                </CardTitle>
                <CardDescription>Click on a user to view details</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.users.length === 0 ? (
                  <p className="text-muted-foreground">No users found</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>User ID</TableHead>
                        <TableHead>AllUser ID</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.users.map(user => (
                        <TableRow
                          key={user.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => (window.location.href = `/${lang}/admin/users/${user.id}`)}
                        >
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell className="font-mono text-xs">{user.id}</TableCell>
                          <TableCell className="font-mono text-xs">{user.allUserId}</TableCell>
                          <TableCell>
                            <Badge variant={user.type === 'temporary' ? 'secondary' : 'default'} className="text-xs">
                              {user.type}
                            </Badge>
                          </TableCell>
                          <TableCell>{user.role}</TableCell>
                          <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
