<script setup lang="ts">
import { computed } from 'vue';
import type { PostAuthor } from '../api/types.js';
import { tierStyle } from '../api/types.js';

const props = defineProps<{ author: PostAuthor }>();

const initials = computed(() =>
  (props.author.name || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2),
);

const ts = computed(() => tierStyle(props.author.tier));

// Safely quote the banner URL so it can't break out of the CSS url() context.
const bannerStyle = computed(() =>
  props.author.banner ? { backgroundImage: `url(${JSON.stringify(props.author.banner)})` } : {},
);
</script>

<template>
  <aside class="pcard">
    <div class="pcard-banner" :style="bannerStyle">
      <div v-if="!author.banner" class="pcard-banner-fallback" />
    </div>

    <div class="pcard-avatar-wrap">
      <img v-if="author.avatar" :src="author.avatar" :alt="author.name" class="pcard-avatar" />
      <div v-else class="pcard-avatar pcard-avatar-fallback">{{ initials }}</div>
    </div>

    <div class="pcard-body">
      <router-link :to="`/user/${author.id}`" class="pcard-name">{{ author.name }}</router-link>

      <div class="pcard-badges">
        <span v-if="author.role === 'admin'" class="pcard-badge pcard-role">ADMIN</span>
        <span
          class="pcard-badge pcard-tier"
          :style="{ background: ts.bg, color: ts.color, borderColor: ts.ring }"
        >{{ ts.icon }} {{ ts.label }}</span>
      </div>

      <p v-if="author.bio" class="pcard-bio">{{ author.bio }}</p>
    </div>
  </aside>
</template>

<style scoped>
.pcard {
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  overflow: hidden;
  text-align: center;
}
.pcard-banner {
  height: 56px;
  background-size: cover;
  background-position: center;
  background-color: #14264a;
}
.pcard-banner-fallback {
  height: 100%;
  background: linear-gradient(135deg, #6366f1, #a855f7);
}
.pcard-avatar-wrap {
  margin-top: -28px;
  line-height: 0;
}
.pcard-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 3px solid #fff;
  object-fit: cover;
  background: #fff;
  display: inline-block;
}
.pcard-avatar-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #6366f1;
  color: #fff;
  font-weight: 700;
  font-size: 1.1rem;
}
.pcard-body {
  padding: 6px 12px 14px;
}
.pcard-name {
  display: block;
  font-weight: 700;
  color: #f1f5f9;
  font-size: 0.9rem;
  text-decoration: none;
  margin-top: 4px;
  word-break: break-word;
}
.pcard-name:hover {
  color: #93c5fd;
}
.pcard-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
  margin: 6px 0 0;
}
.pcard-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  border: 1px solid transparent;
  white-space: nowrap;
}
.pcard-role {
  background: rgba(245, 158, 11, 0.15);
  color: #fcd34d;
}
.pcard-bio {
  font-size: 11px;
  color: #94a3b8;
  margin: 8px 0 0;
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}
</style>
