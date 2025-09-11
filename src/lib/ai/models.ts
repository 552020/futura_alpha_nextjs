export const DEFAULT_CHAT_MODEL: string = "llama-3.1-70b";

export interface ChatModel {
  id: string;
  name: string;
  description: string;
}

// Unified model interface for provider abstraction
export type UiModel = {
  id: string; // ui id, stable across providers
  label: string;
  provider: "theta" | "vercel";
  providerModelId: string;
  kind: "reasoning" | "chat";
  default?: boolean;
};

export const MODELS: UiModel[] = [
  {
    id: "llama-3.1-70b",
    label: "Llama 3.1 70B (Theta)",
    provider: "theta",
    providerModelId: "meta-llama/Llama-3.1-70B-Instruct",
    kind: "chat",
    default: true,
  },
  {
    id: "deepseek-r1",
    label: "DeepSeek R1 (Theta)",
    provider: "theta",
    providerModelId: "deepseek_r1",
    kind: "reasoning",
  },
  { id: "chat-model", label: "Grok Vision (Vercel)", provider: "vercel", providerModelId: "chat-model", kind: "chat" },
  {
    id: "chat-model-reasoning",
    label: "Grok Reasoning (Vercel)",
    provider: "vercel",
    providerModelId: "chat-model-reasoning",
    kind: "reasoning",
  },
];

export function pickModel(uiId?: string, providerName?: "theta" | "vercel") {
  console.log("🗺️ Model Mapping Debug:");
  console.log("UI Model ID:", uiId);
  console.log("Provider filter:", providerName);

  const list = MODELS.filter((m) => !providerName || m.provider === providerName);
  console.log("Filtered model list:", list);

  const found = list.find((m) => m.id === uiId) ?? list.find((m) => m.default) ?? list[0];
  console.log("Found model:", found);

  if (!found) {
    console.error("❌ No model found:", { uiId, providerName, availableModels: list });
    throw new Error(`No model found for ${uiId} with provider ${providerName}`);
  }
  return found;
}

export const chatModels: Array<ChatModel> = [
  {
    id: "chat-model",
    name: "Grok Vision",
    description: "Advanced multimodal model with vision and text capabilities",
  },
  {
    id: "chat-model-reasoning",
    name: "Grok Reasoning",
    description: "Uses advanced chain-of-thought reasoning for complex problems",
  },
];
