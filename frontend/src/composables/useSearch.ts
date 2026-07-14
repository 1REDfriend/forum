import { computed, unref, type MaybeRef } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { searchApi } from '../api/index.js';

export function useSearch(q: MaybeRef<string>) {
  return useQuery({
    queryKey: ['search', q],
    queryFn: () => searchApi.search(unref(q)),
    enabled: computed(() => unref(q).trim().length > 0),
  });
}
