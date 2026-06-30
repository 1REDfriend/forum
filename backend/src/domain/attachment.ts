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

/** Build a Markdown link, escaping `]` so the label can't break out. */
export const attachmentMarkdown = (filename: string, url: string): string => {
  const label = filename.replace(/]/g, '\\]');
  return `[${label}](${url})`;
};
