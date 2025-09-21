import { locales } from '@/middleware';

/**
 * Dictionary type definition for internationalization.
 *
 * NOTE: All fields are intentionally marked as optional to provide flexibility
 * during development. This allows us to:
 * 1. Add new UI elements without immediately updating all language dictionaries
 * 2. Provide fallback values in components when translations are missing
 * 3. Gradually translate content without breaking the application
 *
 * Once the application structure stabilizes, we may consider making critical
 * fields required, but for now, this approach offers the best balance of
 * development speed and reliability.
 */

// Base dictionary type for common UI elements
export type BaseDictionary = {
  metadata?: {
    title?: string;
    description?: string;
  };
  hero?: {
    title?: string;
    subtitle?: string;
    learnMore?: string;
    startHere?: string;
    now?: string;
    startNow?: string;
    arrowSymbol?: string;
  };
  header?: {
    signIn?: string;
  };
  nav?: {
    about?: string;
    blog?: string;
    merch?: string;
    profile?: string;
    settings?: string;
    getStarted?: string;
    faq?: string;
    vault?: string;
    feed?: string;
  };
  navigation?: {
    dashboard?: string;
    gallery?: string;
    feed?: string;
    shared?: string;
    contacts?: string;
    profile?: string;
    icp?: string;
  };
  footer?: {
    tagline?: string;
    contact?: string;
    terms?: string;
    privacy?: string;
    share?: string;
  };
  onboarding?: {
    upload?: {
      title?: string;
      subtitle?: string;
    };
    profile?: {
      title?: string;
      subtitle?: string;
    };
  };
};

// Value journey dictionary type for segment-specific content
export type ValueJourneyDictionary = {
  valueJourney?: {
    scene1?: {
      image?: string;
      title?: string;
      subtitle?: string;
      description?: string;
    };
    scene2?: {
      image?: string;
      title?: string;
      subtitle?: string;
      description?: string;
    };
    scene3?: {
      image?: string;
      title?: string;
      subtitle?: string;
      description?: string;
    };
    scene4?: {
      image?: string;
      title?: string;
      subtitle?: string;
      description?: string;
    };
    scene5?: {
      image?: string;
      title?: string;
      subtitle?: string;
      description?: string;
    };
    scene6?: {
      image?: string;
      title?: string;
      subtitle?: string;
      description?: string;
    };
    conclusion?: string;
  };
};

// About page dictionary type
export type AboutDictionary = {
  about?: {
    title?: string;
    description?: string;
    intro?: string;
    missionTitle?: string;
    missionText?: string;
    visionTitle?: string;
    visionText?: string;
    teamTitle?: string;
    teamText?: string;
  };
};

// FAQ page dictionary type
export type FAQDictionary = {
  faq?: {
    title?: string;
    description?: string;
    intro?: string;
    items?: Array<{
      question?: string;
      answer?: string;
    }>;
  };
};

// Onboarding dictionary type
export type OnboardingDictionary = {
  onboarding?: {
    'items-upload'?: {
      variations?: {
        'leave-one-item'?: {
          title?: string;
          subtitle?: string;
        };
        'single-item'?: {
          title?: string;
          subtitle?: string;
        };
        'three-items'?: {
          title?: string;
          subtitle?: string;
        };
        'one-photo-one-memory-forever'?: {
          title?: string;
          subtitle?: string;
        };
        'preserve-your-digital-legacy'?: {
          title?: string;
          subtitle?: string;
        };
        'digital-time-capsule'?: {
          title?: string;
          subtitle?: string;
        };
        'pass-to-the-future'?: {
          title?: string;
          subtitle?: string;
        };
        'wedding-memory'?: {
          title?: string;
          subtitle?: string;
        };
      };
    };
  };
};

// Combined dictionary type that includes all content types
export type Dictionary = BaseDictionary &
  ValueJourneyDictionary &
  AboutDictionary &
  FAQDictionary &
  OnboardingDictionary & {
    'items-upload'?: {
      variations: {
        'leave-one-item': { title: string; subtitle: string };
        'single-item': { title: string; subtitle: string };
        'three-items': { title: string; subtitle: string };
        'one-photo-one-memory-forever': { title: string; subtitle: string };
        'preserve-your-digital-legacy': { title: string; subtitle: string };
        'digital-time-capsule': { title: string; subtitle: string };
        'pass-to-the-future': { title: string; subtitle: string };
        'wedding-memory': { title: string; subtitle: string };
      };
    };
  } & {
    [K in
      | 'metadata'
      | 'hero'
      | 'header'
      | 'nav'
      | 'footer'
      | 'onboarding'
      | 'valueJourney'
      | 'about'
      | 'faq'
      | 'variations']?: Record<string, unknown>;
  };

const dictionaries: Record<string, () => Promise<BaseDictionary>> = {
  en: () => import('../app/[lang]/dictionaries/base/en.json').then(module => module.default),
  fr: () => import('../app/[lang]/dictionaries/base/fr.json').then(module => module.default),
  es: () => import('../app/[lang]/dictionaries/base/es.json').then(module => module.default),
  pt: () => import('../app/[lang]/dictionaries/base/pt.json').then(module => module.default),
  it: () => import('../app/[lang]/dictionaries/base/it.json').then(module => module.default),
  de: () => import('../app/[lang]/dictionaries/base/de.json').then(module => module.default),
  pl: () => import('../app/[lang]/dictionaries/base/pl.json').then(module => module.default),
  zh: () => import('../app/[lang]/dictionaries/base/zh.json').then(module => module.default),
};

// Onboarding dictionaries
const onboardingDictionaries: Record<string, () => Promise<OnboardingDictionary>> = {
  en: () =>
    import('../app/[lang]/dictionaries/onboarding/en.json').then(module => module.default as OnboardingDictionary),
  de: () =>
    import('../app/[lang]/dictionaries/onboarding/de.json').then(module => module.default as OnboardingDictionary),
  // Add other languages as needed
};

