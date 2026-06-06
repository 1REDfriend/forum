import { describe, expect, it } from 'bun:test';
import { Value } from '@sinclair/typebox/value';
import type { TSchema } from '@sinclair/typebox';
import { TIERS as DOMAIN_TIERS } from './tiers.js';
import { UpdateUserTierDTO, TIERS as DTO_TIERS } from '../types/index.js';

describe('tier DTO matches domain keys', () => {
  it('DTO tier list equals domain tier keys', () => {
    expect([...DTO_TIERS]).toEqual(DOMAIN_TIERS.map((t) => t.key));
  });

  it('accepts every real tier key', () => {
    for (const t of DOMAIN_TIERS) {
      expect(Value.Check(UpdateUserTierDTO as unknown as TSchema, { tier: t.key })).toBe(true);
    }
  });

  it('rejects a stale legacy key', () => {
    expect(Value.Check(UpdateUserTierDTO as unknown as TSchema, { tier: 'Bronze' })).toBe(false);
  });
});
