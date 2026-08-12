import { afterEach, describe, expect, it } from 'bun:test';
import {
  isSafeMediaUrl,
  rewriteMediaUrlsInText,
  toPublicMediaUrl,
} from './media-url.js';

describe('isSafeMediaUrl', () => {
  it('allows https and http', () => {
    expect(isSafeMediaUrl('https://cdn.example.com/a.png')).toBe(true);
    expect(isSafeMediaUrl('http://localhost:3636/uploads/x.jpg')).toBe(true);
  });
  it('allows local upload paths', () => {
    expect(isSafeMediaUrl('/uploads/avatar-1.png')).toBe(true);
  });
  it('rejects javascript/data/other schemes', () => {
    expect(isSafeMediaUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeMediaUrl('data:text/html,<script>')).toBe(false);
    expect(isSafeMediaUrl('file:///etc/passwd')).toBe(false);
  });
  it('rejects junk', () => {
    expect(isSafeMediaUrl('not a url')).toBe(false);
  });
});

describe('toPublicMediaUrl', () => {
  const prev = process.env.CDN_PUBLIC_URL;
  afterEach(() => {
    if (prev === undefined) delete process.env.CDN_PUBLIC_URL;
    else process.env.CDN_PUBLIC_URL = prev;
  });

  it('is a no-op when CDN_PUBLIC_URL is unset', () => {
    delete process.env.CDN_PUBLIC_URL;
    expect(toPublicMediaUrl('https://cdn.supakorn.xyz/files/a/b.jpg')).toBe(
      'https://cdn.supakorn.xyz/files/a/b.jpg',
    );
  });

  it('rewrites any host with /files/ path to CDN_PUBLIC_URL', () => {
    process.env.CDN_PUBLIC_URL = 'https://cdn.supaxit.com';
    expect(toPublicMediaUrl('https://cdn.supakorn.xyz/files/a/b.jpg')).toBe(
      'https://cdn.supaxit.com/files/a/b.jpg',
    );
    expect(toPublicMediaUrl('https://cdn.supaxit.com/files/a/b.jpg')).toBe(
      'https://cdn.supaxit.com/files/a/b.jpg',
    );
    expect(toPublicMediaUrl('http://axite-elysia:3000/files/a/b.jpg')).toBe(
      'https://cdn.supaxit.com/files/a/b.jpg',
    );
  });

  it('resolves relative /files/ paths', () => {
    process.env.CDN_PUBLIC_URL = 'https://cdn.supaxit.com/';
    expect(toPublicMediaUrl('/files/a/b.jpg')).toBe('https://cdn.supaxit.com/files/a/b.jpg');
  });

  it('leaves non-CDN URLs alone', () => {
    process.env.CDN_PUBLIC_URL = 'https://cdn.supaxit.com';
    expect(toPublicMediaUrl('https://forum.supaxit.com/og-default.png')).toBe(
      'https://forum.supaxit.com/og-default.png',
    );
    expect(toPublicMediaUrl('/uploads/avatar-1.png')).toBe('/uploads/avatar-1.png');
  });

  it('preserves query and hash on /files/ URLs', () => {
    process.env.CDN_PUBLIC_URL = 'https://cdn.supaxit.com';
    expect(toPublicMediaUrl('https://old.example/files/x.png?token=1#top')).toBe(
      'https://cdn.supaxit.com/files/x.png?token=1#top',
    );
  });
});

describe('rewriteMediaUrlsInText', () => {
  const prev = process.env.CDN_PUBLIC_URL;
  afterEach(() => {
    if (prev === undefined) delete process.env.CDN_PUBLIC_URL;
    else process.env.CDN_PUBLIC_URL = prev;
  });

  it('rewrites markdown image URLs with /files/ paths', () => {
    process.env.CDN_PUBLIC_URL = 'https://cdn.supaxit.com';
    const input =
      'hello ![x](https://cdn.supakorn.xyz/files/c0/a.jpg) and https://cdn.old/files/z.png';
    const out = rewriteMediaUrlsInText(input);
    expect(out).toContain('https://cdn.supaxit.com/files/c0/a.jpg');
    expect(out).toContain('https://cdn.supaxit.com/files/z.png');
    expect(out).not.toContain('supakorn.xyz');
    expect(out).not.toContain('cdn.old');
  });

  it('is a no-op without CDN_PUBLIC_URL', () => {
    delete process.env.CDN_PUBLIC_URL;
    const input = '![x](https://cdn.supakorn.xyz/files/a.jpg)';
    expect(rewriteMediaUrlsInText(input)).toBe(input);
  });
});
