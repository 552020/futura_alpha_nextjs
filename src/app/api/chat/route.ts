import { openai } from '@ai-sdk/openai';
import { convertToModelMessages, streamText, UIMessage } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
    const { messages }: { messages: UIMessage[] } = await req.json();

    const result = streamText({
        model: openai('gpt-5-mini'),
        system: 'You are Transcendance AI, a helpful assistant designed to interview users and provide insightful conversations. You are knowledgeable, empathetic, and ask thoughtful follow-up questions to understand the user better.',
        messages: convertToModelMessages(messages),
    });

    return result.toUIMessageStreamResponse();
}