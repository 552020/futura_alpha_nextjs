'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { CapsuleInfo } from '@/types/capsule';

interface CapsuleDisplayProps {
  capsuleInfo: CapsuleInfo | null;
  isLoading: boolean;
  onCreateCapsule: () => void;
}

export default function CapsuleDisplay({ capsuleInfo, isLoading, onCreateCapsule }: CapsuleDisplayProps) {
  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Capsule Details</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {capsuleInfo ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Capsule ID</Label>
                <p className="text-sm text-muted-foreground font-mono">{capsuleInfo.capsule_id}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Subject</Label>
                <p className="text-sm text-muted-foreground">
                  {'Principal' in capsuleInfo.subject
                    ? `Principal: ${capsuleInfo.subject.Principal}`
                    : `Opaque: ${capsuleInfo.subject.Opaque}`}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Is Owner</Label>
                <p className="text-sm text-muted-foreground">{capsuleInfo.is_owner ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Is Controller</Label>
                <p className="text-sm text-muted-foreground">{capsuleInfo.is_controller ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Is Self Capsule</Label>
                <p className="text-sm text-muted-foreground">{capsuleInfo.is_self_capsule ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Bound to Neon</Label>
                <p className="text-sm text-muted-foreground">{capsuleInfo.bound_to_neon ? 'Yes' : 'No'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Created At</Label>
                <p className="text-sm text-muted-foreground">
                  {new Date(Number(capsuleInfo.created_at) / 1000000).toLocaleString('en-US')}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Updated At</Label>
                <p className="text-sm text-muted-foreground">
                  {new Date(Number(capsuleInfo.updated_at) / 1000000).toLocaleString('en-US')}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-4">
              No capsule found. Click &quot;Get Capsule Info&quot; to retrieve your capsule information.
            </p>
            <Button onClick={onCreateCapsule} disabled={isLoading} variant="outline">
              Create Your Self Capsule
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
