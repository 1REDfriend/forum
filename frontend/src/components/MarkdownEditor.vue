<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { uploadApi, usersApi } from '../api/index.js';
import { UploadCancelledError } from '../api/upload-chunked.js';
import { useAuthStore } from '../stores/auth.js';
import type { UserSuggestItem } from '../api/types.js';

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
const attachmentProgress = ref<{ name: string; pct: number } | null>(null);
let activeUpload: { cancel: () => void } | null = null;

// Only one upload (image or attachment) runs at a time: the textarea lock and
// trigger guards below both key off this. Without it, two concurrent uploads
// each capture their own stale before/after snapshot of modelValue and stomp
// each other's progress text on every tick, and a second attachment upload
// silently orphans the first (overwrites its progress display + cancel handle
// with no way to track or cancel it anymore).
const isUploadingAny = computed(() => isUploadingImage.value || attachmentProgress.value !== null);

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
  if (isUploadingAny.value) {
    uploadError.value = 'Wait for the current upload to finish first.';
    setTimeout(() => { uploadError.value = ''; }, 4000);
    return;
  }

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

// ─── Attachment upload helper ───────────────────────────────────────────────

// Keep in sync with backend/src/domain/attachment.ts's attachmentMarkdown —
// same escaping logic duplicated here since this runs in the browser.
const linkMarkdown = (name: string, url: string) =>
  `[${name.replace(/[[\]]/g, '\\$&')}](${url})`;

const uploadAttachmentFile = async (file: File) => {
  if (!authStore.isAuthenticated) {
    uploadError.value = 'You must be logged in to upload files.';
    setTimeout(() => { uploadError.value = ''; }, 4000);
    return;
  }
  if (isUploadingAny.value) {
    uploadError.value = 'Wait for the current upload to finish first.';
    setTimeout(() => { uploadError.value = ''; }, 4000);
    return;
  }
  uploadError.value = '';

  const placeholder = `[Uploading ${file.name}… 0%]()`;
  const textarea = textareaRef.value;
  const insertPos = textarea?.selectionStart ?? props.modelValue.length;
  const before = props.modelValue.substring(0, insertPos);
  const after = props.modelValue.substring(insertPos);
  let currentToken = placeholder;
  emit('update:modelValue', before + placeholder + after);

  const replaceToken = (next: string) => {
    const whole = before + currentToken + after;
    emit('update:modelValue', whole.replace(currentToken, next));
    currentToken = next;
  };

  attachmentProgress.value = { name: file.name, pct: 0 };
  const handle = uploadApi.uploadAttachment(file, (uploaded, total) => {
    const pct = Math.floor((uploaded / total) * 100);
    attachmentProgress.value = { name: file.name, pct };
    replaceToken(`[Uploading ${file.name}… ${pct}%]()`);
  });
  activeUpload = handle;

  try {
    const result = await handle.promise;
    replaceToken(linkMarkdown(file.name, result.url));
  } catch (err: any) {
    replaceToken(''); // remove placeholder
    if (!(err instanceof UploadCancelledError)) {
      uploadError.value = err?.message || 'File upload failed.';
      setTimeout(() => { uploadError.value = ''; }, 5000);
    }
  } finally {
    attachmentProgress.value = null;
    activeUpload = null;
  }
};

const cancelAttachment = () => activeUpload?.cancel();

// ─── @mention typeahead ─────────────────────────────────────────────────────
const mentionOpen = ref(false);
const mentionQuery = ref('');
const mentionStart = ref(-1);
const mentionSuggestions = ref<UserSuggestItem[]>([]);
const mentionLoading = ref(false);
let mentionTimer: ReturnType<typeof setTimeout> | null = null;

