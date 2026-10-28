/** Escapes a value for an attribute of the XML-like blocks used in prompts. */
export function escapeAttribute(value: string): string {
  return value.replace(/[<>"&]/g, (char) => `&#${char.charCodeAt(0)};`);
}

/**
 * Neutralizes opening and closing tags named `tag` inside untrusted content, so the content
 * cannot end its surrounding block and pose as instructions (prompt injection).
 */
export function neutralizeTag(content: string, tag: string): string {
  return content.replace(new RegExp(`<(/?\\s*${tag})`, 'gi'), '&lt;$1');
}
