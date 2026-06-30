/** Mime types the editor inserts as inline images (`![]()`) rather than links. */
const INLINE_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/avif',
]);

export const isInlineImageMime = (mime: string): boolean =>
  INLINE_IMAGE_MIME.has(mime);

/**
 * Build a Markdown link, escaping `[` and `]` so the label can't break out
 * of the link syntax (an unescaped `[` in the label, e.g. "notes[draft].txt",
 * splits the rendered output into stray literal text plus a truncated link).
 * `(` and `)` are left as-is — verified safe unescaped: Markdown renderers
 * correctly balance label-internal parens against the link's own `(url)`.
 */
export const attachmentMarkdown = (filename: string, url: string): string => {
  const label = filename.replace(/[[\]]/g, '\\$&');
  return `[${label}](${url})`;
};
