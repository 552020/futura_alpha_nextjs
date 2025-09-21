'use client';

import Image from 'next/image';
import { Dictionary } from '@/utils/dictionaries';
import Link from 'next/link';
import { useRef, useEffect, useState } from 'react';

// Define valid journey types
type JourneyType = 'family' | 'black-mirror' | 'creatives' | 'wedding';

type Scene = {
  image?: string;
  title?: string;
  subtitle?: string;
  description?: string;
};

interface ValueJourneyProps {
  dict: Dictionary;
  lang: string;
  segment?: string; // Make segment optional with a default
}

const ValueJourney: React.FC<ValueJourneyProps> = ({ dict, lang, segment = 'family' }) => {
  // Validate that segment is a valid journey type, default to "family" if not
  const journeyType = (segment as JourneyType) || 'family';

  // Use the passed lang prop if available, otherwise default to "en"
  const currentLang = lang || 'en';

  // Get the scenes for the selected journey type
  const getScenes = () => {
    const journeyDict = dict?.valueJourney;

    if (!journeyDict) {
      console.error(`Missing valueJourney content for segment: ${segment}`);
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
        let imagePath = scene.image || `/images/segments/${journeyType}/scene_${sceneIndex}.webp`;

        // Ensure the path starts with a slash and doesn't have the locale prefix
        if (!imagePath.startsWith('/')) {
          imagePath = `/${imagePath}`;
        }

        scenes.push({
          image: imagePath,
          title: scene.title || `Scene ${sceneIndex}`,
          subtitle: scene.subtitle,
          description: scene.description || `Description for scene ${sceneIndex}`,
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
              {scenes.map((scene, index) => (
                <SceneItem key={index} scene={scene} index={index} isLast={index === scenes.length - 1} />
              ))}

              {conclusion && (
                <div className="text-center mt-16 pt-8 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-3xl md:text-5xl 2xl:text-8xl font-bold mb-20 max-w-[90%] mx-auto text-neutral-900 dark:text-white leading-tight">
                    {conclusion}
                  </p>
                  <div className="flex justify-center">
                    <div className="relative">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 md:w-96 2xl:w-[480px] h-48 md:h-96 2xl:h-[480px] rounded-full bg-neutral-900 dark:bg-white animate-pulse-scale-large" />
                      <Link
                        href={`/${currentLang}/onboarding/items-upload`}
                        className="relative w-48 md:w-96 2xl:w-[480px] h-48 md:h-96 2xl:h-[480px] rounded-full bg-neutral-900 hover:bg-white dark:bg-white dark:hover:bg-neutral-900 flex items-center justify-center cursor-pointer text-white hover:text-neutral-900 dark:text-neutral-900 dark:hover:text-white border-2 border-transparent hover:border-neutral-900 dark:hover:border-white transition-all text-7xl md:text-9xl font-bold"
                        aria-label={dict?.hero?.startNow || 'Start Now'}
                      >
                        {dict?.hero?.arrowSymbol || '→'}
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default ValueJourney;

// Scene item component without animation library
function SceneItem({
  scene,
  index,
  isLast,
}: {
  scene: { image: string; title: string; subtitle?: string };
  index: number;
  isLast: boolean;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Alternate layout for even/odd scenes
  const isEven = index % 2 === 0;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`
        flex flex-col md:flex-row items-center 
        ${!isLast ? 'mb-24' : 'mb-8'} 
        ${isEven ? '' : 'md:flex-row-reverse'}
        transition-opacity duration-700 ease-in-out
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}
        w-full
      `}
    >
      <div className="w-full md:flex-1 mb-8 md:mb-0">
        <div className="relative w-full aspect-square">
          <Image
            src={scene.image}
            alt={scene.title}
            fill
            className="object-cover rounded-lg transition-transform duration-500 hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 90vw"
            priority={index === 0}
          />
        </div>
      </div>

      <div className={`w-full md:flex-1 ${isEven ? 'md:pl-12 lg:pl-24' : 'md:pr-12 lg:pr-24'}`}>
        <h3 className="text-3xl md:text-4xl 2xl:text-6xl font-bold mb-4">{scene.title}</h3>
        {scene.subtitle && (
          <h4 className="text-xl md:text-2xl 2xl:text-4xl text-gray-600 dark:text-gray-400">{scene.subtitle}</h4>
        )}
      </div>
    </div>
  );
}

// Add type guard function at the end of file
function isScene(obj: unknown): obj is Scene {
  return typeof obj === 'object' && obj !== null;
}
