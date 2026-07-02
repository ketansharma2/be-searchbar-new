/**
 * Shared pagination helpers so every list endpoint behaves consistently.
 */
export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  pagination: PaginationMeta;
}

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

/** Normalise raw query values into safe page/limit/skip numbers. */
export function resolvePagination(
  rawPage?: unknown,
  rawLimit?: unknown
): PaginationParams {
  const page = Math.max(1, Number.parseInt(String(rawPage ?? '1'), 10) || 1);
  const limitRaw = Number.parseInt(String(rawLimit ?? DEFAULT_LIMIT), 10) || DEFAULT_LIMIT;
  const limit = Math.min(MAX_LIMIT, Math.max(1, limitRaw));
  return { page, limit, skip: (page - 1) * limit };
}

export function buildMeta(total: number, params: PaginationParams): PaginationMeta {
  return {
    page: params.page,
    limit: params.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / params.limit)),
  };
}
