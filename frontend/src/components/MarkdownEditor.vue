<script setup lang="ts">
import { ref, watch } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { uploadApi } from '../api/index.js';
import { useAuthStore } from '../stores/auth.js';

const props = defineProps<{
  modelValue: string;
  placeholder?: string;
  rows?: number;
  minHeight?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const authStore = useAuthStore();
const showPreview = ref(false);
const previewHtml = ref('');
const isUploadingImage = ref(false);
const uploadError = ref('');
const textareaRef = ref<HTMLTextAreaElement | null>(null);

const updatePreview = () => {
  marked.setOptions({ breaks: true, gfm: true });
  const raw = marked.parse(props.modelValue) as string;
  previewHtml.value = DOMPurify.sanitize(raw);
};

watch(() => props.modelValue, updatePreview, { immediate: true });

const insertAtCursor = (before: string, after = '', sample = '') => {
  const textarea = textareaRef.value ?? (document.activeElement as HTMLTextAreaElement | null);
  if (!textarea || textarea.tagName !== 'TEXTAREA') {
    emit('update:modelValue', props.modelValue + before + sample + after);
    return;
  }
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.substring(start, end) || sample;
  const newVal =
    textarea.value.substring(0, start) + before + selected + after + textarea.value.substring(end);
  emit('update:modelValue', newVal);
  requestAnimationFrame(() => {
    textarea.selectionStart = start + before.length;
    textarea.selectionEnd = start + before.length + selected.length;
    textarea.focus();
  });
};

const insertMarkdown = (before: string, after = '', sample = '') => {
  insertAtCursor(before, after, sample);
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
  { label: '🖼', title: 'Image', action: () => insertMarkdown('![', '](url)', 'alt text') },
];

// ─── Image upload helper ────────────────────────────────────────────────────

const uploadImageFile = async (file: File) => {
  if (!authStore.isAuthenticated) {
    uploadError.value = 'You must be logged in to upload images.';
    setTimeout(() => { uploadError.value = ''; }, 4000);
    return;
  }
  if (!file.type.startsWith('image/')) return;

  isUploadingImage.value = true;
  uploadError.value = '';

  // Insert placeholder
  const placeholder = `![Uploading ${file.name}…]()`;
  const textarea = textareaRef.value;
  let insertPos = props.modelValue.length;
  if (textarea) {
    insertPos = textarea.selectionStart ?? props.modelValue.length;
  }
  const before = props.modelValue.substring(0, insertPos);
  const after = props.modelValue.substring(insertPos);
  emit('update:modelValue', before + placeholder + after);

  try {
    const url = await uploadApi.uploadImage(file);
    const mdImage = `![${file.name}](${url})`;
    const current = before + placeholder + after;
    emit('update:modelValue', current.replace(placeholder, mdImage));
  } catch (err: any) {
    // Remove placeholder on failure
    const current = before + placeholder + after;
    emit('update:modelValue', current.replace(placeholder, ''));
    uploadError.value = err.message || 'Image upload failed.';
    setTimeout(() => { uploadError.value = ''; }, 5000);
  } finally {
    isUploadingImage.value = false;
  }
};

// ─── Paste handler ───────────────────────────────────────────────────────────

const handlePaste = async (event: ClipboardEvent) => {
  const items = event.clipboardData?.items;
  if (!items) return;
  for (const item of Array.from(items)) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      event.preventDefault();
      const file = item.getAsFile();
      if (file) await uploadImageFile(file);
      return;
    }
  }
};

// ─── Drop handler ────────────────────────────────────────────────────────────

const handleDrop = async (event: DragEvent) => {
  const files = event.dataTransfer?.files;
  if (!files || files.length === 0) return;
  for (const file of Array.from(files)) {
    if (file.type.startsWith('image/')) {
      event.preventDefault();
      await uploadImageFile(file);
      return;
    }
  }
};

// ─── Toolbar image picker ─────────────────────────────────────────────────────

const fileInputRef = ref<HTMLInputElement | null>(null);
const triggerImagePicker = () => fileInputRef.value?.click();

const handleFileInputChange = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) await uploadImageFile(file);
  input.value = '';
};
</script>

<template>
  <div class="markdown-editor">
    <!-- Hidden file input for toolbar image button -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      style="display: none"
      @change="handleFileInputChange"
    />

    <!-- Toolbar -->
    <div class="toolbar">
      <button
        v-for="btn in toolbarButtons"
        :key="btn.label"
        type="button"
        :title="btn.title"
        @click="btn.label === '🖼' ? triggerImagePicker() : btn.action()"
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

    <!-- Upload error -->
    <div v-if="uploadError" class="upload-error">⚠ {{ uploadError }}</div>

    <!-- Editor / Preview -->
    <div v-if="!showPreview" class="editor-wrap">
      <textarea
        ref="textareaRef"
        :value="modelValue"
        @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
        @paste="handlePaste"
        @drop.prevent="handleDrop"
        @dragover.prevent
        :placeholder="placeholder ?? 'Write your content here… Markdown is supported. You can paste or drop images directly!'"
        :rows="rows ?? 8"
        :style="minHeight ? `min-height: ${minHeight}` : ''"
        class="editor-area"
        :class="{ 'editor-uploading': isUploadingImage }"
      />
      <!-- Upload overlay -->
      <div v-if="isUploadingImage" class="upload-overlay">
        <span class="upload-spinner" />
        <span>Uploading image…</span>
      </div>
    </div>
    <div v-else class="preview-area">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-if="previewHtml" class="prose-preview" v-html="previewHtml" />
      <p v-else class="preview-empty">Nothing to preview yet…</p>
    </div>

    <p class="markdown-hint">Markdown supported — <strong>bold</strong>, *italic*, `code`, ```blocks``` · Paste or drop images to upload</p>
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

.editor-wrap {
  position: relative;
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
  display: block;
}
.editor-area.editor-uploading {
  opacity: 0.6;
  pointer-events: none;
}

.upload-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: rgba(255,255,255,0.75);
  font-size: 14px;
  color: #4f46e5;
  font-weight: 500;
}

.upload-spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid #c7d2fe;
  border-top-color: #4f46e5;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.upload-error {
  padding: 6px 12px;
  background: #fef2f2;
  color: #dc2626;
  font-size: 12px;
  border-bottom: 1px solid #fecaca;
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
.prose-preview :deep(img) { max-width: 100%; border-radius: 6px; margin: 0.5em 0; }
</style>
