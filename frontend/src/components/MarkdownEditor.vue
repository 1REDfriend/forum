<script setup lang="ts">
import { ref, watch } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const props = defineProps<{
  modelValue: string;
  placeholder?: string;
  rows?: number;
  minHeight?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const showPreview = ref(false);

const previewHtml = ref('');

const updatePreview = () => {
  marked.setOptions({ breaks: true, gfm: true });
  const raw = marked.parse(props.modelValue) as string;
  previewHtml.value = DOMPurify.sanitize(raw);
};

watch(() => props.modelValue, updatePreview, { immediate: true });

const insertMarkdown = (before: string, after = '', sample = '') => {
  const textarea = document.activeElement as HTMLTextAreaElement | null;
  if (!textarea || textarea.tagName !== 'TEXTAREA') {
    // Just append
    emit('update:modelValue', props.modelValue + before + sample + after);
    return;
  }
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.substring(start, end) || sample;
  const newVal =
    textarea.value.substring(0, start) + before + selected + after + textarea.value.substring(end);
  emit('update:modelValue', newVal);
  // Restore cursor
  requestAnimationFrame(() => {
    textarea.selectionStart = start + before.length;
    textarea.selectionEnd = start + before.length + selected.length;
    textarea.focus();
  });
};

const toolbarButtons = [
  { label: 'B', title: 'Bold', action: () => insertMarkdown('**', '**', 'bold text') },
  { label: 'I', title: 'Italic', action: () => insertMarkdown('*', '*', 'italic text') },
  { label: '`', title: 'Inline Code', action: () => insertMarkdown('`', '`', 'code') },
  { label: '```', title: 'Code Block', action: () => insertMarkdown('\n```\n', '\n```\n', 'code block') },
  { label: '>>', title: 'Blockquote', action: () => insertMarkdown('> ', '', 'quote') },
  { label: 'H2', title: 'Heading', action: () => insertMarkdown('## ', '', 'Heading') },
  { label: '•', title: 'Bullet List', action: () => insertMarkdown('- ', '', 'list item') },
  { label: '1.', title: 'Numbered List', action: () => insertMarkdown('1. ', '', 'list item') },
  { label: '🔗', title: 'Link', action: () => insertMarkdown('[', '](url)', 'link text') },
];
</script>

<template>
  <div class="markdown-editor">
    <!-- Toolbar -->
    <div class="toolbar">
      <button
        v-for="btn in toolbarButtons"
        :key="btn.label"
        type="button"
        :title="btn.title"
        @click="btn.action"
        class="toolbar-btn"
      >{{ btn.label }}</button>
      <div class="toolbar-sep" />
      <button
        type="button"
        @click="showPreview = false"
        :class="['tab-btn', !showPreview && 'tab-active']"
      >Write</button>
      <button
        type="button"
        @click="showPreview = true; updatePreview()"
        :class="['tab-btn', showPreview && 'tab-active']"
      >Preview</button>
    </div>

    <!-- Editor / Preview -->
    <div v-if="!showPreview">
      <textarea
        :value="modelValue"
        @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
        :placeholder="placeholder ?? 'Write your content here... Markdown is supported.'"
        :rows="rows ?? 8"
        :style="minHeight ? `min-height: ${minHeight}` : ''"
        class="editor-area"
      />
    </div>
    <div v-else class="preview-area">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-if="previewHtml" class="prose-preview" v-html="previewHtml" />
      <p v-else class="preview-empty">Nothing to preview yet…</p>
    </div>

    <p class="markdown-hint">Markdown supported — <strong>bold</strong>, *italic*, `code`, ```blocks```</p>
  </div>
</template>

<style scoped>
.markdown-editor {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  overflow: hidden;
  background: white;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 8px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  flex-wrap: wrap;
}

.toolbar-btn {
  padding: 3px 8px;
  font-size: 12px;
  font-weight: 600;
  color: #374151;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
  font-family: monospace;
}
.toolbar-btn:hover { background: #e5e7eb; color: #1f2937; }

.toolbar-sep {
  flex: 1;
}

.tab-btn {
  padding: 3px 12px;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  background: transparent;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}
.tab-btn:hover { color: #4f46e5; }
.tab-active {
  background: #4f46e5 !important;
  color: white !important;
  border-color: #4f46e5 !important;
}

.editor-area {
  width: 100%;
  box-sizing: border-box;
  padding: 12px 14px;
  border: none;
  outline: none;
  resize: vertical;
  font-size: 14px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  line-height: 1.7;
  color: #1f2937;
  min-height: 160px;
}

.preview-area {
  padding: 14px 16px;
  min-height: 160px;
}
.preview-empty {
  color: #9ca3af;
  font-style: italic;
  font-size: 14px;
}

.markdown-hint {
  font-size: 11px;
  color: #9ca3af;
  padding: 4px 12px 6px;
  background: #f9fafb;
  border-top: 1px solid #f3f4f6;
  margin: 0;
}

/* reuse prose styles */
.prose-preview :deep(h1), .prose-preview :deep(h2), .prose-preview :deep(h3) {
  font-weight: 700; margin: 0.8em 0 0.3em; color: #1f2937;
}
.prose-preview :deep(p) { margin: 0.5em 0; line-height: 1.7; }
.prose-preview :deep(strong) { font-weight: 700; }
.prose-preview :deep(em) { font-style: italic; }
.prose-preview :deep(code) {
  background: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 4px;
  padding: 1px 5px; font-family: monospace; font-size: 0.875em; color: #7c3aed;
}
.prose-preview :deep(pre) {
  background: #1e1e2e; border-radius: 8px; padding: 0.8em 1em; overflow-x: auto; margin: 0.6em 0;
}
.prose-preview :deep(pre code) { background: none; border: none; padding: 0; color: #cdd6f4; }
.prose-preview :deep(blockquote) {
  border-left: 3px solid #6366f1; padding-left: 0.8em; color: #6b7280; font-style: italic; margin: 0.5em 0;
}
.prose-preview :deep(ul), .prose-preview :deep(ol) { padding-left: 1.4em; margin: 0.4em 0; }
.prose-preview :deep(li) { margin: 0.2em 0; }
.prose-preview :deep(a) { color: #4f46e5; text-decoration: underline; }
</style>
