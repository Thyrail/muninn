import type { GoogleSpeechModelOptions } from '@ai-sdk/google';
import type { PodcastSpeaker, PodcastTurn } from '@muninn/shared';
import { generateSpeech, type SpeechModel } from 'ai';

/** Speaker names as written in the TTS input; they must match the voice config. */
export const SPEAKER_NAMES: Record<PodcastSpeaker, string> = { HUGIN: 'Hugin', MUNIN: 'Munin' };

/** Gemini returns 16-bit mono PCM at 24 kHz unless it reports otherwise. */
const DEFAULT_SAMPLE_RATE = 24_000;
const BYTES_PER_SAMPLE = 2;

/** Delivery per host (structured speech on Gemini 3.8+). */
const SPEAKER_STYLES: Record<PodcastSpeaker, string> = {
  HUGIN: 'Neugierig, lebhaft und voller Energie, wie ein begeisterter Podcast-Host',
  MUNIN: 'Ruhig, warm und erklärend, wie eine kundige Expertin im Gespräch',
};

/** Style direction for older TTS models, which read `Name: text` transcripts. */
const STYLE_PREFIX =
  'Lies den folgenden deutschen Podcast-Dialog zwischen Hugin und Munin lebendig und natürlich vor:';

/** Gemini 2.5 and 3.1 TTS only understand plain transcripts; later models take turns. */
export function usesStructuredSpeech(modelId: string): boolean {
  return !modelId.startsWith('gemini-2.5-') && !modelId.startsWith('gemini-3.1-');
}

/**
 * Splits the script into consecutive segments of at most `maxChars` characters, only at
 * turn boundaries. A single overlong turn becomes its own segment.
 */
export function splitScript(turns: PodcastTurn[], maxChars: number): PodcastTurn[][] {
  const segments: PodcastTurn[][] = [];
  let current: PodcastTurn[] = [];
  let length = 0;
  for (const turn of turns) {
    const turnLength = formatTurn(turn).length + 1;
    if (current.length > 0 && length + turnLength > maxChars) {
      segments.push(current);
      current = [];
      length = 0;
    }
    current.push(turn);
    length += turnLength;
  }
  if (current.length > 0) segments.push(current);
  return segments;
}

function formatTurn(turn: PodcastTurn): string {
  return `${SPEAKER_NAMES[turn.speaker]}: ${turn.text}`;
}

/** Transcript input for older models: a style direction followed by `Name: text` lines. */
export function segmentText(turns: PodcastTurn[]): string {
  return `${STYLE_PREFIX}\n${turns.map(formatTurn).join('\n')}`;
}

/** Structured speech turns with speaker and delivery per host. */
export function speechTurns(turns: PodcastTurn[]) {
  return turns.map((turn) => ({
    text: turn.text,
    speechMetadata: { speaker: SPEAKER_NAMES[turn.speaker], style: SPEAKER_STYLES[turn.speaker] },
  }));
}

export function pcmDurationSec(byteLength: number, sampleRate: number): number {
  return Math.round(byteLength / BYTES_PER_SAMPLE / sampleRate);
}

export interface PcmAudio {
  pcm: Uint8Array;
  sampleRate: number;
}

/**
 * Synthesizes the dialogue with Gemini multi-speaker TTS, one request per segment in order
 * (sequential, so both voices stay consistent and the API rate limits hold).
 */
export async function synthesizeDialogue(
  model: SpeechModel,
  voices: { hugin: string; munin: string },
  segments: PodcastTurn[][],
): Promise<PcmAudio> {
  const parts: Uint8Array[] = [];
  let sampleRate = DEFAULT_SAMPLE_RATE;
  const structured = usesStructuredSpeech(typeof model === 'string' ? model : model.modelId);
  for (const segment of segments) {
    const result = await generateSpeech({
      model,
      // With turns, the provider builds the transcript from them.
      text: structured ? '' : segmentText(segment),
      outputFormat: 'pcm',
      maxRetries: 3,
      providerOptions: {
        google: {
          ...(structured ? { turns: speechTurns(segment) } : {}),
          multiSpeakerVoiceConfig: {
            speakerVoiceConfigs: [
              {
                speaker: SPEAKER_NAMES.HUGIN,
                voiceConfig: { prebuiltVoiceConfig: { voiceName: voices.hugin } },
              },
              {
                speaker: SPEAKER_NAMES.MUNIN,
                voiceConfig: { prebuiltVoiceConfig: { voiceName: voices.munin } },
              },
            ],
          },
        } satisfies GoogleSpeechModelOptions,
      },
    });
    const reported = result.providerMetadata.google?.sampleRate;
    if (typeof reported === 'number') sampleRate = reported;
    parts.push(result.audio.uint8Array);
  }
  return { pcm: concatBytes(parts), sampleRate };
}

export function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}
