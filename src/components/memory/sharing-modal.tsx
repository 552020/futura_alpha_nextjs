'use client';

import { useState } from 'react';
import { useSharingMutations } from '@/hooks/use-sharing-mutations';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Copy, Share2, Users, Link, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  name: string;
  avatar?: string;
  // Note: Email is NOT exposed for privacy - only used internally
}

interface EmailInvite {
  email: string;
  name?: string;
}

interface SharePermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

interface AccessControlSettings {
  requireAuth: boolean;
  allowedUsers: string[];
  allowedRoles: string[];
  expiresAt?: Date;
}

interface SharingModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType: 'memory' | 'folder';
  resourceId: string;
  resourceTitle: string;
  onShareSuccess?: () => void;
}

export function SharingModal({
  isOpen,
  onClose,
  resourceType,
  resourceId,
  resourceTitle,
  onShareSuccess,
}: SharingModalProps) {
  const [activeTab, setActiveTab] = useState<'user' | 'public'>('user');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<EmailInvite[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [permissions, setPermissions] = useState<SharePermissions>({
    canView: true,
    canEdit: false,
    canDelete: false,
  });
  const [accessControl, setAccessControl] = useState<AccessControlSettings>({
    requireAuth: false,
    allowedUsers: [],
    allowedRoles: [],
  });
  const [generatedLink, setGeneratedLink] = useState<string>('');

  // Use sharing mutations
  const { shareWithUser, createLink, isSharing, isCreatingLink } = useSharingMutations();

  const handleUserSearch = async (query: string) => {
    if (query.length < 2) return;

    // TODO: Implement user search API
    console.log('Searching users:', query);
  };

  const handleUserRemove = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };

  const handleEmailAdd = () => {
    if (emailInput && emailInput.includes('@')) {
      const newEmail: EmailInvite = {
        email: emailInput.trim(),
        name: emailInput.split('@')[0], // Use email prefix as name
      };

      if (!selectedEmails.find(e => e.email === newEmail.email)) {
        setSelectedEmails([...selectedEmails, newEmail]);
      }
      setEmailInput('');
    }
  };

  const handleEmailRemove = (email: string) => {
    setSelectedEmails(selectedEmails.filter(e => e.email !== email));
  };

  const handleEmailKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEmailAdd();
    }
  };

  const handleShareWithUsers = async () => {
    try {
      // Share with each selected user
      for (const user of selectedUsers) {
        await shareWithUser(resourceType, resourceId, user.id, permissions);
      }

      // Handle email invitations using the existing temporary user system
      for (const emailInvite of selectedEmails) {
        await shareWithEmailInvite(resourceType, resourceId, emailInvite, permissions);
      }

      onShareSuccess?.();
      onClose();
    } catch (error) {
      console.error('Failed to share with users:', error);
    }
  };

  const shareWithEmailInvite = async (
    resourceType: 'memory' | 'folder',
    resourceId: string,
    emailInvite: EmailInvite,
    permissions: SharePermissions
  ) => {
    // Step 1: Create temporary user (same as onboarding process)
    const createUserResponse = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: emailInvite.name || emailInvite.email.split('@')[0],
        email: emailInvite.email,
        invitedByAllUserId: 'current-user-id', // TODO: Get from auth context
        metadata: {
          invitedAt: new Date().toISOString(),
          source: 'sharing-modal',
        },
      }),
    });

    if (!createUserResponse.ok) {
      throw new Error('Failed to create temporary user for email invitation');
    }

    const { allUser: recipientAllUser } = await createUserResponse.json();

    // Step 2: Share with the temporary user (same as onboarding process)
    const shareResponse = await fetch(`/api/${resourceType}s/${resourceId}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shareType: 'user',
        targetUserId: recipientAllUser.id,
        permissions,
        isOnboarding: false, // Regular sharing, not onboarding
        sendEmail: true, // ✅ Now enabled!
        isInviteeNew: true, // This is a new user invitation
      }),
    });

    if (!shareResponse.ok) {
      throw new Error('Failed to share with temporary user');
    }

    return shareResponse.json();
  };

  const handleCreatePublicLink = async () => {
    try {
      const result = await createLink(resourceType, resourceId, {
        expiresAt: accessControl.expiresAt?.toISOString(),
        allowedUsers: accessControl.allowedUsers,
        allowedRoles: accessControl.allowedRoles,
        requireAuth: accessControl.requireAuth,
        accessRestrictions: {},
      });

      if (result.data?.shareUrl) {
        setGeneratedLink(result.data.shareUrl);
      }
    } catch (error) {
      console.error('Failed to create public link:', error);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      // TODO: Show toast notification
      console.log('Link copied to clipboard');
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share {resourceType === 'memory' ? 'Memory' : 'Folder'}: {resourceTitle}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={value => setActiveTab(value as 'user' | 'public')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="user" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Share with Users
            </TabsTrigger>
            <TabsTrigger value="public" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              Public Link
            </TabsTrigger>
          </TabsList>

          {/* User-to-User Sharing */}
          <TabsContent value="user" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Share with Specific Users</CardTitle>
                <CardDescription>Invite specific users to view and collaborate on this {resourceType}.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* User Search */}
                <div className="space-y-2">
                  <Label htmlFor="user-search">Search Users</Label>
                  <Input
                    id="user-search"
                    placeholder="Search by name or email..."
                    value={userSearch}
                    onChange={e => {
                      setUserSearch(e.target.value);
                      handleUserSearch(e.target.value);
                    }}
                  />
                </div>

                {/* Email Invitations */}
                <div className="space-y-2">
                  <Label htmlFor="email-input">Invite by Email</Label>
                  <div className="flex space-x-2">
                    <Input
                      id="email-input"
                      type="email"
                      placeholder="Enter email address..."
                      value={emailInput}
                      onChange={e => setEmailInput(e.target.value)}
                      onKeyPress={handleEmailKeyPress}
                      className="flex-1"
                    />
                    <Button onClick={handleEmailAdd} disabled={!emailInput || !emailInput.includes('@')}>
                      Add
                    </Button>
                  </div>
                </div>

                {/* Selected Users */}
                {selectedUsers.length > 0 && (
                  <div className="space-y-2">
                    <Label>Selected Users</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedUsers.map(user => (
                        <Badge key={user.id} variant="secondary" className="flex items-center gap-1">
                          {user.name}
                          <button
                            onClick={() => handleUserRemove(user.id)}
                            className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected Emails */}
                {selectedEmails.length > 0 && (
                  <div className="space-y-2">
                    <Label>Email Invitations</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedEmails.map(email => (
                        <Badge key={email.email} variant="outline" className="flex items-center gap-1">
                          📧 {email.email}
                          <button
                            onClick={() => handleEmailRemove(email.email)}
                            className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Permissions */}
                <div className="space-y-3">
                  <Label>Permissions</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="can-view"
                        checked={permissions.canView}
                        onCheckedChange={checked => setPermissions({ ...permissions, canView: checked })}
                      />
                      <Label htmlFor="can-view">Can view</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="can-edit"
                        checked={permissions.canEdit}
                        onCheckedChange={checked => setPermissions({ ...permissions, canEdit: checked })}
                      />
                      <Label htmlFor="can-edit">Can edit</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="can-delete"
                        checked={permissions.canDelete}
                        onCheckedChange={checked => setPermissions({ ...permissions, canDelete: checked })}
                      />
                      <Label htmlFor="can-delete">Can delete</Label>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleShareWithUsers}
                  disabled={(selectedUsers.length === 0 && selectedEmails.length === 0) || isSharing}
                  className="w-full"
                >
                  {isSharing
                    ? 'Sharing...'
                    : `Share with ${selectedUsers.length + selectedEmails.length} recipient${selectedUsers.length + selectedEmails.length !== 1 ? 's' : ''}`}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Public Link Sharing */}
          <TabsContent value="public" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Create Public Link</CardTitle>
                <CardDescription>
                  Generate a shareable link that can be accessed by anyone with the URL.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Access Control Settings */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="require-auth"
                      checked={accessControl.requireAuth}
                      onCheckedChange={checked => setAccessControl({ ...accessControl, requireAuth: checked })}
                    />
                    <Label htmlFor="require-auth">Require authentication</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="restrict-users"
                      checked={accessControl.allowedUsers.length > 0}
                      onCheckedChange={checked =>
                        setAccessControl({
                          ...accessControl,
                          allowedUsers: checked ? [] : accessControl.allowedUsers,
                        })
                      }
                    />
                    <Label htmlFor="restrict-users">Restrict to specific users</Label>
                  </div>

                  {/* Expiration Date */}
                  <div className="space-y-2">
                    <Label>Expiration Date (Optional)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !accessControl.expiresAt && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {accessControl.expiresAt ? format(accessControl.expiresAt, 'PPP') : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={accessControl.expiresAt}
                          onSelect={date => setAccessControl({ ...accessControl, expiresAt: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Generated Link Display */}
                {generatedLink && (
                  <div className="space-y-2">
                    <Label>Generated Link</Label>
                    <div className="flex items-center space-x-2">
                      <Input value={generatedLink} readOnly className="flex-1" />
                      <Button onClick={handleCopyLink} size="sm">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <Button onClick={handleCreatePublicLink} disabled={isCreatingLink} className="w-full">
                  {isCreatingLink ? 'Creating Link...' : 'Create Public Link'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
