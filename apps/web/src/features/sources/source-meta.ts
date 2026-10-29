import type { SourceDto, SourceType } from '@muninn/shared';
import { FileTextIcon, GlobeIcon, PlayIcon, TextIcon } from 'lucide-react';
import { formatCount } from '@/lib/format';

export const SOURCE_TYPE_ICONS: Record<SourceType, typeof FileTextIcon> = {
  PDF: FileTextIcon,
  URL: GlobeIcon,
  TEXT: TextIcon,
  YOUTUBE: PlayIcon,
};

/** Short secondary line for a source: page count for PDFs, host name for web pages. */
export function sourceMeta(source: SourceDto): string | null {
  if (source.type === 'PDF' && source.pageCount) {
    return formatCount(source.pageCount, 'Seite', 'Seiten');
  }
  if (source.type === 'URL' && source.originalUrl) return new URL(source.originalUrl).hostname;
  return null;
}
