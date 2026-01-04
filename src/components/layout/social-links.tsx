import { FaFacebookF, FaInstagram, FaXTwitter } from 'react-icons/fa6';
// import { Twitter, Instagram, Facebook } from 'lucide-react';
import { SheetClose } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

type SocialLinksProps = {
  iconSize?: 'sm' | 'md';
  className?: string;
  linkClassName?: string;
  wrapInSheetClose?: boolean;
};

const socialLinks = [
  {
    href: 'https://x.com/futura_now',
    icon: FaXTwitter,
    label: 'X',
  },
  {
    href: 'https://www.instagram.com/futura.now/',
    icon: FaInstagram,
    label: 'Instagram',
  },
  {
    href: 'https://www.facebook.com/futura.now',
    icon: FaFacebookF,
    label: 'Facebook',
  },
];

// OLD CODE - Lucide React solution with Twitter (commented out)
// const socialLinks = [
//   {
//     href: 'https://twitter.com/futura',
//     icon: Twitter,
//     label: 'Twitter',
//   },
//   {
//     href: 'https://instagram.com/futura',
//     icon: Instagram,
//     label: 'Instagram',
//   },
//   {
//     href: 'https://facebook.com/futura',
//     icon: Facebook,
//     label: 'Facebook',
//   },
// ];

export default function SocialLinks({
  iconSize = 'md',
  className,
  linkClassName,
  wrapInSheetClose = false,
}: SocialLinksProps) {
  const iconSizeClass = iconSize === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  const LinkWrapper = wrapInSheetClose ? SheetClose : 'div';

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {socialLinks.map(({ href, icon: Icon, label }) => {
        const link = (
          <a
            key={href}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClassName}
            aria-label={label}
          >
            <Icon className={iconSizeClass} />
          </a>
        );

        return wrapInSheetClose ? (
          <LinkWrapper asChild key={href}>
            {link}
          </LinkWrapper>
        ) : (
          link
        );
      })}
    </div>
  );
}
