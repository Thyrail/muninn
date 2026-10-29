'use client';

import { useChat } from '@ai-sdk/react';
import type { ChatMessageDto, SourceDto } from '@muninn/shared';
import { DefaultChatTransport } from 'ai';
import {
  BookOpenTextIcon,
  EllipsisIcon,
  LoaderCircleIcon,
  RotateCwIcon,
  Trash2Icon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { apiFetch, errorText } from '@/lib/api-client';
import { ChatComposer } from './chat-composer';
import { MessageContent } from './message-content';
import {
  chatErrorText,
  messageCitations,
  messageText,
  toUIMessage,
  type ChatUIMessage,
} from './messages';

/** Distance from the bottom (px) within which new content keeps the view pinned. */
const STICK_THRESHOLD = 80;

export function ChatPanel({
  notebookId,
  sources,
  selectedIds,
  initialMessages,
}: {
  notebookId: string;
  sources: SourceDto[];
  selectedIds: string[];
  initialMessages: ChatMessageDto[];
}) {
  const [transport] = useState(
    () =>
      new DefaultChatTransport<ChatUIMessage>({
        api: `/api/notebooks/${notebookId}/chat`,
        credentials: 'same-origin',
        // The server keeps the history; send only the question and the selected sources,
        // which every send passes as request body.
        prepareSendMessagesRequest: ({ messages, body }) => {
          const question = messages.findLast((message) => message.role === 'user');
          return { body: { ...body, text: question ? messageText(question) : '' } };
        },
      }),
  );

  const { messages, sendMessage, regenerate, status, stop, error, setMessages, clearError } =
    useChat<ChatUIMessage>({
      id: notebookId,
      messages: initialMessages.map(toUIMessage),
      transport,
      onError: (failure) => toast.error(chatErrorText(failure)),
    });

  const busy = status === 'submitted' || status === 'streaming';
  const [confirmClear, setConfirmClear] = useState(false);

  // Keep the newest message in view unless the user scrolled up to read.
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  useEffect(() => {
    const element = scrollRef.current;
    if (element && stickRef.current) element.scrollTop = element.scrollHeight;
  }, [messages, status]);

  const readyCount = sources.filter((source) => source.status === 'READY').length;
  const disabledReason =
    sources.length === 0
      ? 'Füge zuerst eine Quelle hinzu.'
      : readyCount === 0
        ? 'Deine Quellen werden noch verarbeitet.'
        : selectedIds.length === 0
          ? 'Wähle mindestens eine Quelle aus.'
          : null;

  function send(text: string) {
    stickRef.current = true;
    clearError();
    void sendMessage({ text }, { body: { sourceIds: selectedIds } });
  }

  async function clearHistory() {
    try {
      await apiFetch<void>(`/notebooks/${notebookId}/messages`, { method: 'DELETE' });
      setMessages([]);
    } catch (failure) {
      toast.error(errorText(failure));
    }
  }

  const last = messages.at(-1);
  const waitingForAnswer = status === 'submitted' && last?.role === 'user';

  return (
    <section
      aria-labelledby="chat-heading"
      className="flex h-full min-h-0 flex-col rounded-xl border bg-card/40"
    >
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <h2 id="chat-heading" className="font-heading text-lg font-medium">
          Chat
        </h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Chat-Optionen"
              disabled={messages.length === 0 || busy}
            >
              <EllipsisIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem variant="destructive" onSelect={() => setConfirmClear(true)}>
              <Trash2Icon />
              Verlauf löschen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div
        ref={scrollRef}
        onScroll={(event) => {
          const element = event.currentTarget;
          stickRef.current =
            element.scrollHeight - element.scrollTop - element.clientHeight < STICK_THRESHOLD;
        }}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
        aria-live="polite"
        aria-busy={busy}
      >
        {messages.length === 0 ? (
          <EmptyState ready={readyCount > 0} />
        ) : (
          <ol className="mx-auto flex max-w-3xl flex-col gap-5">
            {messages.map((message) => (
              <li key={message.id} className={message.role === 'user' ? 'flex justify-end' : ''}>
                {message.role === 'user' ? (
                  <p className="max-w-[85%] rounded-2xl rounded-br-md bg-secondary px-4 py-2.5 text-[0.95rem] whitespace-pre-wrap">
                    {messageText(message)}
                  </p>
                ) : (
                  <MessageContent
                    text={messageText(message)}
                    citations={messageCitations(message)}
                    streaming={status === 'streaming' && message.id === last?.id}
                  />
                )}
              </li>
            ))}
            {waitingForAnswer && (
              <li className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircleIcon className="size-4 animate-spin" aria-hidden />
                Muninn sucht in deinen Quellen …
              </li>
            )}
            {error && !busy && (
              <li className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
                <span className="flex-1">{chatErrorText(error)}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!!disabledReason}
                  onClick={() => {
                    clearError();
                    void regenerate({ body: { sourceIds: selectedIds } });
                  }}
                >
                  <RotateCwIcon />
                  Erneut senden
                </Button>
              </li>
            )}
          </ol>
        )}
      </div>

      <ChatComposer
        disabledReason={disabledReason}
        busy={busy}
        onSend={send}
        onStop={() => void stop()}
      />

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Verlauf löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Alle Fragen und Antworten in diesem Notebook werden entfernt. Deine Quellen bleiben
              erhalten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void clearHistory()}>
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function EmptyState({ ready }: { ready: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <BookOpenTextIcon className="size-8 text-muted-foreground" aria-hidden />
      <p className="mt-4 font-medium">Fragen an deine Quellen</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {ready
          ? 'Stell eine Frage. Muninn antwortet nur aus den ausgewählten Quellen und belegt jede Aussage mit einer Fundstelle.'
          : 'Sobald deine Quellen bereit sind, kannst du hier Fragen stellen.'}
      </p>
    </div>
  );
}
