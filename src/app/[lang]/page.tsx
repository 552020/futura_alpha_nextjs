import Hero from '@/components/marketing/hero';
import HeroDemo from '@/components/marketing/hero-demo';
import SplitFeatureRotatingCube from '@/components/marketing/split-feature-rotating-cube';
import { getDictionary } from '@/utils/dictionaries';
import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

type PageProps = {
  params: Promise<{
    lang: string;
  }>;
};

const DEFAULT_SEGMENT = 'family';

export default async function LangPage({ params }: PageProps) {
  // Resolve the params promise
  const resolvedParams = await params;

  // Check if user is authenticated
  const session = await auth();

  // If authenticated, redirect to dashboard
  if (session?.user?.id) {
    redirect(`/${resolvedParams.lang}/dashboard`);
  }

  // Get the preferred segment from cookies, default to "family" if not found
  const cookieStore = await cookies();
  const segment = cookieStore.get('segment')?.value || DEFAULT_SEGMENT;

  // Get dictionary for the language WITH the preferred segment
  const dict = await getDictionary(resolvedParams.lang, { segment });

  const heroMode = process.env.NEXT_PUBLIC_HERO;
  const showVault = heroMode === 'vault';

  return (
    <main className="bg-white dark:bg-[#0A0A0B]">
      {showVault ? (
        <Hero dict={dict} lang={resolvedParams.lang} />
      ) : (
        <HeroDemo dict={dict} lang={resolvedParams.lang} />
      )}

      {/* Split Feature Rotating Cube Section */}
      <SplitFeatureRotatingCube
        title="Your Memories. Preserved Forever."
        subtitle="Built for eternity. Designed for you."
        description="Store your most precious memories on the Internet Computer with permanent, decentralized storage that never expires."
        ctaText="Start Preserving"
        ctaLink={`/${resolvedParams.lang}/onboarding/items-upload`}
        secondaryCtaText="Learn More →"
        secondaryCtaLink={`/${resolvedParams.lang}#learn-more`}
      />

      {/* <ValueJourney dict={dict} lang={resolvedParams.lang} segment={segment} /> */}
    </main>
  );
}
