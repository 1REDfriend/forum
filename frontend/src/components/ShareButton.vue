<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{ url: string; title?: string }>();
const copied = ref(false);

async function share() {
  if (navigator.share) {
    try {
      await navigator.share({ title: props.title ?? document.title, url: props.url });
      return;
    } catch {
      // user cancelled or unsupported — fall through to copy
    }
  }
  try {
    await navigator.clipboard.writeText(props.url);
    copied.value = true;
    setTimeout(() => (copied.value = false), 1500);
  } catch {
    // clipboard blocked — last resort prompt
    window.prompt('Copy this link', props.url);
  }
}
</script>

<template>
  <button
    type="button"
    class="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-(--color-text-muted) hover:text-sky-500 hover:bg-(--color-background-mute) transition-all"
    @click="share"
  >
    <span>🔗</span>
    <span>{{ copied ? 'Copied!' : 'Share' }}</span>
  </button>
</template>
