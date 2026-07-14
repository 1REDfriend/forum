<script setup lang="ts">
import { computed } from 'vue';
import type { ForumWithStats } from '../api/types.js';
import { useAuthStore } from '../stores/auth.js';
import { motion, px } from 'motion-v';
import { fadeLeft, fadeUp, heroContainer, scaleIn } from '@/components/animations/Animation.ts';
import { useForums } from '../composables/useForums.js';

const authStore = useAuthStore();
// Errors are non-critical here (landing page still renders without forum data),
// so we intentionally don't surface `error` from the query.
const { data: forumsData, isPending: isLoading } = useForums();
const forums = computed<ForumWithStats[]>(() => forumsData.value ?? []);
// Sort by postCount desc, take top 3
const topForums = computed<ForumWithStats[]>(() =>
  [...forums.value].sort((a, b) => (b.postCount ?? 0) - (a.postCount ?? 0)).slice(0, 3),
);

const features = [
  {
    icon: '💬',
    title: 'ถามตอบและแลกเปลี่ยน',
    desc: 'พื้นที่เปิดกว้างสำหรับตั้งกระทู้ แลกเปลี่ยนความรู้ และขอคำแนะนำจากชุมชน',
  },
  {
    icon: '🏷️',
    title: 'หมวดหมู่ชัดเจน',
    desc: 'แบ่งหัวข้อเป็นหมวดหมู่ที่เป็นระเบียบ ค้นหาสิ่งที่ต้องการได้ง่ายและรวดเร็ว',
  },
  {
    icon: '📝',
    title: 'Markdown & รูปภาพ',
    desc: 'เขียนด้วย Markdown พร้อมวาง/ลากรูปภาพลงโพสต์ได้โดยตรง ไม่ต้องอัปโหลดแยก',
  },
  {
    icon: '🔍',
    title: 'ค้นหาอัจฉริยะ',
    desc: 'ค้นหากระทู้และฟอรัมทั้งหมดได้ทันทีด้วยระบบ Search ที่ครอบคลุม',
  },
  {
    icon: '👍',
    title: 'Like & Engage',
    desc: 'กด Like โพสต์และกระทู้ที่ชอบ สร้าง engagement และยกระดับคุณภาพเนื้อหา',
  },
  {
    icon: '🔒',
    title: 'ปลอดภัยและเชื่อถือได้',
    desc: 'ระบบ Authentication ครบครัน รองรับ Google OAuth และการจัดการโดย Admin',
  },
];

const stats = [
  { value: forums.value.length || '∞', label: 'ฟอรัม' },
  { value: '24/7', label: 'เปิดให้บริการ' },
  { value: '100%', label: 'ฟรี' },
];

const formatCount = (n: number) => {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
};
</script>

