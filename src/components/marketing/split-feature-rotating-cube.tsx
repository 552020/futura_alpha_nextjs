'use client';

import { motion } from 'framer-motion';

// Editorial split feature layout: two full-width blocks with hard edges, full-bleed imagery.
// - No rounded corners
// - Left block uses a rotating 3D cube (solid colors) instead of an image
// - Alternating image/text for an editorial, non-SaaS feel
// Tailwind required. Optional: a serif font in your Tailwind theme for headings (use class "font-serif").

interface SplitFeatureRotatingCubeProps {
  title?: string;
  subtitle?: string;
  description?: string;
  ctaText?: string;
  ctaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  className?: string;
}

export default function SplitFeatureRotatingCube({
  title = 'Designed to breathe. Built to last.',
  subtitle = 'Fewer gradients. More intention.',
  description = 'Honest materials and strong geometry. No rounded corners, no soft shadows—just clear lines and generous white space.',
  ctaText = 'Explore collection',
  ctaLink = '#',
  secondaryCtaText = 'Read the story →',
  secondaryCtaLink = '#',
  className = '',
}: SplitFeatureRotatingCubeProps) {
  return (
    <div className={`bg-neutral-50 text-neutral-800 ${className}`}>
      {/* Block 1 */}
      <section className="grid grid-cols-1 md:grid-cols-2 min-h-[70vh] lg:min-h-[80vh]">
        {/* Cube column: full-bleed, hard edges */}
        <div className="relative order-1 md:order-none">
          <div className="w-full h-full flex items-center justify-center">
            <div className="cube-scene w-full h-full">
              <div
                className="cube w-full h-full"
                style={
                  {
                    animation: 'spinCubeY 10s ease-in-out infinite',
                    transformStyle: 'preserve-3d',
                    '--cube-depth': '50vw',
                  } as React.CSSProperties
                }
              >
                <div className="cube__face cube__face--front bg-blue-600"></div>
                <div className="cube__face cube__face--back bg-red-600"></div>
                <div className="cube__face cube__face--right bg-green-600"></div>
                <div className="cube__face cube__face--left bg-yellow-600"></div>
                <div className="cube__face cube__face--top bg-purple-600"></div>
                <div className="cube__face cube__face--bottom bg-orange-600"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="flex items-center">
          <div className="px-6 py-16 sm:px-10 lg:px-20 max-w-xl">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="font-serif text-3xl sm:text-4xl lg:text-5xl leading-tight"
            >
              {title}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.1 }}
              className="mt-6 text-base sm:text-lg leading-relaxed text-neutral-800"
            >
              {description}
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.2 }}
              className="mt-10 flex gap-6"
            >
              <a href={ctaLink} className="underline underline-offset-4 decoration-2 hover:opacity-70">
                {ctaText}
              </a>
              <a href={secondaryCtaLink} className="hover:opacity-70">
                {secondaryCtaText}
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Block 2 (alternate) */}
      <section className="grid grid-cols-1 md:grid-cols-2 min-h-[70vh] lg:min-h-[80vh] border-t border-neutral-200">
        {/* Text first on mobile */}
        <div className="flex items-center order-2 md:order-none">
          <div className="px-6 py-16 sm:px-10 lg:px-20 max-w-xl md:ml-auto">
            <motion.h3
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="font-serif text-3xl sm:text-4xl lg:text-5xl leading-tight"
            >
              {subtitle}
            </motion.h3>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.1 }}
              className="mt-6 text-base sm:text-lg leading-relaxed text-neutral-800"
            >
              A magazine-forward split that lets imagery speak at scale. Sharp edges create rhythm across the scroll
              without the SaaS-y pillow feel.
            </motion.p>
            <motion.ul
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.2 }}
              className="mt-10 space-y-3 text-neutral-800"
            >
              <li className="flex gap-3">
                <span aria-hidden>—</span> Full-bleed imagery on one side
              </li>
              <li className="flex gap-3">
                <span aria-hidden>—</span> Hard 90° edges, no borders
              </li>
              <li className="flex gap-3">
                <span aria-hidden>—</span> Alternating left/right cadence
              </li>
            </motion.ul>
          </div>
        </div>

        {/* Image right */}
        <div className="relative">
          <picture>
            <source
              srcSet="https://images.unsplash.com/photo-1520974752062-9f0b0f0b0f0b?q=80&w=1600&auto=format&fit=crop"
              media="(min-width: 768px)"
            />
            <img
              src="https://images.unsplash.com/photo-1520974752062-9f0b0f0b0f0b?q=80&w=1200&auto=format&fit=crop"
              alt="Architectural detail with strong geometry"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </picture>
        </div>
      </section>

      {/* Optional: narrow editorial kicker */}
      <section className="px-6 sm:px-10 lg:px-20 py-20 border-t border-neutral-200">
        <div className="w-full">
          <h4 className="font-serif text-2xl sm:text-3xl">Notes on the look</h4>
          <p className="mt-4 text-neutral-800 leading-relaxed">
            Use fewer UI-y elements. Prefer generous margins, large typographic scales, and grid discipline. Treat
            imagery like spreads rather than cards. If you need separation, use hairline borders (1px) or whitespace,
            not radii.
          </p>
        </div>
      </section>
    </div>
  );
}
