"use client";

import Link from "next/link";
import Image from "next/image";
import { Dictionary } from "@/utils/dictionaries";
import { validateTranslations } from "@/components/utils/translation-validation";
import { isKOTTIMOTTI } from "@/utils/project-config";

interface HeroProps {
  dict: Dictionary;
  lang: string;
}

type TitleVariant = "transform-overflow" | "negative-margins" | "flow-margin";

function HeroTitle({
  text,
  fontSize,
  variant = "transform-overflow",
  offsetRem = 3,
}: {
  text: string;
  fontSize: string;
  variant?: TitleVariant;
  /** Vertical offset from the top of the black box (in rem). */
  offsetRem?: number;
}) {
  if (variant === "flow-margin") {
    // Stays in normal flow; position with marginTop and scale only
    return (
      <h1
        className="font-black leading-none tracking-wider m-0 text-white relative z-10 pointer-events-none transform-gpu origin-top scale-[1.45] mb-8 mr-3"
        style={{
          fontSize,
          marginTop: `${offsetRem}rem`,
          textShadow: "0 2px 8px rgba(0,0,0,0.5)",
        }}
      >
        {text}
      </h1>
    );
  }
  if (variant === "negative-margins") {
    return (
      <h1
        className="font-black leading-none tracking-wider m-0 -mx-2 text-white"
        style={{ fontSize, marginTop: `${offsetRem}rem` }}
      >
        {text}
      </h1>
    );
  }
  // transform-overflow (default)
  return (
    <h1
      className="font-black leading-none tracking-wider m-0 text-white relative z-10 pointer-events-none transform-gpu origin-bottom scale-[1.45] -translate-y-2.5"
      style={{ fontSize, textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}
    >
      {text}
    </h1>
  );
}

function Hero({ dict, lang }: HeroProps) {
  // Get project-specific hero content
  const isKottiMotti = isKOTTIMOTTI();
  const heroContent = isKottiMotti ? dict?.hero_kottimotti : dict?.hero;

  // Validate translations using the helper function
  validateTranslations(dict, lang, isKottiMotti ? "hero_kottimotti" : "hero");

  // Controls for mobile overlay typography (adjust to taste)
  const TITLE_VW = 73.5; // base vw numerator for title
  const SUBTITLE_VW = 85; // base vw numerator for subtitle
  const TITLE_SCALE = 1.4; // >1 increases size
  const SUBTITLE_SCALE = 2.25; // >1 increases size (subtitle a bit bigger)
  // Controls for mobile overlay paddings (rem units)
  const BOX_PAD_X_REM = 0.5; // left/right padding
  const BOX_PAD_Y_REM = 1.0; // top/bottom padding
  // Controls for mobile overlay margins (rem units)
  const BOX_MARGIN_X_REM = 0.75; // left/right margin (was mx-3 -> 0.75rem)
  const BOX_MARGIN_Y_REM = 9.0; // top/bottom margin (was my-36 -> 9rem)
  // Title variant flag (env): transform-overflow | negative-margins (currently unused but kept for future customization)
  // const TITLE_VARIANT: TitleVariant = (process.env.NEXT_PUBLIC_HERO_TITLE as TitleVariant) || "transform-overflow";
  // Manual vertical offset for the title within the black box (rem)
  const TITLE_OFFSET_REM = -1.6;
  // CTA button background color flag for demo (e.g., "#dedce9" or "white")
  const CTA_BG_COLOR = "#dedce9";

  return (
    <div className="w-full flex items-center justify-center min-h-[calc(100vh-4rem)]">
      {/* Mobile-only layout (<480px) */}
      <div className="block min-[480px]:hidden w-full lg:w-[80%] mx-auto px-0 lg:px-4 flex flex-col lg:flex-row items-center gap-0 lg:gap-12 bg-background lg:rounded-lg relative">
        {/* Left Column - Text Content */}
        <div className="hidden lg:flex w-full lg:w-1/2 flex-col items-center lg:items-start text-center lg:text-left bg-red-100 dark:bg-red-900/20 p-4 rounded">
          {/* Title */}
          <div className="pt-32 lg:pt-0">
            <h1
              className="font-black font-bold leading-none text-foreground"
              //   style={{ fontSize: `calc(147vw / ${(heroContent?.title || "Futura").length})` }}
              style={{
                fontSize: `calc(73.5vw / ${
                  (heroContent?.title || "Futura").length
                })`,
              }}
            >
              {heroContent?.title || "Futura"}
            </h1>
          </div>

          {/* Subtitle */}
          <div className="pb-15 lg:pb-8">
            <p
              className="font-normal text-foreground"
              style={{
                fontSize: `calc(80vw / ${
                  (heroContent?.subtitle || "Live forever. Now.").length
                })`,
              }}
            >
              {heroContent?.subtitle || "Live forever. Now."}
            </p>
          </div>
        </div>

        {/* Right Column - Image */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-0 lg:p-4">
          <div className="relative w-screen lg:w-full lg:max-w-lg min-h-[calc(100vh-4rem)] lg:min-h-[400px] bg-gray-100 dark:bg-gray-800 rounded-none lg:rounded-lg flex items-center justify-center">
            <Image
              src="/hero/diana_charles.jpg"
              alt="Futura Hero Image"
              fill
              sizes="100vw"
              className="w-full h-full rounded-none lg:rounded-lg shadow-none lg:shadow-lg object-cover lg:object-center"
              style={{ objectPosition: "80% center" }}
              priority
            />
            {/* Mobile overlay text */}
            <div className="absolute inset-x-0 bottom-0 px-0 lg:hidden flex items-end justify-center overflow-visible">
              <div
                className="bg-black text-white text-center relative overflow-visible box-border"
                style={{
                  padding: `${BOX_PAD_Y_REM}rem ${BOX_PAD_X_REM}rem`,
                  margin: `${BOX_MARGIN_Y_REM}rem ${BOX_MARGIN_X_REM}rem`,
                  width: `calc(100% - ${BOX_MARGIN_X_REM * 2}rem)`,
                }}
              >
                <HeroTitle
                  text={heroContent?.title || "Futura"}
                  fontSize={`calc(${(TITLE_VW * TITLE_SCALE).toFixed(1)}vw / ${
                    (heroContent?.title || "Futura").length
                  })`}
                  //   variant={TITLE_VARIANT}
                  //   variant="transform-overflow"
                  variant="flow-margin"
                  offsetRem={TITLE_OFFSET_REM}
                />
                <p
                  className="font-medium tracking-wide m-0 mt-3 leading-snug text-left ml-2 mb-[-0.5rem]"
                  style={{
                    fontSize: `calc(${(SUBTITLE_VW * SUBTITLE_SCALE).toFixed(
                      1
                    )}vw / ${
                      (heroContent?.subtitle || "Kotti's Insta").length
                    })`,
                  }}
                >
                  {heroContent?.subtitle || "Kotti's Insta"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mid-range hero (>=480px and <lg): image only, same framing as desktop */}
      <div className="hidden min-[480px]:block lg:hidden w-full">
        <div className="relative w-full min-h-[calc(100vh-4rem)] overflow-hidden">
          <Image
            src="/hero/diana_charles.jpg"
            alt="Futura Hero Image"
            fill
            sizes="100vw"
            className="w-full h-full shadow-lg object-cover object-center"
            priority
            style={{ objectPosition: "center 10%" }}
          />
        </div>
      </div>

      {/* Desktop-only layout: full image with centered black box in bottom half */}
      <div className="hidden lg:block w-full">
        <div className="relative w-full min-h-[calc(100vh-4rem)] overflow-hidden">
          <Image
            src="/hero/diana_charles.jpg"
            alt="Futura Hero Image"
            fill
            sizes="100vw"
            className="w-full h-full shadow-lg object-cover object-center"
            priority
            style={{ objectPosition: "center 10%" }}
          />
          {/* Desktop left-half overlay area with inner black container */}
          <div className="absolute inset-0 z-[1] flex">
            {/* Left half */}
            <div className="relative w-1/2 h-full">
              {/* Semi-transparent overlay */}
              <div className="absolute inset-0 bg-black/30" />
              {/* Black container sized to left-half with margins */}
              <div className="absolute top-6 left-6 right-6 bottom-6">
                <div
                  className="bg-black text-white h-full w-full flex flex-col justify-start items-start px-6 py-4 text-left"
                  style={{ containerType: "inline-size" }}
                >
                  <div
                    className="font-black text-white leading-none w-full"
                    style={{ fontSize: "clamp(4rem, 9vw, 14rem)" }}
                  >
                    {heroContent?.title || "Futura"}
                  </div>
                  <div
                    className="mt-2 text-white/90 w-full"
                    style={{ fontSize: "clamp(2rem, 3vw, 6rem)" }}
                  >
                    {heroContent?.subtitle || "Kotti's Insta"}
                  </div>
                </div>
              </div>
            </div>
            {/* Right half (empty) */}
            <div className="w-1/2 h-full" />
          </div>
        </div>
      </div>

      {/* Arrow button - positioned in the bottom-right (mobile and desktop) */}
      <div className="absolute bottom-3 right-3 md:bottom-10 md:right-10 z-10">
        <div className="relative">
          <div className="absolute -inset-1 w-[104px] h-[104px] rounded-full bg-neutral-900 dark:bg-white animate-pulse-scale" />
          <Link
            href={`/${lang}/onboarding/items-upload`}
            className="relative w-24 h-24 rounded-full flex items-center justify-center cursor-pointer text-neutral-900 border-2 border-transparent transition-all text-4xl font-bold"
            style={{ backgroundColor: CTA_BG_COLOR }}
            aria-label={heroContent?.startHere || "Start Here"}
          >
            {heroContent?.arrowSymbol || "→"}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Hero;
