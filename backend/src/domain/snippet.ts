/** First ~maxLen chars of post/thread body for activity feeds. */
export function makeSnippet(markdown: string, maxLen = 160): string {
  let t = markdown
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/[`*_~>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen).trimEnd() + '…';
}
