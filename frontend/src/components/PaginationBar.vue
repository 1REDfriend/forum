<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    page: number;
    totalPages: number;
    total?: number;
    itemLabel?: string;
  }>(),
  { itemLabel: 'items' },
);

const emit = defineEmits<{
  change: [page: number];
}>();

const go = (p: number) => {
  if (p >= 1 && p <= props.totalPages) emit('change', p);
};
</script>

<template>
  <div
    v-if="totalPages > 1"
    class="flex flex-wrap items-center justify-between gap-3 py-2"
  >
    <p class="text-sm text-(--color-text-muted)">
      Page {{ page }} of {{ totalPages }}
      <span v-if="total != null" class="text-(--color-text-muted)">
        ({{ total }} {{ itemLabel }})
      </span>
    </p>
    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        class="px-3 py-2 text-sm rounded-lg border border-(--color-border) hover:bg-(--color-background-mute) disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        :disabled="page <= 1"
        @click="go(page - 1)"
      >
        ← Prev
      </button>
      <button
        v-for="p in totalPages"
        :key="p"
        type="button"
        :class="[
          'px-3 py-2 text-sm rounded-lg border transition-colors',
          p === page
            ? 'bg-indigo-700 text-white border-indigo-700'
            : 'border-(--color-border) hover:bg-(--color-background-mute)',
        ]"
        @click="go(p)"
      >
        {{ p }}
      </button>
      <button
        type="button"
        class="px-3 py-2 text-sm rounded-lg border border-(--color-border) hover:bg-(--color-background-mute) disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        :disabled="page >= totalPages"
        @click="go(page + 1)"
      >
        Next →
      </button>
    </div>
  </div>
</template>
