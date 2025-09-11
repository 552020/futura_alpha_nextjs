import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { Chat } from "@/components/chat-ai/chat";
import { getChatById, getMessagesByChatId } from "@/db/queries";
import { DataStreamHandler } from "@/components/chat-ai/data-stream-handler";
import { DataStreamProvider } from "@/components/chat-ai/data-stream-provider";
import { AppSidebar } from "@/components/chat-ai/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { convertToUIMessages } from "@/lib/utils";
import Script from "next/script";

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const chat = await getChatById({ id });

  if (!chat) {
    notFound();
  }

  const session = await auth();

  if (!session) {
    redirect("/api/auth/guest");
  }

  if (chat.visibility === "private") {
    if (!session.user) {
      return notFound();
    }

    if (session.user.id !== chat.userId) {
      return notFound();
    }
  }

  const messagesFromDb = await getMessagesByChatId({
    id,
  });

  const uiMessages = convertToUIMessages(messagesFromDb);

  const cookieStore = await cookies();
  const chatModelFromCookie = cookieStore.get("chat-model");
  const isCollapsed = cookieStore.get("sidebar:state")?.value !== "true";

  const chatComponent = (
    <Chat
      id={chat.id}
      initialMessages={uiMessages}
      initialChatModel={chatModelFromCookie?.value || DEFAULT_CHAT_MODEL}
      initialVisibilityType={chat.visibility}
      isReadonly={session?.user?.id !== chat.userId}
      session={session}
      autoResume={true}
      initialLastContext={chat.lastContext ?? undefined}
    />
  );

  return (
    <>
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
