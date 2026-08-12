/**
 * Accept only values safe to drop into an <img src>: an absolute http(s) URL,
 * or a local upload path beginning with /uploads/. Everything else (javascript:,
 * data:, file:, relative junk) is rejected.
 */
export function isSafeMediaUrl(value: string): boolean {
  if (value.startsWith('/uploads/')) return true;
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Browser-facing CDN origin from env (e.g. https://cdn.supaxit.com).
 * Empty / unset → no host rewrite (pass stored URLs through as-is).
 */
export function cdnPublicBase(): string {
  return (process.env.CDN_PUBLIC_URL ?? '').trim().replace(/\/+$/, '');
}

/**
 * Rewrite a media URL so Axite CDN file paths use CDN_PUBLIC_URL.
 *
 * - Absolute `http(s)://any-host/files/...` → `{CDN_PUBLIC_URL}/files/...`
 * - Relative `/files/...` → `{CDN_PUBLIC_URL}/files/...`
 * - Everything else (local /uploads, non-CDN hosts without /files/) is left alone.
 *
 * If CDN_PUBLIC_URL is not set, returns the input unchanged.
 */
export function toPublicMediaUrl(value: string): string;
export function toPublicMediaUrl(value: string | null): string | null;
export function toPublicMediaUrl(value: string | undefined): string | undefined;
export function toPublicMediaUrl(value: string | null | undefined): string | null | undefined {
  if (value == null || value === '') return value;
  const base = cdnPublicBase();
  if (!base) return value;

  if (value.startsWith('/files/')) {
    return `${base}${value}`;
  }

  try {
    const u = new URL(value);
    if (u.pathname.startsWith('/files/')) {
      return `${base}${u.pathname}${u.search}${u.hash}`;
    }
  } catch {
    // not a URL — leave as-is
  }
  return value;
}

/**
 * Rewrite CDN file URLs embedded in free text (markdown post/thread bodies).
 * Only rewrites absolute http(s) URLs whose path starts with /files/.
 */
export function rewriteMediaUrlsInText(text: string): string;
export function rewriteMediaUrlsInText(text: string | null): string | null;
export function rewriteMediaUrlsInText(text: string | undefined): string | undefined;
export function rewriteMediaUrlsInText(text: string | null | undefined): string | null | undefined {
  if (text == null || text === '') return text;
  if (!cdnPublicBase()) return text;

  return text.replace(/https?:\/\/[^\s)\]"'<>]+/g, (match) => {
    // Peel trailing punctuation that often sticks to markdown links.
    let url = match;
    let trailing = '';
    while (url.length > 0 && /[.,;:!?)]$/.test(url)) {
      trailing = url.slice(-1) + trailing;
      url = url.slice(0, -1);
    }
    return toPublicMediaUrl(url) + trailing;
  });
}

/** Rewrite avatar/banner fields on an author (or user) object. */
export function mapUserMediaFields<T extends { avatar?: string | null; banner?: string | null }>(
  user: T,
): T {
  return {
    ...user,
    ...(user.avatar !== undefined ? { avatar: toPublicMediaUrl(user.avatar) } : {}),
    ...(user.banner !== undefined ? { banner: toPublicMediaUrl(user.banner) } : {}),
  };
}
