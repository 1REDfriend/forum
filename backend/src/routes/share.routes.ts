import { Elysia, t } from 'elysia';
import { shareService } from '../services/share.service.js';

const html = (body: string) =>
  new Response(body, { headers: { 'content-type': 'text/html; charset=utf-8' } });

export const shareRoutes = new Elysia({ prefix: '/share', tags: ['Share'] })
  .get(
    '/thread/:id',
    async ({ params }) => {
      const out = await shareService.threadOg(params.id);
      return out ? html(out) : new Response('Not found', { status: 404 });
    },
    { params: t.Object({ id: t.String({ minLength: 1 }) }) },
  )
  .get(
    '/post/:id',
    async ({ params }) => {
      const out = await shareService.postOg(params.id);
      return out ? html(out) : new Response('Not found', { status: 404 });
    },
    { params: t.Object({ id: t.String({ minLength: 1 }) }) },
  )
  .get(
    '/forum/:id',
    async ({ params }) => {
      const out = await shareService.forumOg(params.id);
      return out ? html(out) : new Response('Not found', { status: 404 });
    },
    { params: t.Object({ id: t.String({ minLength: 1 }) }) },
  )
  .get(
    '/user/:id',
    async ({ params }) => {
      const out = await shareService.userOg(params.id);
      return out ? html(out) : new Response('Not found', { status: 404 });
    },
    { params: t.Object({ id: t.String({ minLength: 1 }) }) },
  );
