<script setup lang="ts">
import { computed, ref } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { leaderboardApi } from '../api/index.js';

const period = ref<'week' | 'all'>('week');

const { data, isPending, error } = useQuery({
  queryKey: computed(() => ['leaderboard', period.value]),
  queryFn: () => leaderboardApi.get(period.value, 20),
  staleTime: 30_000,
});

const items = computed(() => data.value?.items ?? []);
</script>

<template>
  <div class="flex min-h-screen w-full justify-center">
    <div class="w-full max-w-2xl mx-auto pt-24 px-4 sm:px-6 pb-12">
      <div class="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 class="text-2xl font-extrabold text-(--color-heading)">Leaderboard</h1>
          <p class="text-sm text-(--color-text-muted) mt-1">จัดอันดับสมาชิกตามกิจกรรมและคะแนน</p>
        </div>
        <div class="flex gap-2">
          <button
            type="button"
            class="text-xs px-3 py-1.5 rounded-full border transition-colors"
            :class="period === 'week' ? 'bg-indigo-700 text-white border-indigo-700' : 'border-(--color-border) text-(--color-heading)'"
            @click="period = 'week'"
          >
            This week
          </button>
          <button
            type="button"
            class="text-xs px-3 py-1.5 rounded-full border transition-colors"
            :class="period === 'all' ? 'bg-indigo-700 text-white border-indigo-700' : 'border-(--color-border) text-(--color-heading)'"
            @click="period = 'all'"
          >
            All time
          </button>
        </div>
      </div>

      <div v-if="isPending" class="space-y-2">
        <div v-for="i in 8" :key="i" class="glass p-4 animate-pulse h-14" />
      </div>

      <div v-else-if="error" class="bg-red-500/10 text-(--color-error) rounded-xl p-6 border border-red-500/20">
        {{ (error as Error).message }}
      </div>

      <div v-else class="glass overflow-hidden">
        <div class="grid grid-cols-12 gap-2 px-4 py-2 text-xs uppercase tracking-wider text-(--color-text-muted) border-b border-(--color-border)">
          <div class="col-span-2">#</div>
          <div class="col-span-7">Member</div>
          <div class="col-span-3 text-right">{{ period === 'all' ? 'Score' : 'Activity' }}</div>
        </div>
        <div
          v-for="row in items"
          :key="row.id"
          class="grid grid-cols-12 gap-2 px-4 py-3 border-b border-(--color-border) last:border-0 items-center hover:bg-(--color-background-mute)"
        >
          <div class="col-span-2 font-bold text-(--color-heading)">{{ row.rank }}</div>
          <div class="col-span-7 min-w-0 flex items-center gap-2">
            <div class="w-8 h-8 rounded-full bg-(--color-background-mute) flex items-center justify-center text-xs font-bold text-sky-600">
              {{ row.name.charAt(0).toUpperCase() }}
            </div>
            <div class="min-w-0">
              <router-link :to="`/user/${row.id}`" class="font-semibold text-(--color-heading) hover:text-sky-600 truncate block">
                {{ row.name }}
              </router-link>
              <p class="text-xs text-(--color-text-muted)">{{ row.tier }}</p>
            </div>
          </div>
          <div class="col-span-3 text-right font-semibold tabular-nums text-(--color-heading)">
            {{ row.stat }}
          </div>
        </div>
        <div v-if="items.length === 0" class="p-10 text-center text-(--color-text-muted)">
          No rankings yet
        </div>
      </div>
    </div>
  </div>
</template>
