'use client';

import {
  useHostingPreferences,
  useUpdateHostingPreferences,
  getDefaultHostingPreferences,
} from '@/hooks/use-storage-preferences';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function StorageSettings() {
  const { data: preferences, isLoading, error } = useHostingPreferences();
  const updatePreferences = useUpdateHostingPreferences();

  const handleFrontendHostingChange = (hosting: 'vercel' | 'icp') => {
    updatePreferences.mutate({
      frontendHosting: hosting,
    });
  };

  const handleBackendHostingChange = (hosting: 'vercel' | 'icp') => {
    updatePreferences.mutate({
      backendHosting: hosting,
    });
  };

  const handleDatabaseHostingChange = (hosting: 'neon' | 'icp') => {
    updatePreferences.mutate({
      databaseHosting: [hosting],
    });
  };

  const handleBlobHostingChange = (hosting: 's3' | 'vercel_blob' | 'icp' | 'arweave' | 'ipfs' | 'neon') => {
    updatePreferences.mutate({
      blobHosting: [hosting],
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Hosting Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Use default preferences if there's an error or no data
  const currentPreferences = preferences || getDefaultHostingPreferences();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hosting Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Frontend Hosting */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="frontend-hosting">Frontend Hosting</Label>
            <p className="text-sm text-muted-foreground">Where your frontend is hosted</p>
          </div>
          <Select value={currentPreferences.frontendHosting} onValueChange={handleFrontendHostingChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vercel">Vercel</SelectItem>
              <SelectItem value="icp">ICP</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Backend Hosting */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="backend-hosting">Backend Hosting</Label>
            <p className="text-sm text-muted-foreground">Where your backend API is hosted</p>
          </div>
          <Select value={currentPreferences.backendHosting} onValueChange={handleBackendHostingChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vercel">Vercel</SelectItem>
              <SelectItem value="icp">ICP</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Database Hosting */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="database-hosting">Database Hosting</Label>
            <p className="text-sm text-muted-foreground">Where your database is hosted</p>
          </div>
          <Select value={currentPreferences.databaseHosting[0]} onValueChange={handleDatabaseHostingChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="neon">Neon</SelectItem>
              <SelectItem value="icp">ICP</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Blob Storage Hosting */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="blob-hosting">Blob Storage</Label>
            <p className="text-sm text-muted-foreground">Where your files are stored</p>
          </div>
          <Select value={currentPreferences.blobHosting[0]} onValueChange={handleBlobHostingChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="s3">S3</SelectItem>
              <SelectItem value="vercel_blob">Vercel Blob</SelectItem>
              <SelectItem value="icp">ICP</SelectItem>
              <SelectItem value="arweave">Arweave</SelectItem>
              <SelectItem value="ipfs">IPFS</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && <div className="text-sm text-red-600">Error loading preferences: {error.message}</div>}
      </CardContent>
    </Card>
  );
}
