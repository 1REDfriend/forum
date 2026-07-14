import { computed, unref, type MaybeRef } from 'vue';
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query';
import { usersApi } from '../api/index.js';
import type { UpdateUserDTO } from '../api/types.js';

export function useMe(enabled: MaybeRef<boolean> = true) {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => usersApi.getMe(),
    enabled: computed(() => !!unref(enabled)),
  });
}

export function usePublicProfile(id: MaybeRef<string>) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => usersApi.getUserById(unref(id)),
    enabled: computed(() => !!unref(id)),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateUserDTO) => usersApi.updateMe(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });
}
