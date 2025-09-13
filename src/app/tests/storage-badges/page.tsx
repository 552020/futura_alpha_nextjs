"use client";

import { StorageStatusBadge, mockStorageStatuses } from "@/components/common/storage-status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StorageBadgesDemoPage() {
  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Storage Status Badges Demo</h1>
        <p className="text-muted-foreground">Simple text badges showing ICP vs Neon storage status</p>
      </div>

      {/* Gallery Badges Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Gallery Storage Status Badges</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Gallery stored in ICP:</span>
            <StorageStatusBadge status={mockStorageStatuses.gallery.storedInICP.status} />
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Gallery stored in Neon:</span>
            <StorageStatusBadge status={mockStorageStatuses.gallery.storedInNeon.status} />
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Different sizes:</span>
            <StorageStatusBadge status="icp" size="sm" />
            <StorageStatusBadge status="neon" size="md" />
          </div>
        </CardContent>
      </Card>

      {/* Memory Badges Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Memory Storage Status Badges</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Memory stored in ICP:</span>
            <StorageStatusBadge status={mockStorageStatuses.memory.storedInICP.status} />
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Memory stored in Neon:</span>
            <StorageStatusBadge status={mockStorageStatuses.memory.storedInNeon.status} />
          </div>
        </CardContent>
      </Card>

      {/* Gallery Card Example */}
      <Card>
        <CardHeader>
          <CardTitle>Gallery Card Example</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium">My Wedding Photos</h3>
                <p className="text-sm text-muted-foreground">Beautiful memories from our special day</p>
              </div>
              <StorageStatusBadge status="icp" />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>24 images</span>
              <span>•</span>
              <span>Created 2 days ago</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Memory Card Example */}
      <Card>
        <CardHeader>
          <CardTitle>Memory Card Example</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium">Wedding Ceremony</h3>
                <p className="text-sm text-muted-foreground">The moment we said &quot;I do&quot;</p>
              </div>
              <StorageStatusBadge status="neon" />
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Image</span>
              <span>•</span>
              <span>2.4 MB</span>
              <span>•</span>
              <span>Added 2 days ago</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Basic Usage:</h4>
            <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
              {`<StorageStatusBadge status="icp" />
<StorageStatusBadge status="neon" />`}
            </pre>
          </div>

          <div>
            <h4 className="font-medium mb-2">With Size:</h4>
            <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
              {`<StorageStatusBadge status="icp" size="sm" />
<StorageStatusBadge status="neon" size="md" />`}
            </pre>
          </div>

          <div>
            <h4 className="font-medium mb-2">Helper Functions:</h4>
            <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
              {`const status = getGalleryStorageStatus(gallery);
const status = getMemoryStorageStatus(memory);`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
