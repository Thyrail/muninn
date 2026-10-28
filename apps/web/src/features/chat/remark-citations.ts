import { splitCitationSegments } from '@muninn/shared';
import type { Nodes, PhrasingContent, Root } from 'mdast';

/**
 * Remark plugin that turns `[1, 2]` markers in text nodes into `<sup data-cite="1,2">`
 * elements, rendered as citation badges. Code spans and blocks are separate node types,
 * so markers inside code stay literal.
 */
export function remarkCitations() {
  return (tree: Root) => {
    transform(tree);
  };
}

function transform(node: Nodes): void {
  if (!('children' in node)) return;
  const children: Nodes[] = [];
  for (const child of node.children as Nodes[]) {
    if (child.type === 'text') children.push(...splitText(child.value));
    else {
      transform(child);
      children.push(child);
    }
  }
  (node as { children: Nodes[] }).children = children;
}

function splitText(value: string): PhrasingContent[] {
  return splitCitationSegments(value).map((segment): PhrasingContent => {
    if (segment.type === 'text') return { type: 'text', value: segment.text };
    return {
      type: 'emphasis',
      children: [],
      data: { hName: 'sup', hProperties: { dataCite: segment.numbers.join(',') } },
    };
  });
}
