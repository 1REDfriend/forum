import { test, expect } from 'bun:test';
import { makeSnippet } from './snippet.js';

test('strips markdown images and collapses whitespace', () => {
  const s = makeSnippet('Hello ![x](http://a/b.png) **world**\n\nnext', 160);
  expect(s).toBe('Hello world next');
});

test('truncates long text with ellipsis', () => {
  const s = makeSnippet('a'.repeat(200), 50);
  expect(s.length).toBeLessThanOrEqual(51); // 50 + …
  expect(s.endsWith('…')).toBe(true);
});

test('empty input returns empty string', () => {
  expect(makeSnippet('', 160)).toBe('');
});
