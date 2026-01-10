'use client';

import AlternatingFeatures from './alternating-features';
import CTAConclusion from './cta-conclusion';
import { Dictionary } from '@/utils/dictionaries';

import { fatLogger } from '@/lib/logger';

// Define valid journey types
type JourneyType = 'family' | 'black-mirror' | 'creatives' | 'wedding';

type Scene = {
  image?: string;
  title?: string;
  subtitle?: string;
  description?: string;
};

interface DynamicValueJourneyProps {
  dict: Dictionary;
  lang: string;
  segment?: string; // Make segment optional with a default
}

const DynamicValueJourney: React.FC<DynamicValueJourneyProps> = ({
  dict,
  lang,
  segment = 'family',
}) => {
  // Validate that segment is a valid journey type, default to "family" if not
  const journeyType = (segment as JourneyType) || 'family';

  // Use the passed lang prop if available, otherwise default to "en"
  const currentLang = lang || 'en';

  // Get the scenes for the selected journey type
  const getScenes = () => {
    const journeyDict = dict?.valueJourney;

    if (!journeyDict) {
      fatLogger.error(
        `Missing valueJourney content for segment: ${segment}`,
        'fe'
      );
      return []; // Return empty array, component will handle this gracefully
    }

    const scenes = [];
    let sceneIndex = 1;

    // Keep adding scenes as long as they exist in the dictionary
    while (true) {
      const sceneKey = `scene${sceneIndex}` as keyof typeof journeyDict;
      const scene = journeyDict[sceneKey];

      if (!scene) break; // Exit the loop if the scene doesn't exist

      // Type guard to ensure scene is an object with the expected properties
      if (typeof scene === 'object' && scene !== null && isScene(scene)) {
        // Make sure image paths are absolute from the root, not relative to the current route
        let imagePath =
          scene.image ||
          `/images/segments/${journeyType}/scene_${sceneIndex}.webp`;

        // Ensure the path starts with a slash and doesn't have the locale prefix
        if (!imagePath.startsWith('/')) {
          imagePath = `/${imagePath}`;
        }

        scenes.push({
          image: imagePath,
          title: scene.title || `Scene ${sceneIndex}`,
          subtitle: scene.subtitle,
          description:
            scene.description || `Description for scene ${sceneIndex}`,
        });
      }

      sceneIndex++;
    }

    return scenes;
  };

  const scenes = getScenes();
  const conclusion = dict?.valueJourney?.conclusion || '';

  return (
    <section id="learn-more" className="py-20 bg-white dark:bg-[#0A0A0B]">
      <div className="container mx-auto px-4">
        <div className="max-w-[90%] 2xl:max-w-[1800px] mx-auto">
          {scenes.length > 0 ? (
            <>
              <AlternatingFeatures items={scenes} />
              <CTAConclusion
                conclusion={conclusion}
                ctaHref={`/${currentLang}/onboarding/items-upload`}
                ctaLabel={dict?.hero?.startNow || 'Start Now'}
                ctaSymbol={dict?.hero?.arrowSymbol || '→'}
              />
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default DynamicValueJourney;

// Add type guard function
function isScene(obj: unknown): obj is Scene {
  return typeof obj === 'object' && obj !== null;
}
