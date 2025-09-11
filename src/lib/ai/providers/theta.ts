import { ChatProvider, StreamChunk } from "../providers";

const DEEPSEEK_BASE = process.env.THETA_CLOUD_BASE_URL ?? "https://ondemand.thetaedgecloud.com";
const LLAMA_BASE =
  process.env.THETA_LLAMA_BASE_URL ?? "https://llama3170b2oczc2osyg-07554694ea35fad5.tec-s20.onthetaedgecloud.com/v1";
const THETA_COMPLETIONS_BASE =
  process.env.THETA_COMPLETIONS_BASE_URL ??
  "https://gpunoderunvqeffmrgv7-3960575ead1a184d.tec-s20.onthetaedgecloud.com/v1";
const TOKEN = process.env.THETA_CLOUD_API_TOKEN!;
const FORCE_NON_STREAM = process.env.THETA_FORCE_NON_STREAM?.toString() !== "0"; // default ON

// Helper to get the correct endpoint based on model
function getEndpointForModel(model: string): { baseUrl: string; endpoint: string; requestFormat: "openai" | "theta" } {
  if (model.includes("llama") || model.includes("Llama")) {
    return { baseUrl: LLAMA_BASE, endpoint: "/chat/completions", requestFormat: "openai" };
  } else {
    return {
      baseUrl: DEEPSEEK_BASE,
      endpoint: `/infer_request/${encodeURIComponent(model)}/completions`,
      requestFormat: "theta",
    };
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pick<T = any>(o: any, path: string): T | undefined {
  return path.split(".").reduce((v, k) => v?.[k] ?? undefined, o);
}

// For non-stream and final objects
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractThetaText(obj: any): string {
  // Standard OpenAI format: response.choices[0].message.content
  const choice = obj?.choices?.[0];
  if (choice?.message?.content) return choice.message.content;

  // Theta on-demand common shape seen in your logs:
  // { status: "success", body: { infer_requests: [ { output: { message, reasoning? ... } } ] } }
  const out = pick(obj, "body.infer_requests.0.output");
  if (out) {
    // message may be string or array of segments
    if (typeof out.message === "string") return out.message;
    if (Array.isArray(out.message)) return out.message.join("");
    // sometimes providers use "content"/"completion"/"text"
    if (typeof out.content === "string") return out.content;
    if (typeof out.completion === "string") return out.completion;
    if (typeof out.text === "string") return out.text;
  }

  // Generic fallbacks (other vendors / future Theta changes)
  return (
    obj?.output_text ??
    obj?.text ??
    obj?.content ??
    obj?.message?.content ??
    obj?.choices?.[0]?.message?.content ??
    obj?.choices?.[0]?.text ??
    obj?.data?.output_text ??
    ""
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractThetaReasoning(obj: any): string {
  // Prefer explicit reasoning if present
  const out = pick(obj, "body.infer_requests.0.output");
  if (out?.reasoning) {
    if (typeof out.reasoning === "string") return out.reasoning;
    if (Array.isArray(out.reasoning)) return out.reasoning.join("");
  }
  // Other potential locations
  return obj?.reasoning ?? obj?.choices?.[0]?.delta?.reasoning ?? obj?.data?.reasoning ?? "";
}

// For streamed chunks (payload per SSE/JSONL "data:" line)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractThetaDeltaFromChunk(obj: any): string {
  // If Theta streams tokens as { token: "t" } or { data: { token: "t" } }
  if (typeof obj?.token === "string") return obj.token;
  if (typeof obj?.data?.token === "string") return obj.data.token;

  // If they send partial content in choices/delta
  const c = obj?.choices?.[0];
  if (typeof c?.delta?.content === "string") return c.delta.content;
  if (typeof c?.text === "string") return c.text;

  // Some vendors send full message objects each event — fall back to non-stream extractor
  const text = extractThetaText(obj);
  if (text) return text;

  return "";
}

export const ThetaProvider: ChatProvider = {
  name: "theta",
  async chat({ model, messages, /*stream,*/ maxTokens, temperature, topP, signal }) {
    const { baseUrl, endpoint, requestFormat } = getEndpointForModel(model);

    // Build request body based on endpoint format
    const body =
      requestFormat === "openai"
        ? {
            model,
            messages,
            max_tokens: maxTokens ?? 1024,
            temperature: temperature ?? 0.5,
            top_p: topP ?? 0.9,
            stream: FORCE_NON_STREAM ? false : true,
          }
        : {
            input: {
              messages,
              max_tokens: maxTokens ?? 1024,
              temperature: temperature ?? 0.5,
              top_p: topP ?? 0.9,
              stream: FORCE_NON_STREAM ? false : true,
            },
          };

    const res = await fetch(`${baseUrl}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify(body),
      signal,
    });

    // Non-stream path: convert single JSON into generator {delta, final}
    if (FORCE_NON_STREAM) {
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Theta non-stream error ${res.status}: ${body}`);
      }
      const json = await res.json().catch(() => ({}));
      const text = extractThetaText(json) || JSON.stringify(json); // stringify only as last resort
      async function* gen(): AsyncGenerator<StreamChunk> {
        if (text) yield { type: "delta", data: text };
        const reasoning = extractThetaReasoning(json);
        if (reasoning) yield { type: "reasoning", data: reasoning };
        yield { type: "final", data: "" };
      }
      return gen();
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error("Theta: no response body");

    let sawDelta = false;
    let buffer = "";
    const contentType = res.headers.get("content-type") || "";

    async function* gen(): AsyncGenerator<StreamChunk> {
      while (true) {
        const { value, done } = await reader!.read();
        if (done) break;
        buffer += new TextDecoder().decode(value, { stream: true });

        if (contentType.includes("text/event-stream")) {
          const blocks = buffer.split("\n\n");
          buffer = blocks.pop() || "";
          for (const b of blocks) {
            for (const line of b.split("\n")) {
              const s = line.trim();
              if (!s.startsWith("data:")) continue;
              const payload = s.slice(5).trim();
              if (!payload || payload === "[DONE]") continue;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              let obj: any;
              try {
                obj = JSON.parse(payload);
              } catch {
                continue;
              }

              const delta = extractThetaDeltaFromChunk(obj);
              if (delta) {
                sawDelta = true;
                yield { type: "delta", data: delta };
              }

              const reasoning = extractThetaReasoning(obj);
              if (reasoning) yield { type: "reasoning", data: reasoning };

              const isFinal =
                obj?.done === true ||
                obj?.choices?.[0]?.finish_reason ||
                obj?.event === "completed" ||
                obj?.type === "final";
              if (isFinal) yield { type: "final", data: "" };
            }
          }
        } else {
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const s = line.trim();
            if (!s) continue;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let obj: any;
            try {
              obj = JSON.parse(s);
            } catch {
              continue;
            }

            const delta = extractThetaDeltaFromChunk(obj);
            if (delta) {
              sawDelta = true;
              yield { type: "delta", data: delta };
            }

            const reasoning = extractThetaReasoning(obj);
            if (reasoning) yield { type: "reasoning", data: reasoning };

            const isFinal =
              obj?.done === true ||
              obj?.choices?.[0]?.finish_reason ||
              obj?.event === "completed" ||
              obj?.type === "final";
            if (isFinal) yield { type: "final", data: "" };
          }
        }
      }

      if (!sawDelta && buffer.trim()) {
        try {
          const obj = JSON.parse(buffer.trim());
          const text = extractThetaText(obj);
          if (text) yield { type: "delta", data: text };
          const reasoning = extractThetaReasoning(obj);
          if (reasoning) yield { type: "reasoning", data: reasoning };
        } catch {}
      }
      yield { type: "final", data: "" };
    }

    return gen();
  },
};

// New: OpenAI-style completions types and functions
type ThetaCompletionReq = {
  model: string;
  prompt: string;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
};

type ThetaCompletionRes = {
  id?: string;
  model?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  choices: Array<{ text: string; index: number; logprobs?: any; finish_reason?: string }>;
};

// OpenAI-style completions call
export async function thetaCompletions(req: ThetaCompletionReq): Promise<ThetaCompletionRes> {
  const url = `${THETA_COMPLETIONS_BASE}/completions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // No authentication required for this endpoint
    },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Theta completions error ${res.status}: ${body}`);
  }
  return (await res.json()) as ThetaCompletionRes;
}

