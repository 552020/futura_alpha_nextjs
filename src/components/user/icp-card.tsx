'use client';

/**
 * ICP Card Component
 *
 * Unified card that combines:
 * - Internet Identity linking status
 * - Co-authentication controls
 * - Principal management
 * - Session management
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield } from 'lucide-react';

interface ICPCardProps {
  className?: string;
}

export function ICPCard({ className = '' }: ICPCardProps) {
  // TODO: Update this component to use new hooks
  return (
    <Card className={`border-2 border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/20 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-6 w-6 text-slate-600" />
          ICP Card (Under Construction)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          This component is being updated to use the new Internet Identity management system.
        </p>
      </CardContent>
    </Card>
  );
}
