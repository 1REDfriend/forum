import { Hono } from 'hono';
import { shareService } from '../services/share.service.js';

export const shareRoutes = new Hono()
  .get('/thread/:id', async (c) => {
    const out = await shareService.threadOg(c.req.param('id'));
    return out ? c.html(out) : c.text('Not found', 404);
  })
  .get('/post/:id', async (c) => {
    const out = await shareService.postOg(c.req.param('id'));
    return out ? c.html(out) : c.text('Not found', 404);
  })
  .get('/forum/:id', async (c) => {
    const out = await shareService.forumOg(c.req.param('id'));
    return out ? c.html(out) : c.text('Not found', 404);
  })
  .get('/user/:id', async (c) => {
    const out = await shareService.userOg(c.req.param('id'));
    return out ? c.html(out) : c.text('Not found', 404);
  });
