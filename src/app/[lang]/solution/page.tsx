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
      <h1 className="text-4xl font-bold mb-8">
        {dict.solution?.title || 'Solution'}
      </h1>

      <div className="prose dark:prose-invert max-w-none">
        <p className="text-lg mb-6">
          {dict.solution?.intro ||
            'Our solution provides a comprehensive approach to managing your digital presence and preserving your memories.'}
        </p>

        {dict.solution?.features && dict.solution.features.length > 0 && (
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
        )}
      </div>
    </div>
  );
}
