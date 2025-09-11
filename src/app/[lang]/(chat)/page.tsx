import ForceClient from "./_force-client";
import { cookies } from "next/headers";

import { Chat } from "@/components/chat-ai/chat";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { generateUUID } from "@/lib/utils";
import { DataStreamHandler } from "@/components/chat-ai/data-stream-handler";
import { DataStreamProvider } from "@/components/chat-ai/data-stream-provider";
import { AppSidebar } from "@/components/chat-ai/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Script from "next/script";

export default async function Page() {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/guest");
  }

  const id = generateUUID();

  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get("chat-model");
  const isCollapsed = cookieStore.get("sidebar:state")?.value !== "true";

  const chatComponent = (
    <Chat
      key={id}
      id={id}
      initialMessages={[]}
      initialChatModel={modelIdFromCookie?.value || DEFAULT_CHAT_MODEL}
      initialVisibilityType="private"
      isReadonly={false}
      session={session}
      autoResume={false}
    />
  );

  return (
    <>
      <ForceClient />
      <Script src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js" strategy="beforeInteractive" />
      <DataStreamProvider>
        <SidebarProvider defaultOpen={!isCollapsed}>
          <AppSidebar user={session?.user} />
          <SidebarInset>
            {chatComponent}
            <DataStreamHandler />
          </SidebarInset>
        </SidebarProvider>
      </DataStreamProvider>
    </>
  );
}
