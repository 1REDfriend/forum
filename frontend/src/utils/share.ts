function origin(base?: string): string {
  return (base ?? window.location.origin).replace(/\/$/, '');
}

export function threadShareUrl(threadId: string, base?: string): string {
  return `${origin(base)}/thread/${threadId}`;
}

export function postShareUrl(threadId: string, postId: string, base?: string): string {
  return `${origin(base)}/thread/${threadId}#post-${postId}`;
}
