import { describe, it, expect } from 'vitest';
import { threadShareUrl, postShareUrl } from './share';

describe('share urls', () => {
  it('builds a thread url', () => {
    expect(threadShareUrl('abc123', 'https://forum.example')).toBe(
      'https://forum.example/thread/abc123',
    );
  });
  it('builds a post url with anchor', () => {
    expect(postShareUrl('abc123', 'p9', 'https://forum.example')).toBe(
      'https://forum.example/thread/abc123#post-p9',
    );
  });
  it('strips a trailing slash from origin', () => {
    expect(threadShareUrl('x', 'https://forum.example/')).toBe('https://forum.example/thread/x');
  });
});
