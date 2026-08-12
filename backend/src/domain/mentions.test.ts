import { test, expect } from 'bun:test';
import { parseMentionUserIds, rewriteMentionLinksForHtml } from './mentions.js';

test('parses unique mention ids', () => {
  const md = 'Hey [@alice](user:abc123) and [@bob](user:def456) and [@alice](user:abc123) again';
  expect(parseMentionUserIds(md)).toEqual(['abc123', 'def456']);
});

test('caps mentions', () => {
  const parts = Array.from({ length: 25 }, (_, i) => `[@u${i}](user:id${i})`);
  expect(parseMentionUserIds(parts.join(' '), 20)).toHaveLength(20);
});

test('ignores invalid patterns', () => {
  expect(parseMentionUserIds('hello @alice [alice](user:) [@x](http://x)')).toEqual([]);
});

test('rewrites to profile paths', () => {
  expect(rewriteMentionLinksForHtml('hi [@alice](user:abc)')).toBe('hi [@alice](/user/abc)');
});
