'use client';

import { useState, useEffect } from 'react';
import { useAuthGuard } from '@/utils/authentication';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, User, Send, Loader2 } from 'lucide-react';
import RequireAuth from '@/components/auth/require-auth';
import { fatLogger } from '@/lib/logger';

const WELCOME_MESSAGE =
  "Hello! I'm here to help you preserve your life story for your loved ones. Think of me as your personal biographer - I'd love to learn about your experiences, memories, and the wisdom you'd like to share with future generations.\n\nWhere would you like to begin? We could talk about your childhood, your family, important moments in your life, or anything else that feels meaningful to you.";

export default function TranscendanceAIPage() {
  const { isAuthorized, isLoading } = useAuthGuard();
  const [messages, setMessages] = useState<
    Array<{ id: string; role: 'user' | 'assistant'; content: string }>
  >([]);
  const [input, setInput] = useState('');
  const [hasInitialized, setHasInitialized] = useState(false);
  const [status, setStatus] = useState<'ready' | 'loading'>('ready');

  // Add welcome message on mount
  useEffect(() => {
    if (isAuthorized && !hasInitialized && messages.length === 0) {
      setMessages([
        {
          id: 'welcome-' + Date.now(),
          role: 'assistant',
          content: WELCOME_MESSAGE,
        },
      ]);
      setHasInitialized(true);
    }
  }, [isAuthorized, hasInitialized, messages.length]);

  const quickResponses = [
    'Let me tell you about my childhood',
    "I'd like to share about my family",
    'I want to talk about my career',
    "Here are some life lessons I've learned",
    'Let me share a memorable moment',
  ];

  const handleQuickResponse = async (response: string) => {
    await sendUserMessage(response);
  };

  const sendUserMessage = async (content: string) => {
    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content,
    };

    setMessages((prev) => [...prev, userMessage]);
    setStatus('loading');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        fatLogger.error('API Error', 'fe', { errorText });
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      const assistantId = (Date.now() + 1).toString();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          assistantMessage += text;

          setMessages((prev) => {
            const withoutLast = prev.filter((m) => m.id !== assistantId);
            return [
              ...withoutLast,
              { id: assistantId, role: 'assistant', content: assistantMessage },
            ];
          });
        }
      }
    } catch (error) {
      fatLogger.error('Error sending message', 'fe', { error });
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        },
      ]);
    } finally {
      setStatus('ready');
    }
  };

  if (!isAuthorized || isLoading) {
    if (isLoading) {
      return (
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
    }
    return <RequireAuth />;
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bot className="h-8 w-8" />
            Transcendance AI
          </h1>
          <p className="text-muted-foreground mt-2">
            Your personal biographer - preserving your life story for future
            generations
          </p>
        </div>
      </div>

      <Card className="h-[70vh] flex flex-col">
        <CardContent className="flex-1 flex flex-col p-6">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {messages.map((message, idx) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  } ${idx === 0 && message.role === 'assistant' ? 'animate-in fade-in slide-in-from-left-4 duration-500' : ''}`}
                >
                  <div
                    className={`flex gap-3 max-w-[80%] ${
                      message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {message.role === 'user' ? (
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-primary-foreground" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                          <Bot className="h-4 w-4 text-secondary-foreground" />
                        </div>
                      )}
                    </div>
                    <div
                      className={`rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">
                        {message.content}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {status !== 'ready' && (
                <div className="flex gap-3 justify-start">
                  <div className="flex gap-3 max-w-[80%]">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                        <Bot className="h-4 w-4 text-secondary-foreground" />
                      </div>
                    </div>
                    <div className="rounded-lg p-3 bg-muted">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-current rounded-full animate-bounce"
                          style={{ animationDelay: '0.1s' }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-current rounded-full animate-bounce"
                          style={{ animationDelay: '0.2s' }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Quick Response Buttons */}
          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {quickResponses.map((response, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickResponse(response)}
                  disabled={status !== 'ready'}
                  className="text-xs"
                >
                  {response}
                </Button>
              ))}
            </div>
          )}

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (input.trim()) {
                const message = input;
                setInput('');
                await sendUserMessage(message);
              }
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Share your story..."
              disabled={status !== 'ready'}
              className="flex-1"
            />
            <Button
              type="submit"
              disabled={status !== 'ready' || !input?.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