const detectMention = () => {
  const ta = textareaRef.value;
  if (!ta || !authStore.isAuthenticated) {
    mentionOpen.value = false;
    return;
  }
  const pos = ta.selectionStart ?? 0;
  const before = ta.value.slice(0, pos);
  const m = before.match(/(^|[\s(])@([^\s@[]{0,32})$/);
  if (!m) {
    mentionOpen.value = false;
    return;
  }
  mentionStart.value = pos - (m[2]?.length ?? 0) - 1; // index of @
  mentionQuery.value = m[2] ?? '';
  mentionOpen.value = true;
  if (mentionTimer) clearTimeout(mentionTimer);
  mentionTimer = setTimeout(async () => {
    if (!mentionQuery.value.trim()) {
      mentionSuggestions.value = [];
      return;
    }
    mentionLoading.value = true;
    try {
      const res = await usersApi.suggest(mentionQuery.value, 8);
      mentionSuggestions.value = res.users;
    } catch {
      mentionSuggestions.value = [];
    } finally {
      mentionLoading.value = false;
    }
  }, 200);
};

const pickMention = (u: UserSuggestItem) => {
  const ta = textareaRef.value;
  if (!ta || mentionStart.value < 0) return;
  const pos = ta.selectionStart ?? 0;
  const token = `[@${u.name}](user:${u.id})`;
  const next =
    props.modelValue.slice(0, mentionStart.value) + token + props.modelValue.slice(pos);
  emit('update:modelValue', next);
  mentionOpen.value = false;
  requestAnimationFrame(() => {
    const caret = mentionStart.value + token.length;
    ta.focus();
    ta.selectionStart = caret;
    ta.selectionEnd = caret;
  });
};

// ─── Paste handler ───────────────────────────────────────────────────────────

const handlePaste = async (event: ClipboardEvent) => {
  const items = event.clipboardData?.items;
  if (!items) return;
  for (const item of Array.from(items)) {
    if (item.kind !== 'file') continue;
    event.preventDefault();
    const file = item.getAsFile();
    if (!file) return;
    if (file.type.startsWith('image/')) await uploadImageFile(file);
    else await uploadAttachmentFile(file);
    return;
  }
};

// ─── Drop handler ────────────────────────────────────────────────────────────

const handleDrop = async (event: DragEvent) => {
  const files = event.dataTransfer?.files;
  if (!files || files.length === 0) return;
  for (const file of Array.from(files)) {
    event.preventDefault();
    if (file.type.startsWith('image/')) await uploadImageFile(file);
    else await uploadAttachmentFile(file);
    return;
  }
};

// ─── Toolbar image picker ─────────────────────────────────────────────────────

const fileInputRef = ref<HTMLInputElement | null>(null);
const triggerImagePicker = () => { if (!isUploadingAny.value) fileInputRef.value?.click(); };

const handleFileInputChange = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) await uploadImageFile(file);
  input.value = '';
};

// ─── Toolbar attachment picker ─────────────────────────────────────────────────

const attachInputRef = ref<HTMLInputElement | null>(null);
const triggerAttachPicker = () => { if (!isUploadingAny.value) attachInputRef.value?.click(); };

const handleAttachInputChange = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) await uploadAttachmentFile(file);
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
    <input ref="attachInputRef" type="file" style="display: none" @change="handleAttachInputChange" />

    <!-- Toolbar -->
    <div class="toolbar">
      <button
        v-for="btn in toolbarButtons"
        :key="btn.label"
        type="button"
        :title="btn.title"
        :disabled="btn.label === '🖼' && isUploadingAny"
        @click="btn.label === '🖼' ? triggerImagePicker() : btn.action()"
        class="toolbar-btn"
      >{{ btn.label }}</button>
      <button
        type="button"
        title="Attach File"
        :disabled="isUploadingAny"
        @click="triggerAttachPicker()"
        class="toolbar-btn"
      >📎</button>
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
    <div v-if="!showPreview" class="editor-wrap relative">
      <div
        v-if="mentionOpen && authStore.isAuthenticated"
        class="mention-menu"
      >
        <div v-if="mentionLoading" class="mention-item muted">Searching…</div>
        <div v-else-if="mentionSuggestions.length === 0" class="mention-item muted">
          {{ mentionQuery ? 'No users' : 'Type a name…' }}
        </div>
        <button
          v-for="u in mentionSuggestions"
          :key="u.id"
          type="button"
          class="mention-item"
          @mousedown.prevent="pickMention(u)"
        >
          <span class="font-semibold">@{{ u.name }}</span>
          <span class="muted">{{ u.tier }}</span>
        </button>
      </div>
      <textarea
        ref="textareaRef"
        :value="modelValue"
        @input="
          emit('update:modelValue', ($event.target as HTMLTextAreaElement).value);
          detectMention();
        "
        @keyup="detectMention"
        @paste="handlePaste"
        @drop.prevent="handleDrop"
        @dragover.prevent
        :placeholder="placeholder ?? 'Write your content here… Markdown is supported. You can paste or drop images directly!'"
        :rows="rows ?? 8"
        :style="minHeight ? `min-height: ${minHeight}` : ''"
        class="editor-area"
        :class="{ 'editor-uploading': isUploadingAny }"
      />
      <!-- Upload overlay -->
      <div v-if="isUploadingImage" class="upload-overlay">
        <span class="upload-spinner" />
        <span>Uploading image…</span>
      </div>
      <div v-if="attachmentProgress" class="upload-overlay">
        <span class="upload-spinner" />
        <span>Uploading {{ attachmentProgress.name }} — {{ attachmentProgress.pct }}%</span>
        <button type="button" class="tab-btn" @click="cancelAttachment">Cancel</button>
      </div>
    </div>
    <div v-else class="preview-area">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-if="previewHtml" class="prose-preview" v-html="previewHtml" />
      <p v-else class="preview-empty">Nothing to preview yet…</p>
    </div>

    <p class="markdown-hint">Markdown supported — <strong>bold</strong>, *italic*, `code`, ```blocks``` · Paste, drop, or attach any file (up to 10GB) — images embed, others link.</p>
  </div>
