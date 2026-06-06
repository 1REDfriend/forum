import { describe, expect, it } from 'bun:test';
import { isSafeMediaUrl } from './media-url.js';

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
