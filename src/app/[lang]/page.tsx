import Hero from "@/components/marketing/hero";
import HeroDemo from "@/components/marketing/hero-demo";
import { getDictionary } from "@/utils/dictionaries";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Chat } from "@/components/chat-ai/chat";
import { DataStreamHandler } from "@/components/chat-ai/data-stream-handler";
import { DataStreamProvider } from "@/components/chat-ai/data-stream-provider";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { generateUUID } from "@/lib/utils";

type PageProps = {
  params: Promise<{
    lang: string;
  }>;
};

const DEFAULT_SEGMENT = "family";
const BLOCK_JAM_DEMO = true; // Hardcoded flag for demo mode

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
  const segment = cookieStore.get("segment")?.value || DEFAULT_SEGMENT;

  // Get dictionary for the language WITH the preferred segment
  const dict = await getDictionary(resolvedParams.lang, { segment });

  const heroMode = process.env.NEXT_PUBLIC_HERO;
  const showVault = heroMode === "vault";

  // If block-jam flag is true, render Chat component instead of marketing content
  if (BLOCK_JAM_DEMO) {
    const id = generateUUID();
    const modelIdFromCookie = cookieStore.get("chat-model");

    // Mock session for MVP - no authentication required
    const mockSession = {
      user: {
        id: "guest-user",
        email: "guest@example.com",
        name: "Guest User",
        businessUserId: undefined,
        icpPrincipal: undefined,
      },
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    };

    return (
      <main className="bg-white dark:bg-[#0A0A0B]">
        <DataStreamProvider>
          <SidebarProvider defaultOpen={false}>
            <SidebarInset>
              <Chat
                id={id}
                initialMessages={[]}
                initialChatModel={modelIdFromCookie?.value || DEFAULT_CHAT_MODEL}
                initialVisibilityType="private"
                isReadonly={false}
                session={mockSession}
                autoResume={false}
                demoMode={BLOCK_JAM_DEMO}
              />
              <DataStreamHandler />
            </SidebarInset>
          </SidebarProvider>
        </DataStreamProvider>
      </main>
    );
  }

  return (
    <main className="bg-white dark:bg-[#0A0A0B]">
      {showVault ? (
        <Hero dict={dict} lang={resolvedParams.lang} />
      ) : (
        <HeroDemo dict={dict} lang={resolvedParams.lang} />
      )}
      {/* <ValueJourney dict={dict} lang={resolvedParams.lang} segment={segment} /> */}
    </main>
  );
}
