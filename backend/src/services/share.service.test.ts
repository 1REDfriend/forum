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

test('falls back to the default site card when no image is given', () => {
  const html = renderOgHtml({
    title: 'No image',
    description: 'desc',
    url: 'https://forum.example/forum/xyz',
  });
  expect(html).toContain('og:image');
  expect(html).toContain('/og-default.png');
  expect(html).toContain('<meta name="twitter:image"');
});

test('emits the requested og:type', () => {
  const website = renderOgHtml({ title: 't', description: 'd', url: 'u', type: 'website' });
  expect(website).toContain('<meta property="og:type" content="website">');
  const profile = renderOgHtml({ title: 't', description: 'd', url: 'u', type: 'profile' });
  expect(profile).toContain('<meta property="og:type" content="profile">');
});

test('defaults og:type to article when unspecified', () => {
  const html = renderOgHtml({ title: 't', description: 'd', url: 'u' });
  expect(html).toContain('<meta property="og:type" content="article">');
});
