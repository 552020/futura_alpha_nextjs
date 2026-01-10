'use client';

import AlternatingFeaturesItem, {
  type FeatureItem,
} from './alternating-features-item';

export type { FeatureItem } from './alternating-features-item';

interface AlternatingFeaturesProps {
  items: FeatureItem[];
}

const AlternatingFeatures: React.FC<AlternatingFeaturesProps> = ({ items }) => {
  return (
    <>
      {items.map((item, index) => (
        <AlternatingFeaturesItem
          key={index}
          item={item}
          index={index}
          isLast={index === items.length - 1}
        />
      ))}
    </>
  );
};

export default AlternatingFeatures;
