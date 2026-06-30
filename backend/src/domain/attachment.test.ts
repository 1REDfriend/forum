import { describe, expect, it } from 'bun:test';
import { isInlineImageMime, attachmentMarkdown } from './attachment.js';

describe('isInlineImageMime', () => {
  it('is true for images', () => {
    expect(isInlineImageMime('image/png')).toBe(true);
    expect(isInlineImageMime('image/jpeg')).toBe(true);
  });
  it('is false for everything else', () => {
    expect(isInlineImageMime('application/zip')).toBe(false);
    expect(isInlineImageMime('video/mp4')).toBe(false);
    expect(isInlineImageMime('')).toBe(false);
  });
});

describe('attachmentMarkdown', () => {
  it('renders a link for a normal filename', () => {
    expect(attachmentMarkdown('report.zip', 'https://cdn/x.zip'))
      .toBe('[report.zip](https://cdn/x.zip)');
  });
  it('escapes ] in the filename label (parens pass through unescaped)', () => {
    expect(attachmentMarkdown('a]b(c).zip', 'https://cdn/x.zip'))
      .toBe('[a\\]b(c).zip](https://cdn/x.zip)');
  });
  it('escapes [ in the filename label, so the label cannot break out of the link', () => {
    expect(attachmentMarkdown('notes[draft].txt', 'https://cdn/x.zip'))
      .toBe('[notes\\[draft\\].txt](https://cdn/x.zip)');
  });
});