// Helper to get models list from the box
export async function thetaCompletionsModels(): Promise<string[]> {
  const url = `${THETA_COMPLETIONS_BASE}/models`;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      // No authentication required for this endpoint
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Theta /v1/models error ${res.status}: ${body}`);
  }
  const json = (await res.json()) as { data?: Array<{ id: string }> } | Array<{ id: string }>;
  const list = Array.isArray(json) ? json : json.data ?? [];
  return list.map((m) => m.id);
}

// Wrapper to present /v1/completions as "chat" for the UI
export async function thetaCompletionsAsChat({
  model,
  messages,
  maxTokens = 512,
  temperature = 0.7,
  topP = 0.9,
}: {
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}) {
  // Simple prompt synthesis: take the latest user turn + optional system preface.
  const sys = messages.find((m) => m.role === "system")?.content?.trim();
  const lastUser =
    [...messages]
      .reverse()
      .find((m) => m.role === "user")
      ?.content?.trim() ?? "";
  const prompt = sys ? `${sys}\n\nUser: ${lastUser}\nAssistant:` : lastUser;

  const json = await thetaCompletions({
    model,
    prompt,
    max_tokens: maxTokens,
    temperature,
    top_p: topP,
    stream: false,
  });

  const text = json.choices?.[0]?.text ?? "";
  return { text };
}
