import { getDictionary } from "@/utils/dictionaries";
import ItemsUploadClient from "./items-upload-client";
import ItemsUploadClientExperiment from "./items-upload-client-experiment";

interface PageProps {
  params: Promise<{ lang: string }>;
}
const EXPERIMENT = false;
export default async function ItemsUploadPage({ params }: PageProps) {
  // Await the params Promise first
  const resolvedParams = await params;
  const dict = await getDictionary(resolvedParams.lang, { includeOnboarding: true });

  return EXPERIMENT ? (
    <ItemsUploadClientExperiment lang={resolvedParams.lang} dict={dict} />
  ) : (
    <ItemsUploadClient lang={resolvedParams.lang} dict={dict} />
  );
}
