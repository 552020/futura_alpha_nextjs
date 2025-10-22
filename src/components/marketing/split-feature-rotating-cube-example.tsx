'use client';

import SplitFeatureRotatingCube from './split-feature-rotating-cube';

// Example usage of the SplitFeatureRotatingCube component
export default function SplitFeatureRotatingCubeExample() {
  return (
    <SplitFeatureRotatingCube
      title="Your Custom Title Here"
      subtitle="Your Custom Subtitle"
      description="Your custom description that explains your product or service with honest materials and strong geometry."
      ctaText="Get Started"
      ctaLink="/signup"
      secondaryCtaText="Learn More →"
      secondaryCtaLink="/about"
      className="my-8" // Optional additional styling
    />
  );
}
