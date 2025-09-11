import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  type LanguageModelUsage,
  smoothStream,
  stepCountIs,
  streamText,
} from "ai";
import { auth } from "@/auth";
import { type UserType } from "@/lib/ai/entitlements";
import { createTemporaryUserBase } from "../../utils";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
} from "@/db/queries";
import { updateChatLastContextById } from "@/db/queries";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { generateTitleFromUserMessage } from "@/app/[lang]/chat/actions";
import { createDocument } from "@/lib/ai/tools/create-document";
import { updateDocument } from "@/lib/ai/tools/update-document";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { isProductionEnvironment } from "@/lib/constants";
import { getProviderForModel } from "@/lib/ai/provider-factory";
import { pickModel } from "@/lib/ai/models";
import { thetaCompletionsAsChat } from "@/lib/ai/providers/theta";
import { myProvider } from "@/lib/ai/providers";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import { postRequestBodySchema, type PostRequestBody } from "../schema";
import { geolocation } from "@vercel/functions";
import { getStreamContext } from "../route";
import { ChatSDKError } from "@/lib/errors";
import type { ChatMessage } from "@/types/ai";
import type { VisibilityType } from "@/components/chat-ai/visibility-selector";

export const maxDuration = 60;
export const runtime = "nodejs";

// Extract user-facing text from DeepSeek R1 response (strip reasoning)
function extractUserFacingText(text: string): string {
  if (!text) {
    console.log("demo.chat extractUserFacingText: empty input");
    return "";
  }

  // Handle DeepSeek R1 format: <think>reasoning</think>actual_response
  const thinkPattern = /<think>[\s\S]*?<\/think>\s*/g;
  const withoutReasoning = text.replace(thinkPattern, "").trim();

  console.log("demo.chat extractUserFacingText", {
    inputLength: text.length,
    hasThinkTags: text.includes("<think>"),
    extractedLength: withoutReasoning.length,
    inputStart: text.slice(0, 100),
    extractedStart: withoutReasoning.slice(0, 100),
  });

  // If we successfully extracted content after reasoning, use that
  if (withoutReasoning && withoutReasoning !== text) {
    return withoutReasoning;
  }

  // Otherwise return the original text (might be partial/streaming)
  return text;
}

