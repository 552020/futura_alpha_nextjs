import { getDictionary } from '@/utils/dictionaries';
import { Metadata } from 'next';

type AboutPageProps = {
  params: Promise<{
    lang: string;
  }>;
};

// Generate metadata for the page
export async function generateMetadata({ params }: AboutPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const dict = await getDictionary(resolvedParams.lang, { includeAbout: true });

  return {
    title: dict.about?.title || 'About Us',
    description: dict.about?.description || 'Learn more about our platform and mission.',
  };
}

export default async function AboutPage({ params }: AboutPageProps) {
  const resolvedParams = await params;
  const dict = await getDictionary(resolvedParams.lang, { includeAbout: true });

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">{dict.about?.title || 'About Us'}</h1>

      <div className="prose dark:prose-invert max-w-none">
        <p className="text-lg mb-6">
          {dict.about?.intro || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'}
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">{dict.about?.missionTitle || 'Our Mission'}</h2>
        <p>{dict.about?.missionText || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'}</p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">{dict.about?.visionTitle || 'Our Vision'}</h2>
        <p>{dict.about?.visionText || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'}</p>

        <h2 className="text-2xl font-semibold mt-8 mb-4">{dict.about?.teamTitle || 'Our Team'}</h2>
        <p>{dict.about?.teamText || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.'}</p>
      </div>
    </div>
  );
}
