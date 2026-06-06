import { threadRepository } from '../repositories/thread.repository.js';
import { postRepository } from '../repositories/post.repository.js';

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface OgMeta {
  title: string;
  description: string;
  url: string;
  image?: string | undefined;
}

export function renderOgHtml(m: OgMeta): string {
  const img = m.image ? `<meta property="og:image" content="${esc(m.image)}">` : '';
  return `<!doctype html><html><head><meta charset="utf-8">
<title>${esc(m.title)}</title>
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(m.title)}">
<meta property="og:description" content="${esc(m.description)}">
<meta property="og:url" content="${esc(m.url)}">
${img}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(m.title)}">
<meta name="twitter:description" content="${esc(m.description)}">
<meta http-equiv="refresh" content="0; url=${m.url}">
</head><body>Redirecting to <a href="${esc(m.url)}">${esc(m.url)}</a></body></html>`;
}

function snippet(content: string): string {
  const oneLine = content.replace(/\s+/g, ' ').trim();
  return oneLine.length > 200 ? oneLine.slice(0, 197) + '...' : oneLine;
}

export const shareService = {
  async threadOg(id: string): Promise<string | null> {
    const thread = await threadRepository.findById(id);
    if (!thread) return null;
    return renderOgHtml({
      title: thread.title,
      description: snippet(thread.content),
      url: `${FRONTEND_URL}/thread/${id}`,
      image: thread.author?.avatar ?? undefined,
    });
  },
  async postOg(id: string): Promise<string | null> {
    const post = await postRepository.findById(id);
    if (!post) return null;
    return renderOgHtml({
      title: 'Reply in thread',
      description: snippet(post.content),
      url: `${FRONTEND_URL}/thread/${post.threadId}#post-${id}`,
    });
  },
};
