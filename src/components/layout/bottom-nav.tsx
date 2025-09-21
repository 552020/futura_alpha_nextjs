'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useInterface } from '@/contexts/interface-context';
import { allNavItems, getTranslatedLabel } from '@/utils/navigation';
import { Dictionary } from '@/utils/dictionaries';

interface BottomNavProps {
  dict: Dictionary;
}

export default function BottomNav({ dict }: BottomNavProps) {
  const pathname = usePathname();
  const { mode } = useInterface();

  // Extract lang from pathname
  const [, lang] = pathname.split('/');

  // Guard against edge cases
  if (!lang) {
    console.warn('Missing required language parameter');
  }

  // Helper function to construct full URLs
  const getFullHref = (baseHref: string) => `/${lang}${baseHref}`;

  // Don't render bottom nav in marketing mode
  if (mode === 'marketing') {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white dark:bg-slate-950 md:hidden">
      <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-3">
        {allNavItems.map(item => {
          const fullHref = getFullHref(item.href);
          const isActive = pathname === fullHref || pathname.startsWith(`${fullHref}/`);
          return (
            <Link
              key={item.href}
              href={fullHref}
              className={cn(
                'flex flex-col items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground flex-1',
                isActive ? 'text-primary' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'
              )}
              aria-label={getTranslatedLabel(item, dict)}
            >
              {/* Active indicator pill */}
              {isActive && <div className="absolute top-0 left-1/2 -translate-x-1/2 h-1 w-8 bg-primary rounded-full" />}
              <item.icon className="h-5 w-5" />
              <span className="text-center">{getTranslatedLabel(item, dict)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
