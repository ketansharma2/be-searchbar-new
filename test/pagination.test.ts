import { describe, it, expect } from 'vitest';
import { resolvePagination, buildMeta } from '../src/utils/pagination';

describe('resolvePagination', () => {
  it('defaults to page 1, limit 10', () => {
    expect(resolvePagination()).toEqual({ page: 1, limit: 10, skip: 0 });
  });

  it('computes skip from page/limit', () => {
    expect(resolvePagination('3', '20')).toEqual({ page: 3, limit: 20, skip: 40 });
  });

  it('clamps invalid/negative values to safe bounds', () => {
    // page -5 → 1; limit '0' is falsy → falls back to the default (10).
    expect(resolvePagination('-5', '0')).toEqual({ page: 1, limit: 10, skip: 0 });
    // limit above MAX_LIMIT is clamped to 100.
    expect(resolvePagination('abc', '9999').limit).toBe(100);
  });
});

describe('buildMeta', () => {
  it('computes totalPages (ceil), min 1', () => {
    expect(buildMeta(45, { page: 1, limit: 10, skip: 0 })).toEqual({
      page: 1,
      limit: 10,
      total: 45,
      totalPages: 5,
    });
    expect(buildMeta(0, { page: 1, limit: 10, skip: 0 }).totalPages).toBe(1);
  });
});
