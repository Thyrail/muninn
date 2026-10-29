import { type PodcastScript, podcastScriptSchema } from '@muninn/shared';

/** The stored dialogue of an audio overview, or null if it is missing or malformed. */
export function parsePodcastScript(content: string | null): PodcastScript | null {
  if (!content) return null;
  try {
    const result = podcastScriptSchema.safeParse(JSON.parse(content));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/** "6:05" for 365 seconds. */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
