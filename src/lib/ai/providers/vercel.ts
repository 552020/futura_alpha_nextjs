import { ChatProvider, StreamChunk } from "../providers";
import { myProvider } from "../providers";

export const VercelProvider: ChatProvider = {
  name: "vercel",
  async chat({ model, messages, stream = true, maxTokens, temperature, topP }) {
    // Convert our ChatMessage format to the format expected by AI SDK
    const aiMessages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Use the existing myProvider for Vercel AI Gateway
    const languageModel = myProvider.languageModels[model];
    if (!languageModel) {
      throw new Error(`Model ${model} not found in Vercel provider`);
    }

    if (!stream) {
      // Non-streaming response
      const result = await languageModel.doGenerate({
        inputFormat: "messages",
        mode: { type: "regular" },
        prompt: aiMessages,
        maxTokens,
        temperature,
        topP,
      });

      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: result.text,
                role: "assistant",
              },
            },
          ],
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Streaming response
    async function* streamChunks(): AsyncGenerator<StreamChunk> {
      try {
        const result = await languageModel.doStream({
          inputFormat: "messages",
          mode: { type: "regular" },
          prompt: aiMessages,
          maxTokens,
          temperature,
          topP,
        });

        for await (const chunk of result.textStream) {
          yield { type: "delta", data: chunk };
        }
        yield { type: "final", data: "" };
      } catch (error) {
        yield { type: "error", data: error instanceof Error ? error.message : String(error) };
      }
    }

    return streamChunks();
  },
};