<template>
  <motion.div class="landing" 
  :variants="heroContainer" 
  initial="hidden"
  animate="show"
    >
    <!-- ══ HERO ══════════════════════════════════════════════════════════════ -->
    <section class="hero">
      <div class="hero-bg-shapes">
        <div class="shape shape-1" />
        <div class="shape shape-1_1" />
        <div class="shape shape-2" />
        <div class="shape shape-3" />
      </div>
      <div class="hero-content">
        <motion.div class="hero-badge" :variants="scaleIn">Community Forum Platform (Beta 0.3.1)</motion.div>
        <motion.h1 class="hero-title" 
        :variants="fadeUp"
        >
          พื้นที่แลกเปลี่ยน<br />
          <span class="hero-gradient">ความรู้และไอเดีย</span>
        </motion.h1>
        <motion.p class="hero-desc" :variants="fadeLeft">
          ระบบฟอรัมที่ออกแบบมาเพื่อชุมชน ให้เหนือกว่าจินตนาการ<br /> 
          การตั้งกระทู้ ตอบคำถาม แบ่งปันประสบการณ์<br />
          พร้อมฟีเจอร์ Markdown จนถึงการอัปโหลดรูปภาพของคุณ
        </motion.p>
        <div class="hero-actions">
          <router-link v-if="!authStore.isAuthenticated" to="/register" class="btn-primary">
            เริ่มต้นใช้งาน ฟรี →
          </router-link>
          <router-link to="/forums" class="btn-secondary" v-if="forums.length > 0">
            ดูฟอรัมทั้งหมด
          </router-link>
          <router-link v-else to="/login" class="btn-secondary">
            เข้าสู่ระบบ
          </router-link>
        </div>
        <!-- Stats bar -->
        <div class="hero-stats">
          <motion.div class="stat-item" :variants="fadeUp">
            <span class="stat-val">{{ isLoading ? '…' : forums.length }}</span>
            <span class="stat-label">ฟอรัม</span>
          </motion.div>
          <div class="stat-divider" />
          <motion.div class="stat-item" :variants="fadeUp">
            <span class="stat-val">24h</span>
            <span class="stat-label">เปิดให้บริการ</span>
          </motion.div>
          <div class="stat-divider" />
          <motion.div class="stat-item" :variants="fadeUp">
            <span class="stat-val">99%</span>
            <span class="stat-label">ฟรี</span>
          </motion.div>
        </div>
      </div>
      <!-- Hero illustration -->
      <div class="hero-visual">
        <div class="visual-card card-main">
          <div class="card-header">
            <div class="card-dot red" /><div class="card-dot yellow" /><div class="card-dot green" />
          </div>
          <div class="card-body">
            <div class="mock-thread">
              <div class="mock-avatar" style="background:#6366f1">💡</div>
              <div class="mock-text">
                <div class="mock-line wide" />
                <div class="mock-line medium" />
              </div>
            </div>
            <div class="mock-thread">
              <div class="mock-avatar" style="background:#8b5cf6">🔥</div>
              <div class="mock-text">
                <div class="mock-line wide" />
                <div class="mock-line short" />
              </div>
            </div>
            <div class="mock-thread">
              <div class="mock-avatar" style="background:#06b6d4">❓</div>
              <div class="mock-text">
                <div class="mock-line medium" />
                <div class="mock-line short" />
              </div>
            </div>
          </div>
        </div>
        <div class="visual-card card-badge badge-like">👍 +128</div>
        <div class="visual-card card-badge badge-reply">💬 42 replies</div>
      </div>
    </section>

    <!-- ══ FEATURES ══════════════════════════════════════════════════════════ -->
    <section class="section features-section">
      <motion.div class="section-inner" 
      :initial="{ opacity: 0, scale: 0.8, y: 40}"
      :whileInView="{ opacity: 1, scale: 1, y: 0}"
      >
        <div class="section-label">ฟีเจอร์หลัก</div>
        <h2 class="section-title">ฟีดเจอร์ที่สามารถเลือกใช้ได้</h2>
        <p class="section-desc">ระบบฟอรัมที่พัฒนามาอย่างครบคัน พร้อมใช้งานได้ทันที</p>
        <div class="features-grid">
          <div v-for="f in features" :key="f.title" class="feature-card">
            <div class="feature-icon">{{ f.icon }}</div>
            <h3 class="feature-title">{{ f.title }}</h3>
            <p class="feature-desc">{{ f.desc }}</p>
          </div>
        </div>
      </motion.div>
    </section>

    <!-- ══ HOW IT WORKS ══════════════════════════════════════════════════════ -->
    <section class="section how-section">
      <motion.div class="section-inner section-glass rounded-xl"
      :initial="{ opacity: 0, scale: 0.8, y: 40}"
      :whileInView="{ opacity: 1, scale: 1, y: 0}"
      >
        <div class="section-label pt-4">วิธีใช้งาน</div>
        <h2 class="section-title">เริ่มต้นง่าย ใน <span class="text-indigo-600">3</span> ขั้นตอน</h2>
        <div class="steps">
          <div class="step">
            <div class="step-num">1</div>
            <h3 class="step-title">สมัครสมาชิก</h3>
            <p class="step-desc">สร้างบัญชีฟรีด้วยอีเมล หรือล็อกอินผ่าน Google ได้ทันที</p>
          </div>
          <div class="step-arrow">→</div>
          <div class="step">
            <div class="step-num">2</div>
            <h3 class="step-title">เลือกฟอรัม</h3>
            <p class="step-desc">เลือกหมวดหมู่ที่สนใจ แล้วเริ่มอ่านหรือตั้งกระทู้ใหม่</p>
          </div>
          <div class="step-arrow">→</div>
          <div class="step">
            <div class="step-num">3</div>
            <h3 class="step-title">แลกเปลี่ยนความรู้</h3>
            <p class="step-desc">ตอบกระทู้ กด Like และสร้างคอนเทนต์ที่มีคุณภาพกับชุมชน</p>
          </div>
        </div>
        <div class="how-cta pb-4">
          <router-link v-if="!authStore.isAuthenticated" to="/register" class="btn-primary">
            สมัครสมาชิก ฟรี →
          </router-link>
          <router-link v-else to="/" class="btn-primary">
            ไปที่ฟอรัม →
          </router-link>
        </div>
      </motion.div>
    </section>

    <!-- ══ TOP 3 FORUMS ══════════════════════════════════════════════════════ -->
    <section class="section top-forums-section">
      <motion.div class="section-inner" 
      :initial="{ opacity: 0, scale: 0.8, y: 40}"
      :whileInView="{ opacity: 1, scale: 1, y: 0}"
      >
        <div class="section-label">🏆 ยอดนิยม</div>
        <h2 class="section-title">ฟอรัมที่มีคนเข้าชมมากที่สุด</h2>
        <p class="section-desc">ร่วมพูดคุยในฟอรัมยอดนิยมที่มีการอัปเดตอยู่เสมอ</p>

        <!-- Loading skeletons -->
        <div v-if="isLoading" class="top-forums-grid">
          <div v-for="i in 3" :key="i" class="top-forum-card skeleton-card">
            <div class="sk-rank" />
            <div class="sk-body">
              <div class="sk-line wide" />
              <div class="sk-line medium" />
              <div class="sk-stats">
                <div class="sk-stat" /><div class="sk-stat" />
              </div>
            </div>
          </div>
        </div>

        <!-- Actual forums -->
        <div v-else-if="topForums.length > 0" class="top-forums-grid">
          <router-link
            v-for="(forum, idx) in topForums"
            :key="forum.id"
            :to="`/forum/${forum.id}`"
            class="top-forum-card"
            :class="`rank-${idx + 1}`"
          >
            <div class="top-rank">
              <span v-if="idx === 0">🥇</span>
              <span v-else-if="idx === 1">🥈</span>
              <span v-else>🥉</span>
            </div>
            <div class="top-forum-body">
              <div class="top-forum-avatar">{{ forum.name.charAt(0).toUpperCase() }}</div>
              <div class="top-forum-info">
                <h3 class="top-forum-name">{{ forum.name }}</h3>
                <p v-if="forum.description" class="top-forum-desc">{{ forum.description }}</p>
              </div>
            </div>
            <div class="top-forum-stats">
              <div class="top-stat">
                <span class="top-stat-val">{{ formatCount(forum.postCount ?? 0) }}</span>
                <span class="top-stat-label">โพสต์</span>
              </div>
              <div class="top-stat">
                <span class="top-stat-val">{{ formatCount(forum.threadCount ?? 0) }}</span>
                <span class="top-stat-label">กระทู้</span>
              </div>
            </div>
            <div class="top-forum-arrow">→</div>
          </router-link>
        </div>

        <!-- Empty -->
        <div v-else class="top-forums-empty">
          <p>ยังไม่มีฟอรัม — เป็นคนแรกที่สร้างฟอรัม!</p>
          <router-link v-if="authStore.isAuthenticated" to="/forum/create" class="btn-primary" style="margin-top:16px">
            + สร้างฟอรัมแรก
          </router-link>
        </div>

        <div class="see-all-wrap">
          <router-link to="/forums" class="see-all-link">ดูฟอรัมทั้งหมด →</router-link>
        </div>
      </motion.div>
    </section>

    <!-- ══ CTA FOOTER ════════════════════════════════════════════════════════ -->
    <section class="cta-section">
      <div class="cta-inner">
        <h2 class="cta-title">พร้อมเข้าร่วมชุมชนแล้วหรือยัง?</h2>
        <p class="cta-desc">สมัครฟรี ไม่มีค่าใช้จ่าย เริ่มต้นได้ทันที</p>
        <div class="cta-actions">
          <router-link v-if="!authStore.isAuthenticated" to="/register" class="btn-primary btn-large">
            เริ่มต้นใช้งาน →
          </router-link>
          <router-link v-else to="/" class="btn-primary btn-large">
            ไปที่ฟอรัม →
          </router-link>
        </div>
      </div>
    </section>
  </motion.div>
