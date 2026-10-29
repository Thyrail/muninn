'use client';

import type { StudioOutputDto } from '@muninn/shared';
import { ChevronDownIcon } from 'lucide-react';
import { useMemo, useState, type SyntheticEvent } from 'react';
import { cn } from '@/lib/utils';
import { formatDuration, parsePodcastScript } from './script';

const SPEAKER_LABELS = { HUGIN: 'Hugin', MUNIN: 'Munin' } as const;

/** Only one audio overview plays at a time. */
function pauseOthers(event: SyntheticEvent<HTMLAudioElement>) {
  document.querySelectorAll('audio').forEach((audio) => {
    if (audio !== event.currentTarget) audio.pause();
  });
}

/** Player of a finished audio overview with its transcript. */
export function AudioOverview({ output }: { output: StudioOutputDto }) {
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const script = useMemo(() => parsePodcastScript(output.content), [output.content]);

  return (
    <div className="mt-2.5">
      <audio
        controls
        preload="metadata"
        src={`/api/studio/${output.id}/audio`}
        onPlay={pauseOthers}
        className="h-9 w-full dark:scheme-dark"
        aria-label="Rabenbericht abspielen"
      />
      <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        {script ? (
          <button
            type="button"
            className="flex items-center gap-1 hover:text-foreground"
            aria-expanded={transcriptOpen}
            onClick={() => setTranscriptOpen((open) => !open)}
          >
            <ChevronDownIcon
              className={cn('size-3.5 transition-transform', transcriptOpen && 'rotate-180')}
            />
            Transkript
          </button>
        ) : (
          <span />
        )}
        {output.durationSec !== null && <span>{formatDuration(output.durationSec)} Min.</span>}
      </div>
      {transcriptOpen && script && (
        <ol className="mt-2 max-h-80 space-y-2 overflow-y-auto rounded-md bg-muted/40 p-2.5 text-xs leading-relaxed">
          {script.turns.map((turn, index) => (
            <li key={index}>
              <span
                className={cn(
                  'font-semibold',
                  turn.speaker === 'HUGIN' ? 'text-primary' : 'text-foreground',
                )}
              >
                {SPEAKER_LABELS[turn.speaker]}:
              </span>{' '}
              {turn.text}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
