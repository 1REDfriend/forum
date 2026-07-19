import { threadRepository } from '../repositories/thread.repository.js';
import { postRepository } from '../repositories/post.repository.js';
import { forumRepository } from '../repositories/forum.repository.js';
import { userRepository } from '../repositories/user.repository.js';

// FRONTEND_URL may be a comma-separated list of origins; use the first, no trailing slash.
const FRONTEND_URL = (process.env.FRONTEND_URL ?? 'http://localhost:5173')
  .split(',')[0]!
  .trim()
  .replace(/\/+$/, '');

// Absolute URL to the default social card. FB/Twitter require absolute og:image URLs.
const DEFAULT_OG_IMAGE = `${FRONTEND_URL}/og-default.png`;

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

type OgType = 'website' | 'article' | 'profile';

export interface OgMeta {
  title: string;
  description: string;
  url: string;
  image?: string | undefined;
  type?: OgType | undefined;
}

export function renderOgHtml(m: OgMeta): string {
  const image = m.image ?? DEFAULT_OG_IMAGE;
  const type = m.type ?? 'article';
  return `<!doctype html><html><head><meta charset="utf-8">
<title>${esc(m.title)}</title>
<meta property="og:site_name" content="IT.Forum">
<meta property="og:type" content="${type}">
<meta property="og:title" content="${esc(m.title)}">
<meta property="og:description" content="${esc(m.description)}">
<meta property="og:url" content="${esc(m.url)}">
<meta property="og:image" content="${esc(image)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(m.title)}">
<meta name="twitter:description" content="${esc(m.description)}">
<meta name="twitter:image" content="${esc(image)}">
<meta http-equiv="refresh" content="0; url=${esc(m.url)}">
</head><body>Redirecting to <a href="${esc(m.url)}">${esc(m.url)}</a></body></html>`;
}

function snippet(content: string, max = 200): string {
  const oneLine = content.replace(/\s+/g, ' ').trim();
  return oneLine.length > max ? oneLine.slice(0, max - 3) + '...' : oneLine;
}

export const shareService = {
  async threadOg(id: string): Promise<string | null> {
    const thread = await threadRepository.findById(id);
    if (!thread) return null;
    const by = thread.author?.name ? ` · by ${thread.author.name}` : '';
    const inForum = thread.forum?.name ? ` in ${thread.forum.name}` : '';
    return renderOgHtml({
      title: thread.title,
      description: `${snippet(thread.content, 160)}${inForum}${by}`,
      url: `${FRONTEND_URL}/thread/${id}`,
      type: 'article',
      // Always use the default site OG card for thread shares.
    });
  },

  async postOg(id: string): Promise<string | null> {
    const post = await postRepository.findById(id);
    if (!post) return null;
    return renderOgHtml({
      title: 'Reply in thread',
      description: snippet(post.content),
      url: `${FRONTEND_URL}/thread/${post.threadId}#post-${id}`,
      type: 'article',
    });
  },

  async forumOg(id: string): Promise<string | null> {
    const forum = await forumRepository.findById(id);
    if (!forum) return null;
    return renderOgHtml({
      title: `${forum.name} — IT.Forum`,
      description: forum.description
        ? snippet(forum.description)
        : `Discussions in ${forum.name} on IT.Forum.`,
      url: `${FRONTEND_URL}/forum/${id}`,
      type: 'website',
    });
  },

  async userOg(id: string): Promise<string | null> {
    const user = await userRepository.findById(id);
    if (!user) return null;
    return renderOgHtml({
      title: `${user.name} — IT.Forum`,
      description: user.bio ? snippet(user.bio) : `${user.name}'s profile on IT.Forum.`,
      url: `${FRONTEND_URL}/user/${id}`,
      type: 'profile',
      image: user.banner ?? user.avatar ?? undefined,
    });
  },
};
