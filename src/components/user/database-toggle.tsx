'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Info, Database, Zap } from 'lucide-react';
import { 
  useHostingPreferences, 
  useUpdateHostingPreferences,
  type DatabaseHosting,
  isAdvancedDatabaseSwitchingEnabled,
  getAvailableDatabases,
  getCurrentDatabaseView,
  canSwitchDatabase
} from '@/hooks/use-hosting-preferences';

interface DatabaseToggleProps {
  className?: string;
}

export function DatabaseToggle({ className }: DatabaseToggleProps) {
  const { data: preferences, isLoading } = useHostingPreferences();
  const updatePreferences = useUpdateHostingPreferences();
  
  const [isAdvancedEnabled, setIsAdvancedEnabled] = useState(
    isAdvancedDatabaseSwitchingEnabled(preferences)
  );

  const availableDatabases = getAvailableDatabases(preferences);
  const currentDatabaseView = getCurrentDatabaseView(preferences);
  const canSwitch = canSwitchDatabase(preferences);

  const handleAdvancedToggle = (enabled: boolean) => {
    setIsAdvancedEnabled(enabled);
    
    // Update preferences
    updatePreferences.mutate({
      advancedDatabaseSwitching: enabled,
      // Set current view to primary database if enabling
      currentDatabaseView: enabled ? preferences?.databaseHosting?.[0] : undefined,
    });
  };

  const handleDatabaseViewChange = (database: DatabaseHosting) => {
    updatePreferences.mutate({
      currentDatabaseView: database,
    });
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Advanced Database Switching
          </CardTitle>
          <CardDescription>
            Loading database preferences...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Advanced Database Switching
        </CardTitle>
        <CardDescription>
          Enable advanced features to view and manage memories across multiple databases.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Advanced Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="advanced-database-switching" className="text-sm font-medium">
              Enable Advanced Database Switching
            </Label>
            <p className="text-sm text-muted-foreground">
              Show database toggle in dashboard and sync status indicators
            </p>
          </div>
          <Switch
            id="advanced-database-switching"
            checked={isAdvancedEnabled}
            onCheckedChange={handleAdvancedToggle}
            disabled={updatePreferences.isPending}
          />
        </div>

        {/* Available Databases Info */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Available Databases</Label>
          <div className="flex gap-2">
            {availableDatabases.map((db) => (
              <Badge 
                key={db} 
                variant={db === currentDatabaseView ? "default" : "secondary"}
                className="flex items-center gap-1"
              >
                {db === 'icp' ? (
                  <Zap className="h-3 w-3" />
                ) : (
                  <Database className="h-3 w-3" />
                )}
                {db.toUpperCase()}
              </Badge>
            ))}
          </div>
        </div>

        {/* Database View Selector */}
        {isAdvancedEnabled && canSwitch && (
          <div className="space-y-2">
            <Label htmlFor="database-view-selector" className="text-sm font-medium">
              Default Dashboard View
            </Label>
            <Select
              value={currentDatabaseView}
              onValueChange={handleDatabaseViewChange}
              disabled={updatePreferences.isPending}
            >
              <SelectTrigger id="database-view-selector">
                <SelectValue placeholder="Select database view" />
              </SelectTrigger>
              <SelectContent>
                {availableDatabases.map((db) => (
                  <SelectItem key={db} value={db}>
                    <div className="flex items-center gap-2">
                      {db === 'icp' ? (
                        <Zap className="h-4 w-4" />
                      ) : (
                        <Database className="h-4 w-4" />
                      )}
                      {db === 'icp' ? 'ICP Database' : 'Neon Database'}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Info Box */}
        {isAdvancedEnabled && (
          <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Advanced Features Enabled</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Database toggle will appear in dashboard</li>
                <li>• Sync status indicators for cross-database memories</li>
                <li>• Memory source badges (ICP, Neon, Both)</li>
                <li>• Advanced users only - hidden from basic users</li>
              </ul>
            </div>
          </div>
        )}

        {/* Single Database Warning */}
        {!canSwitch && availableDatabases.length === 1 && (
          <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <Info className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-yellow-800">
                Single Database Configuration
              </p>
              <p className="text-xs text-yellow-700">
                Enable multiple databases in your hosting preferences to use advanced switching features.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
