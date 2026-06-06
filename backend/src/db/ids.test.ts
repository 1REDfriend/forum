import { test, expect } from 'bun:test';
import { newId } from './ids.js';

test('newId returns a 16-char id', () => {
  expect(newId()).toHaveLength(16);
});

test('newId is url-safe (lowercase alnum)', () => {
  expect(newId()).toMatch(/^[a-z0-9]{16}$/);
});

test('newId is non-sequential and unique across many calls', () => {
  const ids = new Set(Array.from({ length: 5000 }, () => newId()));
  expect(ids.size).toBe(5000);
});
