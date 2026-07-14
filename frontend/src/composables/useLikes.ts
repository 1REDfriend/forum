import { useMutation, useQueryClient } from '@tanstack/vue-query';
import { likesApi } from '../api/index.js';

export function useToggleThreadLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (threadId: string) => likesApi.toggleThreadLike(threadId),
    onSuccess: (_res, threadId) => {
      qc.invalidateQueries({ queryKey: ['thread', threadId] });
      qc.invalidateQueries({ queryKey: ['threads'] });
      // thread lists (which carry like counts) live under forum keys too; response
      // has no forumId, so invalidate broadly.
      qc.invalidateQueries({ queryKey: ['forum'] });
    },
  });
}

export function useTogglePostLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) => likesApi.togglePostLike(postId),
    onSuccess: () => {
      // post like counts live in thread post lists; neither the response nor the
      // mutation variable (postId) carries the threadId, so invalidate broadly.
      qc.invalidateQueries({ queryKey: ['thread'] });
    },
  });
}
