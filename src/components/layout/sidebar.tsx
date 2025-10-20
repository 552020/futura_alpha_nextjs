'use client';

import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useInterface } from '@/contexts/interface-context';
import UserButtonClient from '@/components/auth/user-button-client';
import { mainNavItems, secondaryNavItems, getTranslatedLabel } from '@/utils/navigation';
import { Dictionary } from '@/utils/dictionaries';
import { Separator } from '@/components/ui/separator';
import { Settings, Infinity } from 'lucide-react';

interface SidebarProps {
  dict: Dictionary;
}

export default function Sidebar({ dict }: SidebarProps) {
  const pathname = usePathname();
  const { mode } = useInterface();
  const params = useParams();
  const lang = (params.lang as string) || 'en';

  // Helper function to construct full URLs with language
  const getFullHref = (baseHref: string) => `/${lang}${baseHref}`;

  // Don't render sidebar in marketing mode or gallery preview pages
  if (mode === 'marketing') {
    return null;
  }

  // Hide sidebar on gallery preview pages
  const isGalleryPreview = pathname.includes('/gallery/') && pathname.includes('/preview');

  if (isGalleryPreview) {
    return null;
  }

  return (
    <aside
      className="w-56 hidden md:flex flex-col bg-white/80 backdrop-blur-sm dark:bg-slate-950/80 border-r border-gray-200 dark:border-gray-800"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Scrollable navigation area */}
      <nav className="flex-1 overflow-y-auto py-4">
        {/* Main navigation items */}
        <div className="space-y-1">
          {mainNavItems.map(item => {
            const fullHref = getFullHref(item.href);
            const isActive = pathname === fullHref || pathname.startsWith(`${fullHref}/`);
            return (
              <Link
                key={item.href}
                href={fullHref}
                aria-label={getTranslatedLabel(item, dict)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 text-sm relative transition-colors',
                  isActive
                    ? 'text-primary bg-primary/10 hover:bg-primary/20'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                {/* Active indicator bar */}
                <div
                  className={cn(
                    'absolute left-0 top-0 bottom-0 w-1 rounded-r-full transition-colors',
                    isActive ? 'bg-primary' : 'bg-transparent'
                  )}
                />
                <item.icon className="h-5 w-5" />
                <span>{getTranslatedLabel(item, dict)}</span>
              </Link>
            );
          })}
        </div>

        {/* Separator between main and secondary nav */}
        <div className="mx-6">
          <Separator className="my-4" />
        </div>

        {/* Secondary navigation items */}
        <div className="space-y-1">
          {secondaryNavItems.map((item, index) => {
            const fullHref = getFullHref(item.href);
            const isActive = pathname === fullHref || pathname.startsWith(`${fullHref}/`);
            return (
              <div key={item.href}>
                <Link
                  href={fullHref}
                  aria-label={getTranslatedLabel(item, dict)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 text-sm relative transition-colors',
                    isActive
                      ? 'text-primary bg-primary/10 hover:bg-primary/20'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  {/* Active indicator bar */}
                  <div
                    className={cn(
                      'absolute left-0 top-0 bottom-0 w-1 rounded-r-full transition-colors',
                      isActive ? 'bg-primary' : 'bg-transparent'
                    )}
                  />
                  <item.icon className="h-5 w-5" />
                  <span>{getTranslatedLabel(item, dict)}</span>
                </Link>
                {/* Add separator after contacts (first item in secondary nav) */}
                {index === 0 && (
                  <div className="mx-6">
                    <Separator className="my-2" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Settings */}
        <div className="space-y-1">
          <Link
            href={`/${lang}/user/settings`}
            aria-label="Settings"
            className={cn(
              'flex items-center gap-3 px-4 py-3 text-sm relative transition-colors',
              pathname === `/${lang}/user/settings`
                ? 'text-primary bg-primary/10 hover:bg-primary/20'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            )}
          >
            {/* Active indicator bar */}
            <div
              className={cn(
                'absolute left-0 top-0 bottom-0 w-1 rounded-r-full transition-colors',
                pathname === `/${lang}/user/settings` ? 'bg-primary' : 'bg-transparent'
              )}
            />
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </Link>
        </div>

        {/* Separator before ICP */}
        <div className="mx-6">
          <Separator className="my-4" />
        </div>

        {/* ICP */}
        <div className="space-y-1">
          <Link
            href={`/${lang}/user/icp`}
            aria-label="ICP"
            className={cn(
              'flex items-center gap-3 px-4 py-3 text-sm relative transition-colors',
              pathname === `/${lang}/user/icp`
                ? 'text-primary bg-primary/10 hover:bg-primary/20'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            )}
          >
            {/* Active indicator bar */}
            <div
              className={cn(
                'absolute left-0 top-0 bottom-0 w-1 rounded-r-full transition-colors',
                pathname === `/${lang}/user/icp` ? 'bg-primary' : 'bg-transparent'
              )}
            />
            <Infinity className="h-5 w-5" />
            <span>ICP</span>
          </Link>
        </div>
      </nav>

      {/* User section at the bottom */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-4">
        <UserButtonClient />
      </div>
    </aside>
  );
}
