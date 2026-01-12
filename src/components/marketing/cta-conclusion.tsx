'use client';

import Link from 'next/link';

interface CTAConclusionProps {
  conclusion?: string;
  ctaHref?: string;
  ctaLabel?: string;
  ctaSymbol?: string;
  position?: 'left' | 'right'; // Position of the button (text will be on the opposite side)
  textSize?: 'feature' | 'large' | 'hero'; // 'feature' matches feature titles, 'large' is in between, 'hero' is largest
  textAlign?: 'left' | 'center'; // Text alignment within its box
}

export default function CTAConclusion({
  conclusion,
  ctaHref = '/onboarding/items-upload',
  ctaLabel = 'Start Now',
  ctaSymbol = '→',
  position = 'right',
  textSize = 'hero',
  textAlign = 'left',
}: CTAConclusionProps) {
  if (!conclusion) return null;

  const isButtonRight = position === 'right';
  const textSizeClass = 
    textSize === 'feature' 
      ? 'text-3xl md:text-4xl 2xl:text-6xl' 
      : textSize === 'large'
      ? 'text-3xl md:text-5xl 2xl:text-7xl'
      : 'text-3xl md:text-5xl 2xl:text-8xl';
  const textAlignClass = textAlign === 'center' ? 'text-center' : 'text-left';

  return (
    <div className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-700">
      <div className={`flex flex-col md:flex-row items-center gap-12 ${isButtonRight ? '' : 'md:flex-row-reverse'}`}>
        {/* Text Section */}
        <div className="flex-1">
          <p className={`${textSizeClass} ${textAlignClass} font-bold text-neutral-900 dark:text-white leading-tight`}>
            {conclusion}
          </p>
        </div>

        {/* Button Section */}
        <div className="flex-1 flex justify-center">
          <div className="relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 md:w-96 2xl:w-[480px] h-48 md:h-96 2xl:h-[480px] rounded-full bg-neutral-900 dark:bg-white animate-pulse-scale" />
            <Link
              href={ctaHref}
              className="relative w-48 md:w-96 2xl:w-[480px] h-48 md:h-96 2xl:h-[480px] rounded-full bg-neutral-900 hover:bg-white dark:bg-white dark:hover:bg-neutral-900 flex items-center justify-center cursor-pointer text-white hover:text-neutral-900 dark:text-neutral-900 dark:hover:text-white border-2 border-transparent hover:border-neutral-900 dark:hover:border-white transition-all text-7xl md:text-9xl font-bold"
              aria-label={ctaLabel}
            >
              {ctaSymbol}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

