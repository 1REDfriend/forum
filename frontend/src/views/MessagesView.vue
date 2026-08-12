<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { extrasApi } from '../api/index.js';
import { useQuery, useQueryClient } from '@tanstack/vue-query';
import { useAuthStore } from '../stores/auth.js';

type Peer = {
  id: string;
  name: string;
  avatar: string | null;
};

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const qc = useQueryClient();
const activeId = computed(() => (route.params.id as string) || '');
const draft = ref('');
const sending = ref(false);

const { data: convData, isPending: loadingList } = useQuery({
  queryKey: ['dm', 'list'],
  queryFn: () => extrasApi.listConversations(),
});
const conversations = computed(() => convData.value?.conversations ?? []);

const activePeer = computed<Peer | null>(() => {
  const c = conversations.value.find((x: { id: string }) => x.id === activeId.value);
  return (c?.other as Peer) ?? null;
});

const { data: msgData, isPending: loadingMsgs, refetch: refetchMsgs } = useQuery({
  queryKey: computed(() => ['dm', 'messages', activeId.value]),
  queryFn: () => extrasApi.listMessages(activeId.value),
  enabled: computed(() => !!activeId.value),
  // refresh so read receipts (✓✓) update when peer opens chat
  refetchInterval: 15_000,
});
const messages = computed(() => msgData.value?.data ?? []);

const openOther = async (userId: string) => {
  const c = await extrasApi.openDm(userId);
  await qc.invalidateQueries({ queryKey: ['dm'] });
  router.push(`/messages/${c.id}`);
};

watch(
  () => route.query.user,
  async (uid) => {
    if (typeof uid === 'string' && uid) {
      await openOther(uid);
      router.replace({ path: route.path, query: {} });
    }
  },
  { immediate: true },
);

const send = async () => {
  if (!activeId.value || !draft.value.trim()) return;
  sending.value = true;
  try {
    await extrasApi.sendMessage(activeId.value, draft.value.trim());
    draft.value = '';
    await refetchMsgs();
    await qc.invalidateQueries({ queryKey: ['dm', 'list'] });
  } finally {
    sending.value = false;
  }
};

