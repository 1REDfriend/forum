import { useMutation } from '@tanstack/vue-query';
import { reportsApi } from '../api/index.js';

export function useCreateReport() {
  return useMutation({
    mutationFn: (data: { targetType: 'thread' | 'post' | 'user'; targetId: string; reason: string }) =>
      reportsApi.create(data),
    // No cache invalidation needed: reports aren't cached/displayed to the reporting user.
  });
}
