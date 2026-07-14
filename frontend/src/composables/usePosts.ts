import { computed, unref, type MaybeRef } from 'vue';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { postsApi } from '../api/index.js';
import type { CreatePostDTO, UpdatePostDTO } from '../api/types.js';

export function useThreadPosts(threadId: MaybeRef<string>, page: MaybeRef<number>) {
  return useQuery({
    queryKey: ['thread', threadId, 'posts', page],
    queryFn: () => postsApi.getPostsByThreadId(unref(threadId), unref(page)),
    enabled: computed(() => !!unref(threadId)),
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePostDTO) => postsApi.createPost(data),
    onSuccess: (_res, data) => {
      qc.invalidateQueries({ queryKey: ['thread', data.threadId, 'posts'] });
      qc.invalidateQueries({ queryKey: ['thread', data.threadId] }); // reply count on the thread
    },
  });
}

export function useUpdatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePostDTO }) => postsApi.updatePost(id, data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['thread', res.threadId, 'posts'] });
      qc.invalidateQueries({ queryKey: ['thread', res.threadId] });
    },
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postsApi.deletePost(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['thread'] }),
  });
}