</template>

<style scoped>
.markdown-editor {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--color-background);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 8px;
  background: var(--color-background-soft);
  border-bottom: 1px solid var(--color-border);
  flex-wrap: wrap;
}

.toolbar-btn {
  padding: 3px 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text);
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
  font-family: monospace;
}
.toolbar-btn:hover { background: var(--color-background-mute); color: var(--color-heading); }

.toolbar-sep {
  flex: 1;
}

.tab-btn {
  padding: 3px 12px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-muted);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}
.tab-btn:hover { color: var(--color-indigo-600); }
.tab-active {
  background: var(--color-indigo-700) !important;
  color: white !important;
  border-color: var(--color-indigo-700) !important;
}

.editor-wrap {
  position: relative;
}

.mention-menu {
  position: absolute;
  z-index: 20;
  left: 12px;
  top: 8px;
  min-width: 12rem;
  max-width: 18rem;
  max-height: 12rem;
  overflow-y: auto;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.mention-item {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.45rem 0.75rem;
  font-size: 0.8125rem;
  text-align: left;
  color: var(--color-heading);
  background: transparent;
  border: none;
  cursor: pointer;
}
.mention-item:hover {
  background: var(--color-background-mute);
}
.mention-item.muted,
.mention-item .muted {
  color: var(--color-text-muted);
  font-size: 0.75rem;
  cursor: default;
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
  color: var(--color-heading);
  background: var(--color-background);
  min-height: 160px;
  display: block;
}
.editor-area::placeholder {
  color: var(--color-text-muted);
  opacity: 1;
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
  background: var(--glass-bg-strong);
  font-size: 14px;
  color: var(--color-indigo-600);
  font-weight: 500;
}

.upload-spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-indigo-600);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.upload-error {
  padding: 6px 12px;
  background: color-mix(in oklch, var(--color-error) 12%, transparent);
  color: var(--color-error);
  font-size: 12px;
  border-bottom: 1px solid color-mix(in oklch, var(--color-error) 25%, transparent);
}

.preview-area {
  padding: 14px 16px;
  min-height: 160px;
}
.preview-empty {
  color: var(--color-text-muted);
  font-style: italic;
  font-size: 14px;
}

.markdown-hint {
  font-size: 11px;
  color: var(--color-text-muted);
  padding: 4px 12px 6px;
  background: var(--color-background-soft);
  border-top: 1px solid var(--color-border);
  margin: 0;
}

/* reuse prose styles */
.prose-preview :deep(h1), .prose-preview :deep(h2), .prose-preview :deep(h3) {
  font-weight: 700; margin: 0.8em 0 0.3em; color: var(--color-heading);
}
.prose-preview :deep(p) { margin: 0.5em 0; line-height: 1.7; }
.prose-preview :deep(strong) { font-weight: 700; }
.prose-preview :deep(em) { font-style: italic; }
.prose-preview :deep(code) {
  background: var(--color-background-mute); border: 1px solid var(--color-border); border-radius: 4px;
  padding: 1px 5px; font-family: monospace; font-size: 0.875em; color: var(--color-indigo-700);
}
.prose-preview :deep(pre) {
  background: var(--color-background-mute); border: 1px solid var(--color-border); border-radius: 8px; padding: 0.8em 1em; overflow-x: auto; margin: 0.6em 0;
}
.prose-preview :deep(pre code) { background: none; border: none; padding: 0; color: var(--color-text); }
.prose-preview :deep(blockquote) {
  border-left: 3px solid var(--color-indigo-600); padding-left: 0.8em; color: var(--color-text-muted); font-style: italic; margin: 0.5em 0;
}
.prose-preview :deep(ul), .prose-preview :deep(ol) { padding-left: 1.4em; margin: 0.4em 0; }
.prose-preview :deep(li) { margin: 0.2em 0; }
.prose-preview :deep(a) { color: var(--color-indigo-600); text-decoration: underline; }
.prose-preview :deep(img) { max-width: 100%; border-radius: 6px; margin: 0.5em 0; }
</style>
