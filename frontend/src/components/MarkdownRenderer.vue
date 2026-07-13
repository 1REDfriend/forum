<script setup lang="ts">
import { computed } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const props = defineProps<{
  content: string;
  class?: string;
}>();

// Configure marked for safe rendering
marked.setOptions({
  breaks: true, // Convert newlines to <br>
  gfm: true,    // GitHub Flavored Markdown
});

const renderedHtml = computed(() => {
  const raw = marked.parse(props.content) as string;
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote',
      'a', 'img', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'rel'],
  });
});
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div class="prose-content" :class="props.class" v-html="renderedHtml" />
</template>

<style scoped>
.prose-content :deep(h1),
.prose-content :deep(h2),
.prose-content :deep(h3) {
  font-weight: 700;
  margin-top: 1.2em;
  margin-bottom: 0.5em;
  color: var(--color-heading);
}
.prose-content :deep(h1) { font-size: 1.5em; }
.prose-content :deep(h2) { font-size: 1.25em; }
.prose-content :deep(h3) { font-size: 1.1em; }

.prose-content :deep(p) {
  margin: 0.6em 0;
  line-height: 1.7;
}

.prose-content :deep(strong) { font-weight: 700; }
.prose-content :deep(em) { font-style: italic; }

.prose-content :deep(code) {
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 1px 5px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.875em;
  color: var(--color-indigo-700);
}

.prose-content :deep(pre) {
  background: var(--color-background-mute);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1em 1.2em;
  overflow-x: auto;
  margin: 0.8em 0;
}

.prose-content :deep(pre code) {
  background: none;
  border: none;
  padding: 0;
  color: var(--color-text);
  font-size: 0.875em;
}

.prose-content :deep(blockquote) {
  border-left: 3px solid var(--color-indigo-600);
  padding-left: 1em;
  color: var(--color-text-muted);
  font-style: italic;
  margin: 0.8em 0;
}

.prose-content :deep(ul),
.prose-content :deep(ol) {
  padding-left: 1.5em;
  margin: 0.6em 0;
}

.prose-content :deep(li) {
  margin: 0.25em 0;
  line-height: 1.6;
}

.prose-content :deep(a) {
  color: var(--color-indigo-600);
  text-decoration: underline;
}
.prose-content :deep(a:hover) { color: var(--color-indigo-500); }

.prose-content :deep(hr) {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 1em 0;
}

.prose-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 0.8em 0;
}
.prose-content :deep(th),
.prose-content :deep(td) {
  border: 1px solid var(--color-border);
  padding: 6px 12px;
  text-align: left;
}
.prose-content :deep(th) {
  background: var(--color-background-soft);
  font-weight: 600;
}
</style>
