<script setup lang="ts">
import { ref } from 'vue';
import { reportsApi } from '../api/index.js';
import { useAuthStore } from '../stores/auth.js';

const props = defineProps<{ targetType: 'thread' | 'post' | 'user'; targetId: number }>();
const auth = useAuthStore();

const open = ref(false);
const reason = ref('');
const sending = ref(false);
const done = ref('');
const error = ref('');

const submit = async () => {
  if (reason.value.trim().length < 3) {
    error.value = 'กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร';
    return;
  }
  sending.value = true;
  error.value = '';
  try {
    const r = await reportsApi.create({
      targetType: props.targetType,
      targetId: props.targetId,
      reason: reason.value.trim(),
    });
    done.value = r.message;
    reason.value = '';
    setTimeout(() => {
      open.value = false;
      done.value = '';
    }, 1500);
  } catch (e: any) {
    error.value = e.message || 'ส่งรายงานไม่สำเร็จ';
  } finally {
    sending.value = false;
  }
};
</script>

<template>
  <span v-if="auth.isAuthenticated">
    <button
      @click="open = true"
      class="text-xs text-gray-400 hover:text-red-500 transition-colors"
      title="รายงาน"
    >
      🚩 รายงาน
    </button>

    <teleport to="body">
      <div
        v-if="open"
        class="fixed inset-0 z-[100] flex items-center justify-center p-4"
        @click.self="open = false"
      >
        <div class="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
        <div class="glass-strong relative rounded-2xl p-6 w-full max-w-sm">
          <h3 class="text-lg font-bold text-gray-900 mb-1">รายงานเนื้อหา</h3>
          <p class="text-xs text-gray-500 mb-3">ช่วยบอกเหตุผลที่รายงาน</p>
          <textarea
            v-model="reason"
            rows="3"
            maxlength="500"
            placeholder="เช่น สแปม, เนื้อหาไม่เหมาะสม…"
            class="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-y bg-white/70"
          ></textarea>
          <p v-if="error" class="text-xs text-red-500 mt-1">{{ error }}</p>
          <p v-if="done" class="text-xs text-green-600 mt-1">{{ done }}</p>
          <div class="flex gap-2 justify-end mt-4">
            <button @click="open = false" class="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
              ยกเลิก
            </button>
            <button
              @click="submit"
              :disabled="sending"
              class="px-4 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
            >
              {{ sending ? 'กำลังส่ง…' : 'ส่งรายงาน' }}
            </button>
          </div>
        </div>
      </div>
    </teleport>
  </span>
</template>
