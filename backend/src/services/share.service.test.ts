import { test, expect } from 'bun:test';
import { renderOgHtml } from './share.service.js';

test('renders escaped OG + twitter meta with a redirect', () => {
  const html = renderOgHtml({
    title: 'Hello & <world>',
    description: 'a "quoted" snippet',
    url: 'https://forum.example/thread/abc',
    image: 'https://forum.example/img.png',
  });
  expect(html).toContain('<meta property="og:title" content="Hello &amp; &lt;world&gt;">');
  expect(html).toContain('<meta property="og:url" content="https://forum.example/thread/abc">');
  expect(html).toContain('<meta name="twitter:card" content="summary_large_image">');
  expect(html).toContain('url=https://forum.example/thread/abc'); // meta refresh redirect
});
