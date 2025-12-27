import Hero from "@/components/hero";
import ValueJourney from "@/components/value-journey";
import { getDictionary } from "@/utils/dictionaries";

type PageProps = {
  params: Promise<{
    lang: string;
  }>;
};

const DEFAULT_SEGMENT = "family";

export default async function LangPage({ params }: PageProps) {
  // Resolve the params promise
  const resolvedParams = await params;

  // Always use the default segment for static export
  const segment = DEFAULT_SEGMENT;

  // Get dictionary for the language WITH the preferred segment
  const dict = await getDictionary(resolvedParams.lang, { segment });

  return (
    <main className="bg-white dark:bg-[#0A0A0B]">
      <Hero dict={dict} lang={resolvedParams.lang} segment={segment} />
      <ValueJourney dict={dict} lang={resolvedParams.lang} segment={segment} />
    </main>
  );
}