// Flag to control whether to use AI-generated titles (requires credit card)
// Set to true if you have a credit card on your Vercel account
// Set to false for demo mode without credit card requirements
const USE_AI_TITLES = false;

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  try {
    const {
      id,
      message,
      selectedChatModel,
      selectedVisibilityType,
    }: {
      id: string;
      message: ChatMessage;
      selectedChatModel: string;
      selectedVisibilityType: VisibilityType;
    } = requestBody;

    let session = await auth();

    // If no session, create a temporary user for demo mode
    if (!session?.user) {
      const { allUser } = await createTemporaryUserBase("inviter");
      // Create a mock session for the temporary user
      session = {
        user: {
          id: allUser.id,
          businessUserId: undefined, // Marks as temporary user
        },
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
      };
    }

    // Determine user type based on session
    // If user has businessUserId, they're a permanent user, otherwise temporary
    const userType: UserType = session.user.businessUserId ? "user" : "temporary";

    console.log("demo.chat POST", { id, selectedChatModel });
    console.log("demo.chat session", {
      userId: session.user.id,
      businessUserId: session.user.businessUserId ?? null,
      userType,
    });

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    console.log("demo.chat messageCount24h", messageCount);
    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return new ChatSDKError("rate_limit:chat").toResponse();
    }

    const chat = await getChatById({ id });
    console.log("demo.chat chat", chat ? { exists: true, chatUserId: chat.userId } : { exists: false });

    if (!chat) {
      let title: string;

      if (USE_AI_TITLES) {
        // Use AI-generated title (requires credit card on Vercel account)
        try {
          title = await generateTitleFromUserMessage({ message });
        } catch (error) {
          console.warn("Failed to generate AI title, falling back to simple title:", error);
          // Fallback to simple title if AI generation fails
          const firstTextPart = message.parts.find((part) => part.type === "text");
          title = firstTextPart
            ? firstTextPart.text.slice(0, 50) + (firstTextPart.text.length > 50 ? "..." : "")
            : `Chat ${new Date().toLocaleDateString()}`;
        }
      } else {
        // Use simple text-based title (no credit card required)
        const firstTextPart = message.parts.find((part) => part.type === "text");
        title = firstTextPart
          ? firstTextPart.text.slice(0, 50) + (firstTextPart.text.length > 50 ? "..." : "")
          : `Chat ${new Date().toLocaleDateString()}`;
      }

      await saveChat({
        id,
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType,
      });
    } else {
      if (chat.userId !== session.user.id) {
        console.warn("demo.chat forbidden", { chatUserId: chat.userId, sessionUserId: session.user.id });
        return new ChatSDKError("forbidden:chat").toResponse();
      }
    }

    const messagesFromDb = await getMessagesByChatId({ id });
    const uiMessages = [...convertToUIMessages(messagesFromDb), message];

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    console.log("demo.chat saveMessages", { chatId: id, messageId: message.id });
    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: "user",
          parts: message.parts,
          attachments: [],
          createdAt: new Date(),
        },
      ],
    });

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });
    console.log("demo.chat streamId", streamId);

    let finalUsage: LanguageModelUsage | undefined;

    // Get the provider based on the selected model
    const model = pickModel(selectedChatModel);
    const provider = getProviderForModel(selectedChatModel);
    console.log("demo.chat provider", { provider: provider.name, providerModelId: model.providerModelId });

    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        // Convert UI messages to provider format with system prompt
        const providerMessages = [
          { role: "system" as const, content: systemPrompt({ selectedChatModel, requestHints }) },
          ...uiMessages.map((msg) => ({
            role: msg.role as "system" | "user" | "assistant",
            content: msg.parts.find((p) => p.type === "text")?.text || "",
          })),
        ];

        // Use provider-specific streaming
        if (provider.name === "theta" && model.kind === "completion") {
          // Handle completion models (dream interpretation)
          try {
            const { text } = await thetaCompletionsAsChat({
              model: model.providerModelId,
              messages: providerMessages,
              maxTokens: 300,
              temperature: 0.7,
              topP: 0.9,
            });

            const messageId = generateUUID();
            const textId = generateUUID();
            dataStream.write({ type: "start", messageId });
            dataStream.write({ type: "text-start", id: textId });
            dataStream.write({ type: "text-delta", id: textId, delta: text || "(no text returned)" });
            dataStream.write({ type: "text-end", id: textId });
            dataStream.write({ type: "finish" });
          } catch (err) {
            console.error("demo.chat theta completions error", err);
            const messageId = generateUUID();
            const textId = generateUUID();
            dataStream.write({ type: "start", messageId });
            dataStream.write({ type: "text-start", id: textId });
            dataStream.write({
              type: "text-delta",
              id: textId,
              delta: `Theta /v1/completions failed: ${err instanceof Error ? err.message : String(err)}`,
            });
            dataStream.write({ type: "text-end", id: textId });
            dataStream.write({ type: "finish" });
          }
          return;
        } else if (provider.name === "theta") {
          // Handle chat/reasoning models (existing logic)
          try {
            // 1) Call Theta provider (returns AsyncGenerator)
            const generator = await provider.chat({
              model: model.providerModelId,
              messages: providerMessages,
              stream: false,
              temperature: 0.5,
              topP: 0.9,
            });

            // 2) Process the generator chunks
            const messageId = generateUUID();
            const textId = generateUUID();
            let hasStarted = false;
            let fullText = "";

            for await (const chunk of generator as AsyncGenerator<{ type: string; data?: string }, unknown, unknown>) {
              if (chunk.type === "delta" && chunk.data) {
                if (!hasStarted) {
                  dataStream.write({ type: "start", messageId });
                  dataStream.write({ type: "text-start", id: textId });
                  hasStarted = true;
                }

                const clean = extractUserFacingText(chunk.data);
                fullText += clean;
                dataStream.write({ type: "text-delta", id: textId, delta: clean });
              }
            }

            if (hasStarted) {
              dataStream.write({ type: "text-end", id: textId });
              console.log("demo.chat theta extracted text:", fullText.slice(0, 80));
            } else {
              // No delta chunks received, emit empty response
              dataStream.write({ type: "start", messageId });
              dataStream.write({ type: "text-start", id: textId });
              dataStream.write({ type: "text-delta", id: textId, delta: "(no text returned)" });
              dataStream.write({ type: "text-end", id: textId });
            }
          } catch (err) {
            console.error("demo.chat theta error", err);

            const messageId = generateUUID();
            const textId = generateUUID();
            dataStream.write({ type: "start", messageId });
            dataStream.write({ type: "text-start", id: textId });
            dataStream.write({
              type: "text-delta",
              id: textId,
              delta: "Theta request failed. " + (err instanceof Error ? err.message : String(err)),
            });
            dataStream.write({ type: "text-end", id: textId });
            dataStream.write({ type: "error", errorText: err instanceof Error ? err.message : String(err) });
          } finally {
            dataStream.write({ type: "finish" });
          }
          return;
        } else {
          // For Vercel, use existing AI SDK
          const result = streamText({
            model: myProvider.languageModel(selectedChatModel),
            system: systemPrompt({ selectedChatModel, requestHints }),
            messages: convertToModelMessages(uiMessages),
            stopWhen: stepCountIs(5),
            experimental_activeTools:
              selectedChatModel === "chat-model-reasoning"
                ? []
                : ["getWeather", "createDocument", "updateDocument", "requestSuggestions"],
            experimental_transform: smoothStream({ chunking: "word" }),
            tools: {
              getWeather,
              createDocument: createDocument({ session, dataStream }),
              updateDocument: updateDocument({ session, dataStream }),
              requestSuggestions: requestSuggestions({
                session,
                dataStream,
              }),
            },
            experimental_telemetry: {
              isEnabled: isProductionEnvironment,
              functionId: "stream-text",
            },
            onFinish: ({ usage }) => {
              finalUsage = usage;
              dataStream.write({ type: "data-usage", data: usage });
            },
          });

          result.consumeStream();

          dataStream.merge(
            result.toUIMessageStream({
              sendReasoning: true,
            })
          );
        }
      },
      generateId: generateUUID,
      onFinish: async ({ messages }: { messages: unknown[] }) => {
        await saveMessages({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          messages: messages.map((message: any) => ({
            id: message.id,
            role: message.role,
            parts: message.parts,
            createdAt: new Date(),
            attachments: [],
            chatId: id,
          })),
        });

        if (finalUsage) {
          try {
            await updateChatLastContextById({
              chatId: id,
              context: finalUsage,
            });
          } catch (err) {
            console.warn("Unable to persist last usage for chat", id, err);
          }
        }
      },
      onError: () => {
        return "Oops, an error occurred!";
      },
    });

    const streamContext = getStreamContext();

    const headers = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "x-vercel-ai-ui-message-stream": "v1",
    };

    if (streamContext) {
      return new Response(
        await streamContext.resumableStream(streamId, () => stream.pipeThrough(new JsonToSseTransformStream())),
        { headers }
      );
    } else {
      return new Response(stream.pipeThrough(new JsonToSseTransformStream()), { headers });
    }
  } catch (error) {
    if (error instanceof ChatSDKError) {
      return error.toResponse();
    }

    console.error("demo.chat unhandled error", error);
    return new ChatSDKError("offline:chat").toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatSDKError("bad_request:api").toResponse();
  }

  let session = await auth();

  // If no session, create a temporary user for demo mode
  if (!session?.user) {
    const { allUser } = await createTemporaryUserBase("inviter");
    session = {
      user: {
        id: allUser.id,
        businessUserId: undefined,
      },
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    };
  }

  const chat = await getChatById({ id });

  if (chat?.userId !== session.user.id) {
    return new ChatSDKError("forbidden:chat").toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
