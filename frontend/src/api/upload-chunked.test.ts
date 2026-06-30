import { describe, expect, it } from 'vitest';
import { planChunks } from './upload-chunked';

describe('planChunks', () => {
  it('splits into ceil(size/chunk) ranges', () => {
    const ranges = planChunks(250, 100);
    expect(ranges).toEqual([
      { partNumber: 1, start: 0, end: 100 },
      { partNumber: 2, start: 100, end: 200 },
      { partNumber: 3, start: 200, end: 250 },
    ]);
  });
  it('handles an exact multiple', () => {
    expect(planChunks(200, 100)).toEqual([
      { partNumber: 1, start: 0, end: 100 },
      { partNumber: 2, start: 100, end: 200 },
    ]);
  });
  it('handles a file smaller than one chunk', () => {
    expect(planChunks(40, 100)).toEqual([{ partNumber: 1, start: 0, end: 40 }]);
  });
});
