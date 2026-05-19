import { get } from './client';

export interface RecentSeriesEntry {
  title: string;
  path: string;
}

export const getRecentSeries = (): Promise<RecentSeriesEntry[]> =>
  get('/api/settings/recent-series');