// Segment-specific dictionaries
const segmentDictionaries: Record<string, Record<string, () => Promise<ValueJourneyDictionary>>> = {
  family: {
    en: () => import('../app/[lang]/dictionaries/segments/family/en.json').then(module => module.default),
    de: () => import('../app/[lang]/dictionaries/segments/family/de.json').then(module => module.default),
    // Add other languages as needed
  },
  'black-mirror': {
    en: () => import('../app/[lang]/dictionaries/segments/black-mirror/en.json').then(module => module.default),
    de: () => import('../app/[lang]/dictionaries/segments/black-mirror/de.json').then(module => module.default),
    // Add other languages as needed
  },
  // Add other segments as needed
};

// About page dictionaries
const aboutDictionaries: Record<string, () => Promise<AboutDictionary>> = {
  en: () => import('../app/[lang]/dictionaries/about/en.json').then(module => module.default as AboutDictionary),
  de: () => import('../app/[lang]/dictionaries/about/de.json').then(module => module.default as AboutDictionary),
  // Add other languages as needed
};

// FAQ page dictionaries
const faqDictionaries: Record<string, () => Promise<FAQDictionary>> = {
  en: () => import('../app/[lang]/dictionaries/faq/en.json').then(module => module.default as FAQDictionary),
  de: () => import('../app/[lang]/dictionaries/faq/de.json').then(module => module.default as FAQDictionary),
  // Add other languages as needed
};

/**
 * Loads dictionary content for internationalization based on locale and optional parameters.
 *
 * This function serves multiple purposes:
 * 1. Provides base UI text (navigation, buttons, common elements) for all pages
 * 2. Optionally loads segment-specific content (like valueJourney) when needed
 * 3. Optionally loads page-specific content (about, faq) when needed
 *
 * @param locale - The language code (e.g., "en", "fr", "de")
 * @param options - Optional parameters
 * @param options.segment - Optional segment name (e.g., "family", "black-mirror")
 * @param options.includeAbout - Whether to include About page content
 * @param options.includeFAQ - Whether to include FAQ page content
 * @param options.includeOnboarding - Whether to include Onboarding content
 * @returns A Promise resolving to a Dictionary containing all requested content
 */
export const getDictionary = async (
  locale: string,
  options?: {
    segment?: string;
    includeAbout?: boolean;
    includeFAQ?: boolean;
    includeOnboarding?: boolean;
  }
): Promise<Dictionary> => {
  try {
    // Check if the locale is supported
    if (!locales.includes(locale)) {
      console.warn(`Locale ${locale} not supported, falling back to English`);
      locale = 'en';
    }

    // Load the main dictionary for the locale
    const baseDictionary = await dictionaries[locale]();
    let result: Dictionary = { ...baseDictionary };

    // If onboarding content is requested, load and merge it
    if (options?.includeOnboarding) {
      try {
        if (onboardingDictionaries[locale]) {
          const onboardingDict = await onboardingDictionaries[locale]();
          result = { ...result, ...onboardingDict };
        } else if (onboardingDictionaries.en) {
          const onboardingDict = await onboardingDictionaries.en();
          result = { ...result, ...onboardingDict };
        }
      } catch (error) {
        console.error(`Error loading onboarding dictionary:`, error);
      }
    }

    // If a segment is specified, try to load and merge the segment-specific dictionary
    if (options?.segment) {
      try {
        // Check if we have a segment dictionary for this locale
        if (segmentDictionaries[options.segment]?.[locale]) {
          const segmentDict = await segmentDictionaries[options.segment][locale]();
          // Merge the segment dictionary with the result
          result = { ...result, ...segmentDict };
        }
        // Fall back to English segment dictionary if available
        else if (segmentDictionaries[options.segment]?.en) {
          const segmentDict = await segmentDictionaries[options.segment].en();
          // Merge the English segment dictionary with the result
          result = { ...result, ...segmentDict };
        }
      } catch (error) {
        console.error(`Error loading segment dictionary for ${options.segment}:`, error);
        // Continue with just the base dictionary if there's an error
      }
    }

    // If about content is requested, load and merge the about dictionary
    if (options?.includeAbout) {
      try {
        // Check if we have an about dictionary for this locale
        if (aboutDictionaries[locale]) {
          const aboutDict = await aboutDictionaries[locale]();
          // Merge the about dictionary with the result
          result = { ...result, ...aboutDict };
        }
        // Fall back to English about dictionary if available
        else if (aboutDictionaries.en) {
          const aboutDict = await aboutDictionaries.en();
          // Merge the English about dictionary with the result
          result = { ...result, ...aboutDict };
        }
      } catch (error) {
        console.error(`Error loading about dictionary for ${locale}:`, error);
        // Continue without about content if there's an error
      }
    }

    // If FAQ content is requested, load and merge the FAQ dictionary
    if (options?.includeFAQ) {
      try {
        // Check if we have a FAQ dictionary for this locale
        if (faqDictionaries[locale]) {
          const faqDict = await faqDictionaries[locale]();
          // Merge the FAQ dictionary with the result
          result = { ...result, ...faqDict };
        }
        // Fall back to English FAQ dictionary if available
        else if (faqDictionaries.en) {
          const faqDict = await faqDictionaries.en();
          // Merge the English FAQ dictionary with the result
          result = { ...result, ...faqDict };
        }
      } catch (error) {
        console.error(`Error loading FAQ dictionary for ${locale}:`, error);
        // Continue without FAQ content if there's an error
      }
    }

    return result;
  } catch (error) {
    console.error(`Error loading dictionaries:`, error);
    throw error;
  }
};
