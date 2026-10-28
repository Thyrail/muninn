import {
  CITATIONS_DATA_PART,
  type ChatMessageDto,
  type CitationDto,
  type CitationsData,
} from '@muninn/shared';
import type { UIMessage } from 'ai';

/** UI message as streamed by `POST /api/notebooks/:id/chat`. */
export type ChatUIMessage = UIMessage<never, { [CITATIONS_DATA_PART]: CitationsData }>;

/** Converts a stored message into the shape `useChat` works with. */
export function toUIMessage(message: ChatMessageDto): ChatUIMessage {
  if (message.role === 'USER') {
    return { id: message.id, role: 'user', parts: [{ type: 'text', text: message.content }] };
  }
  return {
    id: message.id,
    role: 'assistant',
    parts: [
      { type: 'text', text: message.content, state: 'done' },
      {
        type: `data-${CITATIONS_DATA_PART}`,
        id: CITATIONS_DATA_PART,
        data: { citations: message.citations },
      },
    ],
  };
}

export function messageText(message: ChatUIMessage): string {
  return message.parts.map((part) => (part.type === 'text' ? part.text : '')).join('');
}

export function messageCitations(message: ChatUIMessage): CitationDto[] {
  for (const part of message.parts) {
    if (part.type === `data-${CITATIONS_DATA_PART}`) return part.data.citations;
  }
  return [];
}

/**
 * The chat transport throws the raw response body for HTTP errors (our JSON error body)
 * and the stream's error text for failures while streaming. Both become a user message.
 */
export function chatErrorText(error: Error): string {
  try {
    const body = JSON.parse(error.message) as { message?: string | string[] };
    const message = Array.isArray(body.message) ? body.message[0] : body.message;
    if (message) return message.replace(/^[\w.]+: /, '');
  } catch {
    // Not JSON: an error text from the stream, already user-facing.
    if (error.message && !error.message.startsWith('<')) return error.message;
  }
  return 'Die Antwort konnte nicht erstellt werden. Bitte versuche es erneut.';
}
