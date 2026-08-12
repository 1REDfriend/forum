import { useQuery } from '@tanstack/vue-query';
import { activityApi } from '../api/index.js';

export function useRecentActivity(limit = 20) {
  return useQuery({
    queryKey: ['activity', 'recent', limit],
    queryFn: () => activityApi.getRecent(limit),
    staleTime: 30_000,
  });
}

export function usePublicStats() {
  return useQuery({
    queryKey: ['stats', 'public'],
    queryFn: () => activityApi.getPublicStats(),
    staleTime: 30_000,
  });
}
