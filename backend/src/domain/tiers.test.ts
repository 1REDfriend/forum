import { describe, expect, it } from 'bun:test';
import { TIERS as DOMAIN_TIERS } from './tiers.js';
import { UpdateUserTierDTO, TIERS as DTO_TIERS } from '../types/index.js';

describe('tier DTO matches domain keys', () => {
  it('DTO tier list equals domain tier keys', () => {
    expect([...DTO_TIERS]).toEqual(DOMAIN_TIERS.map((t) => t.key));
  });

  it('accepts every real tier key', () => {
    for (const t of DOMAIN_TIERS) {
      expect(UpdateUserTierDTO.safeParse({ tier: t.key }).success).toBe(true);
    }
  });

  it('rejects a stale legacy key', () => {
    expect(UpdateUserTierDTO.safeParse({ tier: 'Bronze' }).success).toBe(false);
  });
});
