const MENTION_RE = /\[@([^\]]+)\]\(user:([a-z0-9]+)\)/gi;

/** Extract unique user ids from stable mention markdown: [@name](user:ID) */
export function parseMentionUserIds(markdown: string, max = 20): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(MENTION_RE.source, MENTION_RE.flags);
  while ((m = re.exec(markdown)) !== null) {
    const id = m[2];
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (ids.length >= max) break;
  }
  return ids;
}

/** Rewrite `user:ID` links into app profile paths for HTML renderers. */
export function rewriteMentionLinksForHtml(markdown: string): string {
  return markdown.replace(MENTION_RE, '[@$1](/user/$2)');
}
