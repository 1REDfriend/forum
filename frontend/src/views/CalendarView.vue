<script setup lang="ts">
import { computed, ref } from 'vue';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { extrasApi } from '../api/index.js';
import { useAuthStore } from '../stores/auth.js';

const auth = useAuthStore();
const qc = useQueryClient();
const { data, isPending, error } = useQuery({
  queryKey: ['events'],
  queryFn: () => extrasApi.listEvents(),
});
const events = computed(() => data.value?.events ?? []);

const title = ref('');
const description = ref('');
const startsAt = ref('');
const creating = ref(false);

const canCreate = computed(
  () => auth.user?.role === 'admin' || auth.user?.role === 'manager',
);

const create = async () => {
  if (!title.value || !startsAt.value) return;
  creating.value = true;
  try {
    await extrasApi.createEvent({
      title: title.value,
      description: description.value || undefined,
      startsAt: new Date(startsAt.value).toISOString(),
    });
    title.value = '';
    description.value = '';
    startsAt.value = '';
    await qc.invalidateQueries({ queryKey: ['events'] });
  } finally {
    creating.value = false;
  }
};
</script>

<template>
  <div class="flex min-h-screen w-full justify-center">
    <div class="w-full max-w-2xl mx-auto pt-24 px-4 sm:px-6 pb-12">
      <h1 class="text-2xl font-extrabold text-(--color-heading) mb-2">Calendar</h1>
      <p class="text-sm text-(--color-text-muted) mb-6">กิจกรรมของชุมชน</p>

      <div v-if="canCreate" class="glass p-4 mb-6 space-y-2">
        <p class="text-sm font-semibold text-(--color-heading)">สร้างอีเวนต์</p>
        <input v-model="title" placeholder="Title" class="w-full rounded-md border border-(--color-border) bg-(--color-background) px-3 py-2 text-sm" />
        <textarea v-model="description" rows="2" placeholder="Description" class="w-full rounded-md border border-(--color-border) bg-(--color-background) px-3 py-2 text-sm" />
        <input v-model="startsAt" type="datetime-local" class="w-full rounded-md border border-(--color-border) bg-(--color-background) px-3 py-2 text-sm" />
        <button type="button" class="bg-indigo-700 text-white text-sm px-4 py-2 rounded-full" :disabled="creating" @click="create">
          {{ creating ? 'Saving…' : 'Create event' }}
        </button>
      </div>

      <div v-if="isPending" class="text-(--color-text-muted)">Loading…</div>
      <div v-else-if="error" class="text-(--color-error)">{{ (error as Error).message }}</div>
      <div v-else class="space-y-3">
        <div v-for="e in events" :key="e.id" class="glass p-4">
          <p class="font-bold text-(--color-heading)">{{ e.title }}</p>
          <p class="text-xs text-sky-600 mt-1">{{ new Date(e.startsAt).toLocaleString() }}</p>
          <p v-if="e.description" class="text-sm text-(--color-text-muted) mt-2">{{ e.description }}</p>
        </div>
        <div v-if="events.length === 0" class="glass p-8 text-center text-(--color-text-muted)">ยังไม่มีอีเวนต์</div>
      </div>
    </div>
  </div>
</template>
