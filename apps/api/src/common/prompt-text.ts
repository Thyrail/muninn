/** Escapes a value for an attribute of the XML-like blocks used in prompts. */
export function escapeAttribute(value: string): string {
  return value.replace(/[<>"&]/g, (char) => `&#${char.charCodeAt(0)};`);
}

/** Every block name the prompts use to fence untrusted content (`source` covers `sources`). */
const PROMPT_TAGS = /<(\/?\s*(?:source|overview|document))/gi;

/**
 * Neutralizes opening and closing tags of all prompt blocks inside untrusted content, so the
 * content can neither end its own block nor open a fake one (e.g. a citable `<source>`) and
 * pose as instructions (prompt injection).
 */
export function neutralizePromptTags(content: string): string {
  return content.replace(PROMPT_TAGS, '&lt;$1');
}
