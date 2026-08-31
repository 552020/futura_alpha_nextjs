'use client';

import Image from 'next/image';
import { useRef, useEffect, useState } from 'react';

export interface FeatureItem {
  image: string;
  title: string;
  subtitle?: string;
  description?: string;
}

interface AlternatingFeaturesItemProps {
  item: FeatureItem;
  index: number;
  isLast: boolean;
}

export default function AlternatingFeaturesItem({
  item,
  index,
  isLast,
}: AlternatingFeaturesItemProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Alternate layout for even/odd items
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
            src={item.image}
            alt={item.title}
            fill
            className="object-cover rounded-lg transition-transform duration-500 hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 90vw"
            priority={index === 0}
          />
        </div>
      </div>

      <div
        className={`w-full md:flex-1 ${isEven ? 'md:pl-12 lg:pl-24' : 'md:pr-12 lg:pr-24'}`}
      >
        <h3 className="text-3xl md:text-4xl 2xl:text-6xl font-bold mb-4">
          {item.title}
        </h3>
        {item.subtitle && (
          <h4 className="text-xl md:text-2xl 2xl:text-4xl text-gray-600 dark:text-gray-400">
            {item.subtitle}
          </h4>
        )}
      </div>
    </div>
  );
}
