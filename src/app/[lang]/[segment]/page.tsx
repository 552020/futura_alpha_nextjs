// app/[lang]/[segment]/page.tsx
import Hero from "@/components/marketing/hero";
import ValueJourney from "@/components/marketing/value-journey";
import { getDictionary } from "@/utils/dictionaries";
import { notFound } from "next/navigation";
// Remove the import for the server action
// import { setSegmentCookie } from "./actions";

// Define valid segments
const validSegments = ["family", "wedding", "creative", "black-mirror"];

// Define the correct type for the page props in Next.js 14+
type PageProps = {
  params: Promise<{
    lang: string;
    segment: string;
  }>;
};

export default async function SegmentPage({ params }: PageProps) {
  // Resolve the params promise
  const resolvedParams = await params;

  // Validate segment
  if (!validSegments.includes(resolvedParams.segment)) {
    notFound(); // Return 404 for invalid segments
  }

  // Remove the cookie setting code for now
  // await setSegmentCookie(resolvedParams.segment);

  // Get dictionary with segment-specific content
  const dict = await getDictionary(resolvedParams.lang, { segment: resolvedParams.segment });

  return (
    <main>
      <Hero dict={dict} lang={resolvedParams.lang} />
      <ValueJourney dict={dict} lang={resolvedParams.lang} segment={resolvedParams.segment} />
    </main>
  );
}
