import { computed, unref, type MaybeRef } from 'vue';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { forumsApi } from '../api/index.js';
import type { CreateForumDTO, UpdateForumDTO } from '../api/types.js';

export function useForums() {
  return useQuery({
    queryKey: ['forums'],
    queryFn: () => forumsApi.getAllForums(),
  });
}

export function useForum(id: MaybeRef<string>) {
  return useQuery({
    queryKey: ['forum', id],
    queryFn: () => forumsApi.getForumById(unref(id)),
    enabled: computed(() => !!unref(id)),
  });
}

export function useCreateForum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateForumDTO) => forumsApi.createForum(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forums'] }),
  });
}

export function useUpdateForum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateForumDTO }) =>
      forumsApi.updateForum(id, data),
    onSuccess: (_res, { id }) => {
      qc.invalidateQueries({ queryKey: ['forums'] });
      qc.invalidateQueries({ queryKey: ['forum', id] });
    },
  });
}

export function useDeleteForum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => forumsApi.deleteForum(id),
    onSuccess: (_res, id) => {
      qc.invalidateQueries({ queryKey: ['forums'] });
      qc.invalidateQueries({ queryKey: ['forum', id] });
    },
  });
}
