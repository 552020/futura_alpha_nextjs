'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Menu, Share2, Twitter, Instagram, Facebook } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { ModeToggle } from '@/components/common/mode-toggle';
import { SettingsButton } from '@/components/user/settings-button';
import NavBar from '@/components/layout/nav-bar';
// import UserButtonClient from "@/components/user-button-client";
import UserButtonClientWithII from '@/components/auth/user-button-client-with-ii';
import { useInterface } from '@/contexts/interface-context';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader, SheetClose } from '@/components/ui/sheet';
import { Dictionary } from '@/utils/dictionaries';
import { usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

// Define a proper type for the dictionary with optional fields
type HeaderDictionary = Dictionary;

export default function Header({ dict, lang }: { dict: HeaderDictionary; lang?: string }) {
  const { data: session, status } = useSession();
  const { mode } = useInterface();
  const pathname = usePathname();
  const { toast } = useToast();
  // Use the passed lang prop if available, otherwise get it from params
  const currentLang = lang || 'en';

  // Hide header on gallery preview pages
  const isGalleryPreview = pathname.includes('/gallery/') && pathname.includes('/preview');

  if (isGalleryPreview) {
    return null;
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out this content!',
          text: 'I found this interesting content and wanted to share it with you.',
          url: window.location.href,
        });
        // console.log("Content shared successfully");
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          // console.log("Web Share API not supported");
        } else {
          console.error('Error sharing content:', error);
        }
      }
    } else {
      // console.log("Share was canceled by the user");
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: 'Link copied!',
          description: 'The link has been copied to your clipboard.',
        });
      } catch (error) {
        console.error('Failed to copy link:', error);
        toast({
          title: 'Error',
          description: 'Failed to copy link to clipboard.',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-sm dark:bg-slate-950/80">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left: Logo section */}
        <section className="logo-section flex items-center">
          <Link href={`/${currentLang}`} className="transition-transform hover:scale-105">
            <div className="w-10 h-10 rounded-full bg-black dark:bg-white flex items-center justify-center">
              <span className="text-xl sm:text-2xl font-bold text-white dark:text-black">F</span>
            </div>
          </Link>
        </section>

        {/* Center: Navigation - DESKTOP ONLY */}
        <nav className="navigation-section hidden md:flex flex-1 justify-center gap-6 text-xs sm:text-sm">
          <NavBar mode={mode} lang={currentLang} dict={dict} />
        </nav>

        {/* Right User controls */}
        <section className="user-controls-section flex items-center gap-2 sm:gap-3">
          {/* Desktop-only user controls */}
          <div className="hidden md:flex items-center gap-2 transition-opacity hover:opacity-80">
            <UserButtonClientWithII lang={currentLang} />
            {/* <UserButtonClient lang={currentLang} /> */}
          </div>

          {/* Mobile-only sign in button (keep visible, not hidden in menu) */}
          <div className="flex md:hidden items-center gap-2 transition-opacity hover:opacity-80">
            <UserButtonClientWithII lang={currentLang} />
          </div>

          {/* Always visible controls */}
          <div className="transition-opacity hover:opacity-80">
            <LanguageSwitcher />
          </div>

          <div className="transition-opacity hover:opacity-80">
            <ModeToggle />
          </div>

          {/* Settings button - hide on mobile, and hide when unauthenticated */}
          <div className="hidden md:block transition-opacity hover:opacity-80">
            {status === 'authenticated' && session?.user ? <SettingsButton /> : null}
          </div>

          {/* Mobile: Burger menu - MOBILE ONLY */}
          <div className="md:hidden transition-opacity hover:opacity-80">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-muted" suppressHydrationWarning>
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px]">
                <SheetHeader className="border-b pb-4 mb-4">
                  <SheetTitle className="text-lg font-semibold">Menu</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col space-y-4">
                  <nav className="flex flex-col">
                    <NavBar mode={mode} lang={currentLang} dict={dict} className="mobile" closeOnClick />
                  </nav>

                  {/* Removed sign-in from mobile menu; sign-in stays in mobile header */}

                  {/* Contacts link in main navigation section */}
                  <div className="border-t pt-4">
                    <SheetClose asChild>
                      <Link
                        href={`/${currentLang}/contacts`}
                        className="transition-all duration-200 ease-in-out px-4 py-3 hover:text-primary hover:bg-muted rounded-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 text-base w-full flex items-center"
                      >
                        Contacts
                      </Link>
                    </SheetClose>
                  </div>

                  {/* Footer Links in Mobile Menu */}
                  <div className="border-t pt-4">
                    <div className="flex flex-col space-y-2">
                      {/* Settings in footer section (only when authenticated) */}
                      {status === 'authenticated' && session?.user ? (
                        <SheetClose asChild>
                          <Link
                            href={`/${currentLang}/user/settings`}
                            className="transition-all duration-200 ease-in-out px-4 py-3 hover:text-primary hover:bg-muted rounded-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 text-base w-full flex items-center text-muted-foreground"
                          >
                            Settings
                          </Link>
                        </SheetClose>
                      ) : null}
                      <SheetClose asChild>
                        <Link
                          href={`/${currentLang}/terms`}
                          className="transition-all duration-200 ease-in-out px-4 py-3 hover:text-primary hover:bg-muted rounded-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 text-base w-full flex items-center text-muted-foreground"
                        >
                          {dict?.footer?.terms || 'Terms'}
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link
                          href={`/${currentLang}/privacy`}
                          className="transition-all duration-200 ease-in-out px-4 py-3 hover:text-primary hover:bg-muted rounded-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 text-base w-full flex items-center text-muted-foreground"
                        >
                          {dict?.footer?.privacy || 'Privacy'}
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <button
                          onClick={handleShare}
                          tabIndex={-1}
                          className="transition-all duration-200 ease-in-out px-4 py-3 hover:text-primary hover:bg-muted rounded-none focus:outline-none focus:ring-0 focus:bg-transparent text-base w-full flex items-center gap-2 text-muted-foreground"
                        >
                          <Share2 className="h-4 w-4" />
                          <span>{dict?.footer?.share || 'Share'}</span>
                        </button>
                      </SheetClose>
                    </div>

                    {/* Social Links */}
                    <div className="w-full px-4 py-3 rounded-none flex items-center gap-4 text-muted-foreground transition-colors hover:bg-muted">
                      <SheetClose asChild>
                        <a
                          href="https://twitter.com/futura"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="transition-colors hover:text-primary"
                          aria-label="Twitter"
                        >
                          <Twitter className="h-4 w-4" />
                        </a>
                      </SheetClose>
                      <SheetClose asChild>
                        <a
                          href="https://instagram.com/futura"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="transition-colors hover:text-primary"
                          aria-label="Instagram"
                        >
                          <Instagram className="h-4 w-4" />
                        </a>
                      </SheetClose>
                      <SheetClose asChild>
                        <a
                          href="https://facebook.com/futura"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="transition-colors hover:text-primary"
                          aria-label="Facebook"
                        >
                          <Facebook className="h-4 w-4" />
                        </a>
                      </SheetClose>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </section>
      </div>
    </header>
  );
}
