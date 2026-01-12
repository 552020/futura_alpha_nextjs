import { getDictionary } from '@/utils/dictionaries';
import { Metadata } from 'next';
import AlternatingFeatures, {
  type FeatureItem,
} from '@/components/marketing/alternating-features';
import CTAConclusion from '@/components/marketing/cta-conclusion';

type SolutionPageProps = {
  params: Promise<{
    lang: string;
  }>;
};

// Generate metadata for the page
export async function generateMetadata({
  params,
}: SolutionPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const dict = await getDictionary(resolvedParams.lang, {
    includeSolution: true,
  });

  return {
    title: dict.solution?.title || 'Solution',
    description:
      dict.solution?.description ||
      'Discover how our platform solves your needs.',
  };
}

export default async function SolutionPage({
  params: _params,
}: SolutionPageProps) {
  // Define the features for the solution page
  const features: FeatureItem[] = [
    {
      image: '/solution/ownership.jpg',
      title: 'Your Very Own',
      subtitle: 'True ownership, full control, and safe shareability',
    },
    {
      image: '/solution/beautiful.jpg',
      title: 'Memory Chest',
      subtitle: 'A special treasure, not just another folder on Google Drive',
    },
    {
      image: '/solution/forever.jpg',
      title: 'Beautiful & Forever',
      subtitle: 'Stunning design preserved for generations',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-none">
        <p className="text-5xl md:text-6xl font-black mb-6 leading-tight">
          Futura is a digital multimedia{' '}
          <span className="bg-black text-white px-3 py-1 hover:bg-white hover:text-black transition-colors duration-200">
            memory
          </span>{' '}
          <span className="bg-black text-white px-3 py-1 hover:bg-white hover:text-black transition-colors duration-200">
            album
          </span>{' '}
          for newly weds to{' '}
          <span className="underline decoration-4 underline-offset-4 decoration-yellow-500">
            collect
          </span>
          ,{' '}
          <span className="underline decoration-4 underline-offset-4 decoration-pink-500">
            share
          </span>{' '}
          and{' '}
          <span className="underline decoration-4 underline-offset-4 decoration-sky-400">
            store
          </span>{' '}
          their wedding memories.{' '}
          <span className="bg-black text-white px-3 py-1 hover:bg-white hover:text-black transition-colors duration-200">
            Forever.
          </span>
        </p>

        {/* Features Section with Alternating Layout */}
        <div className="mt-20 max-w-[90%] 2xl:max-w-[1800px] mx-auto">
          <AlternatingFeatures items={features} />
          <CTAConclusion
            conclusion="Get it now."
            ctaHref="/onboarding/items-upload"
            ctaLabel="Start Now"
            ctaSymbol="→"
            position="right"
            textSize="large"
            textAlign="center"
          />
        </div>
      </div>
    </div>
  );
}