</template>

<style scoped>
/* ── Base ──────────────────────────────────────────────────────────── */
.landing {
  min-height: 100vh;
  font-family: 'Inter', 'Outfit', sans-serif;
  background: transparent;
  color: var(--color-text);
  overflow-x: hidden;
}

/* ── HERO ───────────────────────────────────────────────────────────── */
.hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 48px;
  padding: 120px 64px 80px;
  overflow: hidden;
  background: var(--color-background);
}

.hero-bg-shapes { position: absolute; inset: 0; pointer-events: none; }
.shape {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: var(--hero-shape-opacity, 0.18);
  animation: float 8s ease-in-out infinite;
}
.shape-1 { width: 1000px; height: 1000px; background: var(--color-indigo-400); top: -500px; left: -450px; animation-delay: 0s; }
.shape-1_1 { width: 500px; height: 500px; background: var(--color-violet-400); top: -300px; left: 250px; animation-delay: 0s; }
.shape-2 { width: 400px; height: 400px; background: var(--color-indigo-600); bottom: -100px; right: 200px; animation-delay: 3s; }
.shape-3 { width: 300px; height: 300px; background: var(--color-violet-600); top: 50%; right: -50px; animation-delay: 1.5s; }

.hero-content { flex: 1; max-width: 600px; position: relative; z-index: 1; }

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  color: var(--color-heading);
  font-size: 13px;
  font-weight: 600;
  padding: 6px 16px;
  border-radius: 100px;
  margin-bottom: 24px;
}

