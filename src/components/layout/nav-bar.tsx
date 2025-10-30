import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dictionary } from '@/utils/dictionaries';
import { validateTranslations } from '@/components/utils/translation-validation';
import { SheetClose } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type NavBarProps = {
  mode: 'marketing' | 'app';
  lang: string;
  dict: Dictionary;
  className?: string;
  closeOnClick?: boolean;
  subdomain?: string;
};

type NavItem = {
  href: string;
  label: string;
};

export default function NavBar({ mode, lang, dict, className, closeOnClick = false, subdomain }: NavBarProps) {
  const pathname = usePathname();

  // Validate translations
  if (mode === 'marketing') {
    validateTranslations(dict, lang, 'nav');
  }

  // Filter navigation items based on subdomain
  const getNavItems = (): NavItem[] => {
    const allItems: NavItem[] = [
      { href: '/about', label: dict.nav?.about || 'About' },
      { href: '/contact', label: dict.nav?.contact || 'Contact' },
      { href: '/journal', label: (dict.nav as Record<string, string>)?.journal || 'Journal' },
      { href: '/merch', label: (dict.nav as Record<string, string>)?.merch || 'Merch' },
      { href: '/faq', label: dict.nav?.faq || 'FAQ' },
    ];

    // Hide journal and merch for foto-kotti-weddings subdomain
    if (subdomain === 'foto-kotti-weddings') {
      return allItems.filter(item => item.href !== '/journal' && item.href !== '/merch');
    }

    return allItems;
  };

  return mode === 'marketing' ? (
    <>
      {getNavItems().map(item => {
        const linkEl = (
          <Link
            key={item.href}
            href={`/${lang}${item.href}`}
            className={cn(
              'transition-colors duration-200 ease-in-out',
              className === 'mobile'
                ? cn(
                    'block w-full px-4 py-3 text-base',
                    'rounded-none',
                    pathname === `/${lang}${item.href}`
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-primary hover:text-primary-foreground'
                  )
                : cn(
                    'px-2 py-2 rounded-md',
                    pathname === `/${lang}${item.href}`
                      ? 'font-semibold text-primary bg-muted'
                      : 'text-muted-foreground hover:text-primary hover:bg-muted'
                  )
            )}
          >
            {item.label}
          </Link>
        );
        return className === 'mobile' && closeOnClick ? (
          <SheetClose asChild key={item.href}>
            {linkEl}
          </SheetClose>
        ) : (
          linkEl
        );
      })}
    </>
  ) : (
    <>{/* No navigation items in app mode - sidebar handles navigation */}</>
  );
}
