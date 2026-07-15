import { test, expect } from 'bun:test';
import { FORUM_MANAGER_ROLES, canModifyForum } from './forum-policy.js';

test('manager roles list contains exactly admin and manager', () => {
  expect([...FORUM_MANAGER_ROLES].sort()).toEqual(['admin', 'manager']);
});

test('admin can modify any forum', () => {
  expect(canModifyForum('u1', 'admin', 'someone-else')).toBe(true);
});

test('manager can modify any forum', () => {
  expect(canModifyForum('u1', 'manager', 'someone-else')).toBe(true);
});

test('owner can modify their own forum regardless of role', () => {
  expect(canModifyForum('u1', 'user', 'u1')).toBe(true);
});

test('regular user cannot modify a forum they do not own', () => {
  expect(canModifyForum('u1', 'user', 'someone-else')).toBe(false);
});

test('missing role cannot modify a forum they do not own', () => {
  expect(canModifyForum('u1', undefined, 'someone-else')).toBe(false);
});

test('null createdBy is not treated as owned', () => {
  expect(canModifyForum('u1', 'user', null)).toBe(false);
});