.hero-title {
  font-size: clamp(2.2rem, 5vw, 3.5rem);
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.02em;
  margin: 0 0 20px;
  color: var(--color-heading);
}
.hero-gradient {
  background: linear-gradient(135deg, var(--color-indigo-700) 0%, var(--color-indigo-500) 50%, var(--color-indigo-400) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-desc {
  font-size: 1.05rem;
  line-height: 1.8;
  color: var(--color-text);
  margin: 0 0 36px;
}

.hero-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 40px;
}

.hero-stats {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 16px 24px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  box-shadow: var(--glass-shadow);
  width: fit-content;
}
.stat-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.stat-val { font-size: 1.4rem; font-weight: 800; color: var(--color-heading); }
.stat-label { font-size: 11px; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.stat-divider { width: 1px; height: 32px; background: var(--color-border); }

/* Hero visual */
.hero-visual {
  flex: 0 0 420px;
  position: relative;
  z-index: 1;
}
.visual-card { border-radius: 16px; }
.card-main {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  padding: 0;
  overflow: hidden;
  animation: float-card 6s ease-in-out infinite;
}
.card-header {
  display: flex;
  gap: 6px;
  padding: 12px 16px;
  background: var(--color-background-mute);
  border-bottom: 1px solid var(--color-border);
}
.card-dot { width: 10px; height: 10px; border-radius: 50%; }
.card-dot.red { background: #ef4444; }
.card-dot.yellow { background: #f59e0b; }
.card-dot.green { background: #22c55e; }
.card-body { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
.mock-thread { display: flex; align-items: center; gap: 12px; }
.mock-avatar {
  width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; font-size: 16px;
}
.mock-text { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.mock-line { height: 8px; border-radius: 4px; background: var(--color-background-mute); }
.mock-line.wide { width: 85%; }
.mock-line.medium { width: 55%; }
.mock-line.short { width: 35%; }

.card-badge {
  position: absolute;
  background: var(--glass-bg-strong);
  border: 1px solid var(--glass-border);
  box-shadow: var(--glass-shadow);
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-heading);
  white-space: nowrap;
}
.badge-like { bottom: -20px; left: -20px; animation: pulse-badge 3s ease-in-out infinite; }
.badge-reply { top: 30px; right: -30px; animation: pulse-badge 3s ease-in-out infinite 1.5s; }

/* ── Buttons ───────────────────────────────────────────────────────── */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 28px;
  background: var(--color-indigo-700);
  color: white;
  font-size: 15px;
  font-weight: 600;
  border-radius: 100px;
  text-decoration: none;
  transition: all 0.25s;
  box-shadow: 0 8px 24px color-mix(in oklch, var(--color-indigo-700) 35%, transparent);
}
.btn-primary:hover {
  background: var(--color-indigo-600);
  transform: translateY(-2px);
  box-shadow: 0 12px 30px color-mix(in oklch, var(--color-indigo-600) 45%, transparent);
}
.btn-primary.btn-large { padding: 16px 40px; font-size: 16px; }

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 28px;
  background: var(--color-background);
  color: var(--color-heading);
  font-size: 15px;
  font-weight: 600;
  border-radius: 100px;
  text-decoration: none;
  border: 1px solid var(--color-border);
  transition: all 0.25s;
}
.btn-secondary:hover {
  background: var(--color-background-soft);
  border-color: var(--color-border-hover);
  transform: translateY(-2px);
}

/* ── Section common ─────────────────────────────────────────────────── */
.section { padding: 96px 0; }
.section-inner { max-width: 1100px; margin: 0 auto; padding: 0 32px; }
.section-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-indigo-600);
  margin-bottom: 12px;
}
.section-title {
  font-size: clamp(1.8rem, 3vw, 2.5rem);
  font-weight: 800;
  color: var(--color-heading);
  margin: 0 0 12px;
  letter-spacing: -0.02em;
}
.section-desc {
  font-size: 1rem;
  color: var(--color-text-muted);
  margin: 0 0 56px;
}
.section-glass {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-bottom: 1px solid var(--color-border);
  box-shadow: var(--glass-shadow);
  transition: background 0.3s ease, border-color 0.3s ease;
}

/* ── Features ───────────────────────────────────────────────────────── */
.features-section { background: transparent; }
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}
.feature-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  padding: 28px;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
  box-shadow: var(--glass-shadow);
}
.feature-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, color-mix(in oklch, var(--color-indigo-400) 15%, transparent), transparent);
  opacity: 0;
  transition: opacity 0.3s;
}
.feature-card:hover {
  border-color: color-mix(in oklch, var(--color-indigo-500) 45%, transparent);
  transform: translateY(-4px);
  box-shadow: var(--shadow-hover);
}
.feature-card:hover::before { opacity: 1; }
.feature-icon { font-size: 2rem; margin-bottom: 16px; }
.feature-title { font-size: 1.05rem; font-weight: 700; color: var(--color-heading); margin: 0 0 8px; }
.feature-desc { font-size: 0.9rem; color: var(--color-text-muted); line-height: 1.7; margin: 0; }

