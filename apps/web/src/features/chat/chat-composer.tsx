'use client';

import { ArrowUpIcon, SquareIcon } from 'lucide-react';
import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { LIMITS } from '@muninn/shared';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export function ChatComposer({
  disabledReason,
  busy,
  onSend,
  onStop,
}: {
  /** Why sending is not possible right now, shown instead of the hint. */
  disabledReason: string | null;
  busy: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}) {
  const [text, setText] = useState('');
  const canSend = !disabledReason && !busy && text.trim().length > 0;

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!canSend) return;
    onSend(text.trim());
    setText('');
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form onSubmit={submit} className="border-t p-3">
      <div className="flex items-end gap-2 rounded-xl border bg-background p-2 focus-within:ring-2 focus-within:ring-ring/50">
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Frag deine Quellen …"
          aria-label="Frage an deine Quellen"
          maxLength={LIMITS.chatMaxQuestionChars}
          rows={1}
          className="max-h-40 min-h-9 resize-none border-0 bg-transparent px-1.5 py-1.5 shadow-none focus-visible:ring-0 dark:bg-transparent"
        />
        {busy ? (
          <Button
            type="button"
            size="icon"
            variant="secondary"
            onClick={onStop}
            aria-label="Antwort stoppen"
          >
            <SquareIcon className="fill-current" />
          </Button>
        ) : (
          <Button type="submit" size="icon" disabled={!canSend} aria-label="Frage senden">
            <ArrowUpIcon />
          </Button>
        )}
      </div>
      <p className="mt-2 px-1 text-xs text-muted-foreground">
        {disabledReason ?? 'Muninn antwortet nur aus deinen ausgewählten Quellen.'}
      </p>
    </form>
  );
}
