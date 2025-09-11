import { customProvider, extractReasoningMiddleware, wrapLanguageModel } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { isTestEnvironment } from "../constants";

// Provider abstraction types
export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
export type StreamChunk = { type: "delta" | "final" | "reasoning" | "error"; data: string };

export interface ChatProvider {
  name: "vercel" | "theta";
  chat(opts: {
    model: string;
    messages: ChatMessage[];
    stream?: boolean;
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    signal?: AbortSignal;
  }): Promise<Response | AsyncGenerator<StreamChunk>>;
}

export function currentProviderName() {
  return (process.env.AI_PROVIDER ?? "vercel") as "vercel" | "theta";
}

export const myProvider = isTestEnvironment
  ? (() => {
      const {
        artifactModel,
        chatModel,
        reasoningModel,
        titleModel,
        // eslint-disable-next-line @typescript-eslint/no-require-imports
      } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "chat-model-reasoning": reasoningModel,
          "title-model": titleModel,
          "artifact-model": artifactModel,
        },
      });
    })()
  : customProvider({
      languageModels: {
        "chat-model": gateway.languageModel("xai/grok-2-vision-1212"),
        "chat-model-reasoning": wrapLanguageModel({
          model: gateway.languageModel("xai/grok-3-mini"),
          middleware: extractReasoningMiddleware({ tagName: "think" }),
        }),
        "title-model": gateway.languageModel("xai/grok-2-1212"),
        "artifact-model": gateway.languageModel("xai/grok-2-1212"),
      },
    });