/* ── How it works ───────────────────────────────────────────────────── */
.steps {
  display: flex;
  align-items: flex-start;
  gap: 24px;
  margin-bottom: 48px;
  flex-wrap: wrap;
}
.step {
  flex: 1;
  min-width: 200px;
  text-align: center;
  padding: 32px 24px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  transition: all 0.3s;
  box-shadow: var(--glass-shadow);
}
.step:hover {
  border-color: color-mix(in oklch, var(--color-indigo-500) 45%, transparent);
  transform: translateY(-4px);
  box-shadow: var(--shadow-hover);
}
.step-num {
  width: 52px; height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-indigo-600), var(--color-indigo-700));
  color: white;
  font-size: 1.3rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  box-shadow: 0 8px 20px color-mix(in oklch, var(--color-indigo-600) 35%, transparent);
}
.step-title { font-size: 1rem; font-weight: 700; color: var(--color-heading); margin: 0 0 8px; }
.step-desc { font-size: 0.875rem; color: var(--color-text-muted); line-height: 1.6; margin: 0; }
.step-arrow {
  font-size: 1.5rem;
  color: var(--color-indigo-600);
  padding-top: 48px;
  flex-shrink: 0;
}
.how-cta { text-align: center; }

/* ── Top Forums ─────────────────────────────────────────────────────── */
.top-forums-section { background: transparent; }
.top-forums-grid { display: flex; flex-direction: column; gap: 16px; margin-bottom: 32px; }
.top-forum-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px 28px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  text-decoration: none;
  color: inherit;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
  box-shadow: var(--glass-shadow);
}
.top-forum-card::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0; width: 4px;
  background: linear-gradient(135deg, var(--color-indigo-600), var(--color-indigo-700));
  border-radius: 0 2px 2px 0;
}
.top-forum-card.rank-1::before { background: linear-gradient(135deg, #ffd700, #ffb300); }
.top-forum-card.rank-2::before { background: linear-gradient(135deg, #c0c0c0, #9ca3af); }
.top-forum-card.rank-3::before { background: linear-gradient(135deg, #cd7f32, #a16207); }
.top-forum-card:hover {
  border-color: color-mix(in oklch, var(--color-indigo-500) 45%, transparent);
  transform: translateX(6px);
  box-shadow: var(--shadow-hover);
}

.top-rank { font-size: 1.8rem; flex-shrink: 0; }
.top-forum-body { display: flex; align-items: center; gap: 16px; flex: 1; min-width: 0; }
.top-forum-avatar {
  width: 48px; height: 48px;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--color-indigo-600), var(--color-indigo-700));
  display: flex; align-items: center; justify-content: center;
  font-size: 1.3rem; font-weight: 800;
  color: white; flex-shrink: 0;
  box-shadow: 0 6px 16px color-mix(in oklch, var(--color-indigo-600) 30%, transparent);
}
.top-forum-info { min-width: 0; }
.top-forum-name {
  font-size: 1.05rem; font-weight: 700;
  color: var(--color-heading); margin: 0 0 4px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.top-forum-desc { font-size: 0.85rem; color: var(--color-text-muted); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.top-forum-stats { display: flex; gap: 24px; flex-shrink: 0; }
.top-stat { display: flex; flex-direction: column; align-items: center; }
.top-stat-val { font-size: 1.2rem; font-weight: 800; color: var(--color-indigo-600); }
.top-stat-label { font-size: 11px; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.top-forum-arrow { color: var(--color-indigo-600); font-size: 1.2rem; flex-shrink: 0; transition: transform 0.2s; }
.top-forum-card:hover .top-forum-arrow { transform: translateX(4px); }

/* Skeletons */
.skeleton-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px 28px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  box-shadow: var(--glass-shadow);
  animation: shimmer 1.5s ease-in-out infinite;
}
@keyframes shimmer {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
.sk-rank { width: 36px; height: 36px; border-radius: 8px; background: var(--color-background-mute); flex-shrink: 0; }
.sk-body { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.sk-line { height: 10px; border-radius: 4px; background: var(--color-background-mute); }
.sk-line.wide { width: 50%; }
.sk-line.medium { width: 35%; }
.sk-stats { display: flex; gap: 12px; margin-top: 4px; }
.sk-stat { width: 60px; height: 28px; border-radius: 6px; background: var(--color-background-mute); }

.top-forums-empty { text-align: center; color: var(--color-text-muted); padding: 48px; }
.see-all-wrap { text-align: center; margin-top: 8px; }
.see-all-link {
  color: var(--color-indigo-600);
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  transition: color 0.2s;
}
.see-all-link:hover { color: var(--color-indigo-700); }

/* ── CTA ────────────────────────────────────────────────────────────── */
.cta-section {
  padding: 96px 32px;
  text-align: center;
  position: relative;
  overflow: hidden;
  border-top: 1px solid var(--color-border);
  background: var(--color-background);
}
.cta-section::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 50%, color-mix(in oklch, var(--color-indigo-400) 12%, transparent) 0%, transparent 70%);
}
.cta-inner { position: relative; z-index: 1; max-width: 600px; margin: 0 auto; }
.cta-title { font-size: clamp(1.8rem, 3vw, 2.5rem); font-weight: 800; color: var(--color-heading); margin: 0 0 16px; }
.cta-desc { font-size: 1rem; color: var(--color-text); margin: 0 0 40px; }
.cta-actions { display: flex; justify-content: center; }

/* ── Responsive ─────────────────────────────────────────────────────── */
@media (max-width: 1024px) {
  .hero { flex-direction: column; padding: 120px 32px 80px; }
  .hero-visual { width: 100%; max-width: 500px; flex: none; }
}

@media (max-width: 640px) {
  .hero { padding: 100px 20px 60px; }
  .hero-stats { flex-wrap: wrap; }
  .step-arrow { display: none; }
  .top-forum-card { flex-wrap: wrap; }
  .section-inner { padding: 0 20px; }
}
</style>
