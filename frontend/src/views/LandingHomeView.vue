<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { forumsApi } from '../api/index.js';
import type { ForumWithStats } from '../api/types.js';
import { useAuthStore } from '../stores/auth.js';

const authStore = useAuthStore();
const forums = ref<ForumWithStats[]>([]);
const topForums = ref<ForumWithStats[]>([]);
const isLoading = ref(true);

onMounted(async () => {
  try {
    const all = await forumsApi.getAllForums();
    forums.value = all;
    // Sort by postCount desc, take top 3
    topForums.value = [...all]
      .sort((a, b) => (b.postCount ?? 0) - (a.postCount ?? 0))
      .slice(0, 3);
  } catch {
    // silently fail – non-critical
  } finally {
    isLoading.value = false;
  }
});

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
  <div class="landing">
    <!-- ══ HERO ══════════════════════════════════════════════════════════════ -->
    <section class="hero">
      <div class="hero-bg-shapes">
        <div class="shape shape-1" />
        <div class="shape shape-2" />
        <div class="shape shape-3" />
      </div>
      <div class="hero-content">
        <div class="hero-badge">🚀 Community Forum Platform</div>
        <h1 class="hero-title">
          พื้นที่แลกเปลี่ยน<br />
          <span class="hero-gradient">ความรู้และไอเดีย</span>
        </h1>
        <p class="hero-desc">
          ระบบฟอรัมที่ออกแบบมาเพื่อชุมชน — ตั้งกระทู้ ตอบคำถาม แบ่งปันประสบการณ์<br />
          พร้อมฟีเจอร์ครบครันตั้งแต่ Markdown จนถึงการอัปโหลดรูปภาพ
        </p>
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
          <div class="stat-item">
            <span class="stat-val">{{ isLoading ? '…' : forums.length }}</span>
            <span class="stat-label">ฟอรัม</span>
          </div>
          <div class="stat-divider" />
          <div class="stat-item">
            <span class="stat-val">24/7</span>
            <span class="stat-label">เปิดให้บริการ</span>
          </div>
          <div class="stat-divider" />
          <div class="stat-item">
            <span class="stat-val">100%</span>
            <span class="stat-label">ฟรี</span>
          </div>
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
      <div class="section-inner">
        <div class="section-label">ฟีเจอร์หลัก</div>
        <h2 class="section-title">ครบทุกสิ่งที่ชุมชนต้องการ</h2>
        <p class="section-desc">ระบบฟอรัมที่พัฒนามาอย่างครบถ้วน พร้อมใช้งานได้ทันที</p>
        <div class="features-grid">
          <div v-for="f in features" :key="f.title" class="feature-card">
            <div class="feature-icon">{{ f.icon }}</div>
            <h3 class="feature-title">{{ f.title }}</h3>
            <p class="feature-desc">{{ f.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ HOW IT WORKS ══════════════════════════════════════════════════════ -->
    <section class="section how-section">
      <div class="section-inner">
        <div class="section-label">วิธีใช้งาน</div>
        <h2 class="section-title">เริ่มต้นง่าย ใน 3 ขั้นตอน</h2>
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
        <div class="how-cta">
          <router-link v-if="!authStore.isAuthenticated" to="/register" class="btn-primary">
            สมัครสมาชิก ฟรี →
          </router-link>
          <router-link v-else to="/" class="btn-primary">
            ไปที่ฟอรัม →
          </router-link>
        </div>
      </div>
    </section>

    <!-- ══ TOP 3 FORUMS ══════════════════════════════════════════════════════ -->
    <section class="section top-forums-section">
      <div class="section-inner">
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
      </div>
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
  </div>
</template>

<style scoped>
/* ── Base ──────────────────────────────────────────────────────────── */
.landing {
  min-height: 100vh;
  font-family: 'Inter', 'Outfit', sans-serif;
  background: #ffffff;
  color: #1e293b;
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
  background: linear-gradient(160deg, #f8faff 0%, #ffffff 50%, #f5f3ff 100%);
}

.hero-bg-shapes { position: absolute; inset: 0; pointer-events: none; }
.shape {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.35;
  animation: float 8s ease-in-out infinite;
}
.shape-1 { width: 500px; height: 500px; background: #c7d2fe; top: -150px; left: -100px; animation-delay: 0s; }
.shape-2 { width: 400px; height: 400px; background: #ddd6fe; bottom: -100px; right: 200px; animation-delay: 3s; }
.shape-3 { width: 300px; height: 300px; background: #bae6fd; top: 50%; right: -50px; animation-delay: 1.5s; }

.hero-content { flex: 1; max-width: 600px; position: relative; z-index: 1; }

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(99,102,241,0.08);
  border: 1px solid rgba(99,102,241,0.2);
  color: #6366f1;
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
  color: #0f172a;
}
.hero-gradient {
  background: linear-gradient(135deg, #6366f1 0%, #a78bfa 50%, #38bdf8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-desc {
  font-size: 1.05rem;
  line-height: 1.8;
  color: #64748b;
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
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  width: fit-content;
}
.stat-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.stat-val { font-size: 1.4rem; font-weight: 800; color: #0f172a; }
.stat-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
.stat-divider { width: 1px; height: 32px; background: #e2e8f0; }

/* Hero visual */
.hero-visual {
  flex: 0 0 420px;
  position: relative;
  z-index: 1;
}
.visual-card { border-radius: 16px; }
.card-main {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 8px 40px rgba(99,102,241,0.10), 0 2px 8px rgba(0,0,0,0.06);
  padding: 0;
  overflow: hidden;
  animation: float-card 6s ease-in-out infinite;
}
.card-header {
  display: flex;
  gap: 6px;
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #f1f5f9;
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
.mock-line { height: 8px; border-radius: 4px; background: #f1f5f9; }
.mock-line.wide { width: 85%; }
.mock-line.medium { width: 55%; }
.mock-line.short { width: 35%; }

.card-badge {
  position: absolute;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
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
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  font-size: 15px;
  font-weight: 600;
  border-radius: 100px;
  text-decoration: none;
  transition: all 0.25s;
  box-shadow: 0 4px 24px rgba(99,102,241,0.35);
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(99,102,241,0.45);
}
.btn-primary.btn-large { padding: 16px 40px; font-size: 16px; }

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 28px;
  background: #ffffff;
  color: #4f46e5;
  font-size: 15px;
  font-weight: 600;
  border-radius: 100px;
  text-decoration: none;
  border: 1.5px solid #c7d2fe;
  transition: all 0.25s;
}
.btn-secondary:hover {
  background: #f5f3ff;
  border-color: #a5b4fc;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(99,102,241,0.12);
}

/* ── Section common ─────────────────────────────────────────────────── */
.section { padding: 96px 0; }
.section-inner { max-width: 1100px; margin: 0 auto; padding: 0 32px; }
.section-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #6366f1;
  margin-bottom: 12px;
}
.section-title {
  font-size: clamp(1.8rem, 3vw, 2.5rem);
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 12px;
  letter-spacing: -0.02em;
}
.section-desc {
  font-size: 1rem;
  color: #64748b;
  margin: 0 0 56px;
}

/* ── Features ───────────────────────────────────────────────────────── */
.features-section { background: #f8fafc; }
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}
.feature-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 28px;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.feature-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(99,102,241,0.05), transparent);
  opacity: 0;
  transition: opacity 0.3s;
}
.feature-card:hover {
  border-color: #c7d2fe;
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(99,102,241,0.12);
}
.feature-card:hover::before { opacity: 1; }
.feature-icon { font-size: 2rem; margin-bottom: 16px; }
.feature-title { font-size: 1.05rem; font-weight: 700; color: #0f172a; margin: 0 0 8px; }
.feature-desc { font-size: 0.9rem; color: #64748b; line-height: 1.7; margin: 0; }

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
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  transition: all 0.3s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.step:hover {
  border-color: #c7d2fe;
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(99,102,241,0.12);
}
.step-num {
  width: 52px; height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  font-size: 1.3rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  box-shadow: 0 4px 20px rgba(99,102,241,0.3);
}
.step-title { font-size: 1rem; font-weight: 700; color: #0f172a; margin: 0 0 8px; }
.step-desc { font-size: 0.875rem; color: #64748b; line-height: 1.6; margin: 0; }
.step-arrow {
  font-size: 1.5rem;
  color: #a5b4fc;
  padding-top: 48px;
  flex-shrink: 0;
}
.how-cta { text-align: center; }

/* ── Top Forums ─────────────────────────────────────────────────────── */
.top-forums-section { background: #f8fafc; }
.top-forums-grid { display: flex; flex-direction: column; gap: 16px; margin-bottom: 32px; }
.top-forum-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px 28px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  text-decoration: none;
  color: inherit;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.top-forum-card::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0; width: 4px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 0 2px 2px 0;
}
.top-forum-card.rank-1::before { background: linear-gradient(135deg, #ffd700, #ffb300); }
.top-forum-card.rank-2::before { background: linear-gradient(135deg, #c0c0c0, #9ca3af); }
.top-forum-card.rank-3::before { background: linear-gradient(135deg, #cd7f32, #a16207); }
.top-forum-card:hover {
  border-color: #c7d2fe;
  transform: translateX(6px);
  box-shadow: 0 4px 20px rgba(99,102,241,0.12);
}

.top-rank { font-size: 1.8rem; flex-shrink: 0; }
.top-forum-body { display: flex; align-items: center; gap: 16px; flex: 1; min-width: 0; }
.top-forum-avatar {
  width: 48px; height: 48px;
  border-radius: 14px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.3rem; font-weight: 800;
  color: white; flex-shrink: 0;
}
.top-forum-info { min-width: 0; }
.top-forum-name {
  font-size: 1.05rem; font-weight: 700;
  color: #0f172a; margin: 0 0 4px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.top-forum-desc { font-size: 0.85rem; color: #64748b; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.top-forum-stats { display: flex; gap: 24px; flex-shrink: 0; }
.top-stat { display: flex; flex-direction: column; align-items: center; }
.top-stat-val { font-size: 1.2rem; font-weight: 800; color: #6366f1; }
.top-stat-label { font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
.top-forum-arrow { color: #a5b4fc; font-size: 1.2rem; flex-shrink: 0; transition: transform 0.2s; }
.top-forum-card:hover .top-forum-arrow { transform: translateX(4px); }

/* Skeletons */
.skeleton-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px 28px;
  background: #ffffff;
  border: 1px solid #f1f5f9;
  border-radius: 20px;
  animation: shimmer 1.5s ease-in-out infinite;
}
@keyframes shimmer {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
.sk-rank { width: 36px; height: 36px; border-radius: 8px; background: #f1f5f9; flex-shrink: 0; }
.sk-body { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.sk-line { height: 10px; border-radius: 4px; background: #f1f5f9; }
.sk-line.wide { width: 50%; }
.sk-line.medium { width: 35%; }
.sk-stats { display: flex; gap: 12px; margin-top: 4px; }
.sk-stat { width: 60px; height: 28px; border-radius: 6px; background: #f8fafc; }

.top-forums-empty { text-align: center; color: #94a3b8; padding: 48px; }
.see-all-wrap { text-align: center; margin-top: 8px; }
.see-all-link {
  color: #6366f1;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  transition: color 0.2s;
}
.see-all-link:hover { color: #4f46e5; }

/* ── CTA ────────────────────────────────────────────────────────────── */
.cta-section {
  padding: 96px 32px;
  text-align: center;
  position: relative;
  overflow: hidden;
  background: linear-gradient(160deg, #f5f3ff 0%, #eff6ff 100%);
}
.cta-section::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 50%, rgba(99,102,241,0.08) 0%, transparent 70%);
}
.cta-inner { position: relative; z-index: 1; max-width: 600px; margin: 0 auto; }
.cta-title { font-size: clamp(1.8rem, 3vw, 2.5rem); font-weight: 800; color: #0f172a; margin: 0 0 16px; }
.cta-desc { font-size: 1rem; color: #64748b; margin: 0 0 40px; }
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

/* ════════════════════════════════════════════════════════════════════════
   Glassmorphism — modern startup, white / sky-blue. Overrides the rules above.
   Frosted translucent cards, soft blue shadows, rounded, blue→cyan gradients.
   ════════════════════════════════════════════════════════════════════════ */
.landing { color: #334155; }

/* HERO — bright white→blue wash with soft sky blobs behind glass */
.hero {
  background: linear-gradient(160deg, #eff6ff 0%, #ffffff 45%, #e0f2fe 100%);
}
.shape-1 { background: #bfdbfe; }
.shape-2 { background: #a5d8ff; }
.shape-3 { background: #bae6fd; }
.hero-badge {
  background: rgba(37, 99, 235, 0.08);
  border: 1px solid rgba(37, 99, 235, 0.22);
  color: #2563eb;
}
.hero-gradient {
  background: linear-gradient(135deg, #2563eb 0%, #0ea5e9 50%, #38bdf8 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* Frosted glass surfaces */
.hero-stats,
.card-main,
.feature-card,
.step,
.top-forum-card,
.skeleton-card {
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(16px) saturate(160%);
  -webkit-backdrop-filter: blur(16px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 8px 32px rgba(30, 64, 175, 0.10);
}
.card-header {
  background: rgba(255, 255, 255, 0.4);
  border-bottom: 1px solid rgba(255, 255, 255, 0.5);
}
.card-badge {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 4px 16px rgba(30, 64, 175, 0.10);
  color: #334155;
}

/* Buttons — blue→cyan gradient pill with a soft glow */
.btn-primary {
  background: linear-gradient(135deg, #2563eb, #0ea5e9);
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.35);
}
.btn-primary:hover {
  box-shadow: 0 12px 30px rgba(37, 99, 235, 0.45);
}
.btn-secondary {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: #2563eb;
  border: 1px solid #bfdbfe;
}
.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.85);
  border-color: #93c5fd;
}

/* Sections — let the page wash show through, blue labels */
.features-section,
.top-forums-section {
  background: transparent;
}
.section-label { color: #2563eb; }

/* Card hover — lift + blue glow */
.feature-card:hover,
.step:hover,
.top-forum-card:hover {
  border-color: rgba(59, 130, 246, 0.4);
  box-shadow: 0 14px 44px rgba(37, 99, 235, 0.16);
}
.feature-card::before {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.06), transparent);
}
.step-num { box-shadow: 0 8px 20px rgba(37, 99, 235, 0.35); }
.top-forum-avatar { box-shadow: 0 6px 16px rgba(37, 99, 235, 0.30); }
.top-stat-val { color: #2563eb; }
.see-all-link { color: #2563eb; }
.see-all-link:hover { color: #1d4ed8; }

/* CTA — soft glass blue band */
.cta-section {
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.10), rgba(14, 165, 233, 0.12));
}
</style>
