import { Vault, Grid, Newspaper, Share2, User, Users, LucideIcon } from 'lucide-react';
import { Dictionary } from '@/utils/dictionaries';

export type NavItem = {
  href: string;
  icon: LucideIcon; // Lucide icon component
  label: string;
  translationKey: 'dashboard' | 'gallery' | 'feed' | 'shared' | 'contacts' | 'profile' | 'icp';
};

// Helper function to get translated label
export function getTranslatedLabel(item: NavItem, dict: Dictionary): string {
  return dict.navigation?.[item.translationKey] || item.label;
}

// Group navigation items for better organization
export const mainNavItems: NavItem[] = [
  { href: '/dashboard', icon: Vault, label: 'Dashboard', translationKey: 'dashboard' },
  { href: '/gallery', icon: Grid, label: 'Galleries', translationKey: 'gallery' },
  { href: '/feed', icon: Newspaper, label: 'Feed', translationKey: 'feed' },
  { href: '/shared', icon: Share2, label: 'Shared', translationKey: 'shared' },
];

export const secondaryNavItems: NavItem[] = [
  { href: '/contacts', icon: Users, label: 'Contacts', translationKey: 'contacts' },
  { href: '/user/profile', icon: User, label: 'Profile', translationKey: 'profile' },
];

// Combined array for components that need all items
export const allNavItems: NavItem[] = [...mainNavItems, ...secondaryNavItems];
