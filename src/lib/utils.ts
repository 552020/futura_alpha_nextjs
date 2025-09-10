import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { generateId } from "ai";
import { formatISO } from "date-fns";
import type { DBMessage } from "@/db/schema";
import type { ChatMessage, CustomUIDataTypes, ChatTools } from "@/types/ai";
import type { UIMessagePart } from "ai";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a unique UUID for database records
 * Uses the AI SDK's generateId function for consistency
 */
export function generateUUID(): string {
  return generateId();
}

/**
 * Shortens a title to a maximum length, adding ellipsis if needed
 * Ensures titles never wrap to multiple lines
 * @param title - The title to shorten
 * @param maxLength - Maximum length before truncation (default: 25)
 * @returns Shortened title with ellipsis if needed
 */
export function shortenTitle(title: string, maxLength: number = 25): string {
  if (!title || title.length <= maxLength) {
    return title;
  }

  // Always truncate at maxLength to prevent wrapping
  return title.substring(0, maxLength) + "...";
}

/**
 * Convert database messages to UI messages
 * @param messages - Array of database messages
 * @returns Array of UI messages for the chat interface
 */
export function convertToUIMessages(messages: DBMessage[]): ChatMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role as "user" | "assistant" | "system",
    parts: message.parts as UIMessagePart<CustomUIDataTypes, ChatTools>[],
    metadata: {
      createdAt: formatISO(message.createdAt),
    },
  }));
}

/**
 * Extract text content from a chat message
 * @param message - The chat message to extract text from
 * @returns The extracted text content
 */
export function getTextFromMessage(message: ChatMessage): string {
  return (
    message.parts
      ?.filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n")
      .trim() || ""
  );
}

/**
 * Sanitize text content by removing HTML tags and normalizing whitespace
 * @param text - The text to sanitize
 * @returns The sanitized text
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim();
}

/**
 * Get document timestamp by index from documents array
 * @param documents - Array of documents
 * @param index - The index to get timestamp for
 * @returns The timestamp string or empty string if not found
 */
export function getDocumentTimestampByIndex(documents: Array<{ createdAt: Date }> | undefined, index: number): string {
  if (!documents || index < 0 || index >= documents.length) {
    return "";
  }
  return documents[index].createdAt.toISOString();
}

/**
 * Fetcher function for SWR
 * @param url - The URL to fetch
 * @returns Promise with the response data
 */
export async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to fetch data");
  }
  return res.json();
}

/**
 * Fetch with error handling
 * @param url - The URL to fetch
 * @param options - Fetch options
 * @returns Promise with the response
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchWithErrorHandlers(url: any, options?: any) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
}
