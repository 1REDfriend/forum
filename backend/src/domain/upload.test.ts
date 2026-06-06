import { describe, expect, it } from 'bun:test';
import { extForMime, sniffImageType } from './upload.js';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const HTML = Buffer.from('<html><script>alert(1)</script>', 'utf8');

describe('extForMime', () => {
  it('maps allowed mimes', () => {
    expect(extForMime('image/png')).toBe('.png');
    expect(extForMime('image/jpeg')).toBe('.jpg');
  });
  it('returns null for anything not whitelisted', () => {
    expect(extForMime('text/html')).toBeNull();
    expect(extForMime('image/svg+xml')).toBeNull();
  });
});

describe('sniffImageType (magic bytes)', () => {
  it('detects real images', () => {
    expect(sniffImageType(PNG)).toBe('image/png');
    expect(sniffImageType(JPG)).toBe('image/jpeg');
  });
  it('returns null for non-image bytes', () => {
    expect(sniffImageType(HTML)).toBeNull();
  });
});
