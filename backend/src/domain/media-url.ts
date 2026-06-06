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
