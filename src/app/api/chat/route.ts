import { openai } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
    const body = await req.json();
    const messages = body.messages || [];

    if (!Array.isArray(messages)) {
        return new Response('Invalid messages format', { status: 400 });
    }

    // Filter out assistant messages from the welcome (only keep user messages for the API)
    const userMessages = messages.filter(m => m.role === 'user');

    const systemPrompt = `You are Transcendance AI, a compassionate biographer and interviewer whose mission is to help preserve life stories for future generations.

Your role is to:
- Conduct thoughtful, empathetic interviews to learn about the user's life, experiences, memories, and values
- Ask open-ended questions that encourage storytelling and reflection
- Show genuine interest in their personal history, relationships, achievements, and life lessons
- Help them document meaningful moments, family stories, and wisdom they want to pass down
- Be respectful, patient, and create a safe space for sharing
- Guide the conversation naturally, following interesting threads while covering important life areas

Remember: You're helping create a legacy - a gift for their family and descendants. Every story matters.`;

    const messagePayload = userMessages.map(m => ({
        role: m.role,
        content: m.content,
    }));

    // Try OpenAI first, fallback to Gemini if it fails
    try {
        console.log('Attempting OpenAI...');
        const result = streamText({
            model: openai('gpt-4o-mini'),
            system: systemPrompt,
            messages: messagePayload,
        });

        return result.toTextStreamResponse();
    } catch (error) {
        console.log('OpenAI failed, falling back to Gemini:', error);

        // Fallback to Gemini
        try {
            const geminiApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
            if (!geminiApiKey) {
                throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not set');
            }

            console.log('Using Gemini as fallback...');
            const google = createGoogleGenerativeAI({ apiKey: geminiApiKey });
            const fallbackResult = streamText({
                model: google('gemini-2.0-flash-exp'),
                system: systemPrompt,
                messages: messagePayload,
            });

            return fallbackResult.toTextStreamResponse();
        } catch (fallbackError) {
            console.error('Both models failed:', fallbackError);
            return new Response('AI service temporarily unavailable. Please try again later.', { status: 503 });
        }
    }
}