import { computed, unref, type MaybeRef } from 'vue';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { threadsApi } from '../api/index.js';
import type { CreateThreadDTO, UpdateThreadDTO } from '../api/types.js';

export function useThreads() {
  return useQuery({
    queryKey: ['threads'],
    queryFn: () => threadsApi.getAllThreads(),
  });
}

export function useForumThreads(forumId: MaybeRef<string>, page: MaybeRef<number>) {
  return useQuery({
    queryKey: ['forum', forumId, 'threads', page],
    queryFn: () => threadsApi.getThreadsByForumId(unref(forumId), unref(page)),
    enabled: computed(() => !!unref(forumId)),
  });
}

export function useThread(id: MaybeRef<string>) {
  return useQuery({
    queryKey: ['thread', id],
    queryFn: () => threadsApi.getThreadById(unref(id)),
    enabled: computed(() => !!unref(id)),
  });
}

export function useCreateThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateThreadDTO) => threadsApi.createThread(data),
    onSuccess: (_res, data) => {
      qc.invalidateQueries({ queryKey: ['forum', data.forumId, 'threads'] });
      qc.invalidateQueries({ queryKey: ['threads'] });
    },
  });
}

export function useUpdateThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateThreadDTO }) =>
      threadsApi.updateThread(id, data),
    onSuccess: (res, { id }) => {
      qc.invalidateQueries({ queryKey: ['thread', id] });
      qc.invalidateQueries({ queryKey: ['forum', res.forumId, 'threads'] });
      qc.invalidateQueries({ queryKey: ['threads'] });
    },
  });
}

export function useDeleteThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => threadsApi.deleteThread(id),
    onSuccess: (_res, id) => {
      qc.invalidateQueries({ queryKey: ['threads'] });
      qc.invalidateQueries({ queryKey: ['thread', id] });
      qc.invalidateQueries({ queryKey: ['forum'] }); // covers all forum thread lists
    },
  });
}

export function usePinThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => threadsApi.pinThread(id),
    onSuccess: (_res, id) => {
      qc.invalidateQueries({ queryKey: ['thread', id] });
      qc.invalidateQueries({ queryKey: ['forum'] }); // pinned state affects thread list rendering
    },
  });
}

export function useLockThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => threadsApi.lockThread(id),
    onSuccess: (_res, id) => {
      qc.invalidateQueries({ queryKey: ['thread', id] });
      qc.invalidateQueries({ queryKey: ['forum'] }); // locked state affects thread list rendering
    },
  });
}
