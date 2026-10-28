'use client';

import type { CitationDto } from '@muninn/shared';
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CitationBadge } from './citation-badge';
import { remarkCitations } from './remark-citations';

const REMARK_PLUGINS = [remarkGfm, remarkCitations];

/** Hides a citation marker that is still being streamed, e.g. a trailing `[1`. */
function withoutPartialMarker(text: string): string {
  return text.replace(/\[[\d,;\s]*$/, '');
}

export function MessageContent({
  text,
  citations,
  streaming,
}: {
  text: string;
  citations: CitationDto[];
  streaming: boolean;
}) {
  const byNumber = new Map(citations.map((citation) => [citation.n, citation]));

  const components: Components = {
    sup: ({ node, ...props }) => {
      const cite = node?.properties?.dataCite;
      if (typeof cite !== 'string') return <sup {...props} />;
      // Numbers without a known passage are invalid citations and are not shown.
      const known = cite.split(',').flatMap((n) => byNumber.get(Number(n)) ?? []);
      return (
        <>
          {known.map((citation) => (
            <CitationBadge key={citation.n} citation={citation} />
          ))}
        </>
      );
    },
    a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
  };

  return (
    <div className="text-[0.95rem] leading-relaxed [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:text-[0.85em] [&_h1]:mt-4 [&_h1]:font-medium [&_h2]:mt-4 [&_h2]:font-medium [&_h3]:mt-3 [&_h3]:font-medium [&_li]:my-1 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_strong]:font-semibold [&_table]:my-3 [&_table]:text-sm [&_td]:border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:px-2 [&_th]:py-1 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <Markdown remarkPlugins={REMARK_PLUGINS} components={components}>
        {streaming ? withoutPartialMarker(text) : text}
      </Markdown>
    </div>
  );
}