const initials = (name?: string) =>
  (name || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

const isMine = (senderId: string) => senderId === auth.user?.id;

const formatMsgTime = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('th-TH', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const avatarFor = (m: { senderId: string; senderAvatar?: string | null; senderName?: string }) => {
  if (isMine(m.senderId)) return auth.user?.avatar ?? null;
  return m.senderAvatar || activePeer.value?.avatar || null;
};

const nameFor = (m: { senderId: string; senderName?: string }) => {
  if (isMine(m.senderId)) return auth.user?.name ?? 'You';
  return m.senderName || activePeer.value?.name || '?';
};
</script>

<template>
  <div class="flex min-h-screen w-full justify-center">
    <div class="w-full max-w-5xl mx-auto pt-24 px-4 sm:px-6 pb-12 grid md:grid-cols-12 gap-4">
      <!-- Conversation list -->
      <aside class="glass md:col-span-4 overflow-hidden flex flex-col max-h-[70vh]">
        <div class="px-4 py-3 border-b border-(--color-border) font-bold text-(--color-heading) shrink-0">
          Messages
        </div>
        <div class="overflow-y-auto flex-1 min-h-0">
          <div v-if="loadingList" class="p-4 text-sm text-(--color-text-muted)">Loading…</div>
          <router-link
            v-for="c in conversations"
            :key="c.id"
            :to="`/messages/${c.id}`"
            class="flex items-center gap-3 px-4 py-3 border-b border-(--color-border) hover:bg-(--color-background-mute) transition-colors"
            :class="activeId === c.id ? 'bg-sky-500/10' : ''"
          >
            <img
              v-if="c.other?.avatar"
              :src="c.other.avatar"
              :alt="c.other.name"
              class="w-10 h-10 rounded-full object-cover bg-(--color-background-mute) shrink-0"
            />
            <div
              v-else
              class="w-10 h-10 rounded-full bg-(--color-background-mute) text-sky-600 text-xs font-bold flex items-center justify-center shrink-0"
            >
              {{ initials(c.other?.name) }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="font-semibold text-(--color-heading) truncate">{{ c.other?.name }}</p>
              <p class="text-xs text-(--color-text-muted) truncate">
                {{ formatMsgTime(c.lastMessageAt) }}
              </p>
            </div>
          </router-link>
          <div
            v-if="!loadingList && conversations.length === 0"
            class="p-6 text-sm text-(--color-text-muted) space-y-2"
          >
            <p class="font-medium text-(--color-heading)">ยังไม่มีข้อความ</p>
            <p>เปิดโปรไฟล์คนอื่น แล้วกดปุ่ม <strong>Message</strong></p>
          </div>
        </div>
      </aside>

      <!-- Chat -->
      <section class="md:col-span-8 flex flex-col min-h-[24rem] max-h-[70vh]">
        <div
          v-if="!activeId"
          class="glass flex-1 flex items-center justify-center text-(--color-text-muted) text-sm p-8"
        >
          เลือกการสนทนาทางซ้าย หรือเปิด Message จากโปรไฟล์
        </div>

        <div v-else class="glass flex-1 flex flex-col min-h-0 overflow-hidden">
          <!-- Thin header: peer name only (no big profile card) -->
          <div
            v-if="activePeer"
            class="px-4 py-2.5 border-b border-(--color-border) flex items-center gap-2 shrink-0"
          >
            <img
              v-if="activePeer.avatar"
              :src="activePeer.avatar"
              :alt="activePeer.name"
              class="w-8 h-8 rounded-full object-cover"
            />
            <div
              v-else
              class="w-8 h-8 rounded-full bg-(--color-background-mute) text-sky-600 text-xs font-bold flex items-center justify-center"
            >
              {{ initials(activePeer.name) }}
            </div>
            <router-link
              :to="`/user/${activePeer.id}`"
              class="font-semibold text-(--color-heading) hover:text-sky-600 truncate"
            >
              {{ activePeer.name }}
            </router-link>
          </div>

          <div class="flex-1 overflow-y-auto p-4 space-y-3">
            <div v-if="loadingMsgs" class="text-sm text-(--color-text-muted)">Loading…</div>
            <div
              v-for="m in messages"
              :key="m.id"
              class="flex gap-2 items-end"
              :class="isMine(m.senderId) ? 'flex-row-reverse' : 'flex-row'"
            >
              <!-- Profile icon -->
              <img
                v-if="avatarFor(m)"
                :src="avatarFor(m)!"
                :alt="nameFor(m)"
                class="w-8 h-8 rounded-full object-cover shrink-0 bg-(--color-background-mute)"
              />
              <div
                v-else
                class="w-8 h-8 rounded-full bg-(--color-background-mute) text-sky-600 text-[10px] font-bold flex items-center justify-center shrink-0"
              >
                {{ initials(nameFor(m)) }}
              </div>

              <div
                class="rounded-2xl px-3 py-2 text-sm max-w-[75%]"
                :class="
                  isMine(m.senderId)
                    ? 'bg-indigo-700 text-white rounded-br-md'
                    : 'bg-(--color-background-mute) text-(--color-heading) rounded-bl-md'
                "
              >
                <p class="whitespace-pre-wrap break-words">{{ m.body }}</p>
                <div
                  class="flex items-center gap-1.5 mt-1 justify-end"
                  :class="isMine(m.senderId) ? 'text-indigo-100/90' : 'text-(--color-text-muted)'"
                >
                  <time class="text-[10px] tabular-nums">{{ formatMsgTime(m.createdAt) }}</time>
                  <!-- Read receipts: only for my messages -->
                  <span
                    v-if="isMine(m.senderId)"
                    class="inline-flex items-center text-[11px] leading-none select-none"
                    :title="m.readAt ? 'อ่านแล้ว' : 'ส่งแล้ว'"
                    :class="m.readAt ? 'text-sky-300' : 'text-indigo-200/80'"
                    :aria-label="m.readAt ? 'Read' : 'Sent'"
                  >
                    <!-- single check = sent -->
                    <template v-if="!m.readAt">✓</template>
                    <!-- double check = read -->
                    <template v-else>✓✓</template>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <form class="border-t border-(--color-border) p-3 flex gap-2 shrink-0" @submit.prevent="send">
            <input
              v-model="draft"
              class="flex-1 rounded-lg border border-(--color-border) bg-(--color-background) px-3 py-2 text-sm"
              placeholder="Type a message…"
            />
            <button
              type="submit"
              class="px-4 py-2 rounded-lg bg-indigo-700 text-white text-sm font-medium disabled:opacity-50"
              :disabled="sending || !draft.trim()"
            >
              Send
            </button>
          </form>
        </div>
      </section>
    </div>
  </div>
</template>
