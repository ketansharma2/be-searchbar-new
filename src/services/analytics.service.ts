import {
  analyticsRepository,
  type AnalyticsSummary,
  type BreakdownRow,
} from '../repositories/analytics.repository';
import type { AnalyticsBreakdownQuery, AnalyticsSummaryQuery } from '../validators/analytics.validators';

export async function getAnalyticsSummary(query: AnalyticsSummaryQuery): Promise<AnalyticsSummary> {
  return analyticsRepository.getSummary(query.from, query.to);
}

export async function getAnalyticsBreakdown(
  query: AnalyticsBreakdownQuery
): Promise<{ dimension: AnalyticsBreakdownQuery['dimension']; breakdown: BreakdownRow[] }> {
  const breakdown = await analyticsRepository.getBreakdown(
    query.dimension,
    query.location,
    query.from,
    query.to
  );
  return { dimension: query.dimension, breakdown };
}
