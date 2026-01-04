import { getDictionary } from '@/utils/dictionaries';
import { Metadata } from 'next';

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

export default async function SolutionPage({ params }: SolutionPageProps) {
  const resolvedParams = await params;
  const dict = await getDictionary(resolvedParams.lang, {
    includeSolution: true,
  });

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
        {/* {dict.solution?.intro || 'Our solution provides a comprehensive approach to managing your digital presence and preserving your memories.'} */}

        {/* {dict.solution?.features && dict.solution.features.length > 0 && (
          <div className="mt-8">
            <h2 className="text-2xl font-semibold mb-6">Features</h2>
            <div className="grid gap-6 md:grid-cols-3">
              {dict.solution.features.map((feature, index) => (
                <div key={index} className="border rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-3">
                    {feature.title || 'Feature'}
                  </h3>
                  <p className="text-muted-foreground">
                    {feature.description || 'Feature description'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )} */}
      </div>
    </div>
  );
}
