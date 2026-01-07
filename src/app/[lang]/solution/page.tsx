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

export default async function SolutionPage({
  params: _params,
}: SolutionPageProps) {
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

        <div className="mt-12 max-w-3xl">
          <h2 className="text-3xl font-bold mb-6">Full Ownership</h2>
          <p className="text-lg leading-relaxed">
            Futura gives you full ownership.
          </p>
          <p className="text-lg leading-relaxed mt-4">
            Professional gallery systems like Pixieset are designed primarily
            for wedding photographers. The photographers are hosting the
            galleries on their accounts for the amount of time defined in the
            contract and the married couple is not able to redeem the gallery to
            take ownership of it. Pixieset markets itself as &quot;Client Photo
            Gallery, website, CRM for photographers&quot;.
          </p>
        </div>

        <div className="mt-12 max-w-3xl">
          <h2 className="text-3xl font-bold mb-6">A special cloud solution</h2>
          <p className="text-lg leading-relaxed">
            Futura gives your wedding memories a place of their own.
          </p>
          <p className="text-lg leading-relaxed mt-4">
            After the wedding, couples usually receive both physical and digital
            copies of their photos. What they rarely receive is real guidance on
            how to store them safely for the long term. Photographers often
            provide vademecums on their websites, recommending multiple physical
            backups and a copy on a generic cloud service such as Google Drive.
            In practice, couples are left alone to manage something that is
            meant to last a lifetime.
          </p>
          <p className="text-lg leading-relaxed mt-4">
            Futura fills this gap. It guides bride and groom through the process
            of securely storing their wedding photos in the cloud, making it
            simple and reliable. Just as wedding photos deserve a special
            physical form, they also deserve a dedicated digital place.
          </p>
        </div>

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
