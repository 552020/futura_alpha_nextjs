'use client';

import { useAuthGuard } from '@/utils/authentication';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserPlus, Mail, Phone } from 'lucide-react';
import RequireAuth from '@/components/auth/require-auth';

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  relationship: 'parent' | 'child' | 'sibling' | 'spouse' | 'friend' | 'other';
  status: 'connected' | 'pending' | 'invited';
}

export default function ContactsPage() {
  const { isAuthorized, isLoading } = useAuthGuard();

  // Sample contacts data
  const sampleContacts: Contact[] = [
    {
      id: '1',
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      phone: '+1 (555) 123-4567',
      relationship: 'spouse',
      status: 'connected',
    },
    {
      id: '2',
      name: 'Michael Johnson',
      email: 'mike@example.com',
      relationship: 'child',
      status: 'connected',
    },
    {
      id: '3',
      name: 'Emma Johnson',
      email: 'emma@example.com',
      relationship: 'child',
      status: 'pending',
    },
    {
      id: '4',
      name: 'Robert Sr.',
      email: 'dad@example.com',
      phone: '+1 (555) 987-6543',
      relationship: 'parent',
      status: 'connected',
    },
    {
      id: '5',
      name: 'Mary Johnson',
      email: 'mary@example.com',
      relationship: 'parent',
      status: 'connected',
    },
    {
      id: '6',
      name: 'David Wilson',
      email: 'david@example.com',
      relationship: 'friend',
      status: 'invited',
    },
  ];

  if (!isAuthorized || isLoading) {
    // Show loading spinner only while status is loading
    if (isLoading) {
      return (
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }

    // Show access denied for unauthenticated users
    return <RequireAuth />;
  }

  const getRelationshipColor = (relationship: string) => {
    switch (relationship) {
      case 'parent':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'child':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'sibling':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
      case 'spouse':
        return 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-300';
      case 'friend':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'invited':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Family & Friends</h1>
          <p className="text-muted-foreground mt-2">Manage your family connections and share memories together.</p>
        </div>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Contact
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sampleContacts.map(contact => (
          <Card key={contact.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={contact.avatar} alt={contact.name} />
                  <AvatarFallback>{getInitials(contact.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">{contact.name}</CardTitle>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="secondary" className={getRelationshipColor(contact.relationship)}>
                      {contact.relationship}
                    </Badge>
                    <Badge variant="outline" className={getStatusColor(contact.status)}>
                      {contact.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {contact.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{contact.email}</span>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{contact.phone}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm" className="flex-1">
                  View Profile
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  Share Memory
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {sampleContacts.length === 0 && (
        <div className="text-center py-12">
          <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No contacts yet</h3>
          <p className="text-muted-foreground mb-6">Start building your family network by inviting your loved ones.</p>
          <Button>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Your First Contact
          </Button>
        </div>
      )}
    </div>
  );
}
