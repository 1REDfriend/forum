<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { adminApi } from '../api/index.js';
import type {
  AdminStats, AdminUser, AdminForum, AdminThread, AdminPost, ActivityItem, AdminReport,
  PaginatedAdminResult,
} from '../api/admin.js';
import { TIERS } from '../api/types.js';
import { useAuthStore } from '../stores/auth.js';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

// ─── Sidebar tabs ─────────────────────────────────────────────────────────────
type Tab = 'overview' | 'users' | 'forums' | 'threads' | 'posts' | 'reports';
const activeTab = ref<Tab>('overview');

// ─── Stats ────────────────────────────────────────────────────────────────────
const stats = ref<AdminStats | null>(null);
const activity = ref<ActivityItem[]>([]);
const statsLoading = ref(true);

// ─── Users ────────────────────────────────────────────────────────────────────
const users = ref<PaginatedAdminResult<AdminUser> | null>(null);
const usersLoading = ref(false);
const usersPage = ref(1);
const usersSearch = ref('');
const usersSearchInput = ref('');
let usersSearchTimer: ReturnType<typeof setTimeout>;

// ─── Forums ───────────────────────────────────────────────────────────────────
const forums = ref<PaginatedAdminResult<AdminForum> | null>(null);
const forumsLoading = ref(false);
const forumsPage = ref(1);

// ─── Threads ──────────────────────────────────────────────────────────────────
const threads = ref<PaginatedAdminResult<AdminThread> | null>(null);
const threadsLoading = ref(false);
const threadsPage = ref(1);
const threadsSearch = ref('');
const threadsSearchInput = ref('');
let threadsSearchTimer: ReturnType<typeof setTimeout>;

// ─── Posts ────────────────────────────────────────────────────────────────────
const posts = ref<PaginatedAdminResult<AdminPost> | null>(null);
const postsLoading = ref(false);
const postsPage = ref(1);

// ─── Delete confirm ───────────────────────────────────────────────────────────
const confirmDelete = ref<{ type: string; id: number; label: string } | null>(null);
const isDeleting = ref(false);

// ─── Load functions ───────────────────────────────────────────────────────────

const loadStats = async () => {
  statsLoading.value = true;
  try {
    const [s, a] = await Promise.all([adminApi.getStats(), adminApi.getRecentActivity()]);
    stats.value = s;
    activity.value = a;
  } catch { /* ignore */ } finally {
    statsLoading.value = false;
  }
};

const loadUsers = async () => {
  usersLoading.value = true;
  try {
    users.value = await adminApi.getUsers(usersPage.value, 15, usersSearch.value || undefined);
  } catch { /* ignore */ } finally {
    usersLoading.value = false;
  }
};

const loadForums = async () => {
  forumsLoading.value = true;
  try {
    forums.value = await adminApi.getForums(forumsPage.value, 20);
  } catch { /* ignore */ } finally {
    forumsLoading.value = false;
  }
};

const loadThreads = async () => {
  threadsLoading.value = true;
  try {
    threads.value = await adminApi.getThreads(threadsPage.value, 15, threadsSearch.value || undefined);
  } catch { /* ignore */ } finally {
    threadsLoading.value = false;
  }
};

const loadPosts = async () => {
  postsLoading.value = true;
  try {
    posts.value = await adminApi.getPosts(postsPage.value, 15);
  } catch { /* ignore */ } finally {
    postsLoading.value = false;
  }
};

// ─── Tab change ───────────────────────────────────────────────────────────────

// Reports
const reports = ref<PaginatedAdminResult<AdminReport> | null>(null);
const reportsLoading = ref(false);
const reportsPage = ref(1);
const reportsStatus = ref('open');
const loadReports = async () => {
  reportsLoading.value = true;
  try {
    reports.value = await adminApi.getReports(reportsPage.value, 15, reportsStatus.value || undefined);
  } finally {
    reportsLoading.value = false;
  }
};
const resolveReport = async (id: number, status: 'reviewed' | 'dismissed') => {
  await adminApi.resolveReport(id, status);
  loadReports();
};
const setReportsPage = (p: number) => { reportsPage.value = p; loadReports(); };

watch(activeTab, (tab) => {
  if (tab === 'users' && !users.value) loadUsers();
  if (tab === 'forums' && !forums.value) loadForums();
  if (tab === 'threads' && !threads.value) loadThreads();
  if (tab === 'posts' && !posts.value) loadPosts();
  if (tab === 'reports' && !reports.value) loadReports();
});

// ─── Search debounce ──────────────────────────────────────────────────────────

const onUsersSearchInput = () => {
  clearTimeout(usersSearchTimer);
  usersSearchTimer = setTimeout(() => {
    usersSearch.value = usersSearchInput.value;
    usersPage.value = 1;
    loadUsers();
  }, 400);
};

const onThreadsSearchInput = () => {
  clearTimeout(threadsSearchTimer);
  threadsSearchTimer = setTimeout(() => {
    threadsSearch.value = threadsSearchInput.value;
    threadsPage.value = 1;
    loadThreads();
  }, 400);
};

// ─── Pagination ───────────────────────────────────────────────────────────────

const setUsersPage = (p: number) => { usersPage.value = p; loadUsers(); };
const setForumsPage = (p: number) => { forumsPage.value = p; loadForums(); };
const setThreadsPage = (p: number) => { threadsPage.value = p; loadThreads(); };
const setPostsPage = (p: number) => { postsPage.value = p; loadPosts(); };

// ─── Actions ──────────────────────────────────────────────────────────────────

const toggleUserRole = async (user: AdminUser) => {
  const newRole = user.role === 'admin' ? 'user' : 'admin';
  try {
    await adminApi.updateUserRole(user.id, newRole);
    user.role = newRole;
  } catch (err: any) {
    alert(err.message || 'Failed to update role');
  }
};

const setUserTier = async (user: AdminUser, tier: string) => {
  const prev = user.tier;
  user.tier = tier;
  try {
    await adminApi.updateUserTier(user.id, tier);
  } catch (err: any) {
    user.tier = prev;
    alert(err.message || 'Failed to update tier');
  }
};

const askDelete = (type: string, id: number, label: string) => {
  confirmDelete.value = { type, id, label };
};

const doDelete = async () => {
  if (!confirmDelete.value) return;
  isDeleting.value = true;
  try {
    const { type, id } = confirmDelete.value;
    if (type === 'user') { await adminApi.deleteUser(id); loadUsers(); if (activeTab.value === 'overview') loadStats(); }
    if (type === 'forum') { await adminApi.deleteForum(id); loadForums(); if (activeTab.value === 'overview') loadStats(); }
    if (type === 'thread') { await adminApi.deleteThread(id); loadThreads(); if (activeTab.value === 'overview') loadStats(); }
    if (type === 'post') { await adminApi.deletePost(id); loadPosts(); if (activeTab.value === 'overview') loadStats(); }
    confirmDelete.value = null;
  } catch (err: any) {
    alert(err.message || 'Delete failed');
  } finally {
    isDeleting.value = false;
  }
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });

const formatDateTime = (d: string) =>
  new Date(d).toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

const formatTimeAgo = (dateStr: string) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const truncate = (s: string, n = 80) => s.length > n ? s.slice(0, n) + '…' : s;

const sidebarItems: { key: Tab; label: string; icon: string }[] = [
  { key: 'overview', label: 'Overview', icon: '📊' },
  { key: 'users', label: 'Users', icon: '👥' },
  { key: 'forums', label: 'Forums', icon: '🗂️' },
  { key: 'threads', label: 'Threads', icon: '💬' },
  { key: 'posts', label: 'Posts', icon: '📝' },
  { key: 'reports', label: 'Reports', icon: '🚩' },
];

// ─── Init ─────────────────────────────────────────────────────────────────────

onMounted(() => {
  if (authStore.user?.role !== 'admin') {
    router.push('/forums');
    return;
  }
  loadStats();
});
</script>

<template>
  <div class="admin-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <span class="sidebar-icon">⚙️</span>
        <span class="sidebar-title">Admin Panel</span>
      </div>
      <nav class="sidebar-nav">
        <button
          v-for="item in sidebarItems"
          :key="item.key"
          @click="activeTab = item.key"
          :class="['nav-item', activeTab === item.key && 'nav-item--active']"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </button>
      </nav>
      <div class="sidebar-footer">
        <router-link to="/forums" class="back-link">← Back to Forum</router-link>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="admin-main">

      <!-- ══ OVERVIEW ════════════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'overview'" class="tab-content">
        <h1 class="page-title">Dashboard Overview</h1>

        <!-- Stat cards -->
        <div v-if="statsLoading" class="stat-grid">
          <div v-for="i in 4" :key="i" class="stat-card sk-card" />
        </div>
        <div v-else-if="stats" class="stat-grid">
          <div class="stat-card">
            <div class="stat-icon" style="background:rgba(99, 102, 241, 0.18);color:#93c5fd">👥</div>
            <div>
              <p class="stat-label">Total Users</p>
              <p class="stat-value">{{ stats.totalUsers.toLocaleString() }}</p>
              <p class="stat-sub">+{{ stats.newUsersWeek }} this week</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:#d1fae5;color:#059669">🗂️</div>
            <div>
              <p class="stat-label">Total Forums</p>
              <p class="stat-value">{{ stats.totalForums.toLocaleString() }}</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:#fef3c7;color:#d97706">💬</div>
            <div>
              <p class="stat-label">Total Threads</p>
              <p class="stat-value">{{ stats.totalThreads.toLocaleString() }}</p>
              <p class="stat-sub">+{{ stats.newThreadsWeek }} this week</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:#fce7f3;color:#db2777">📝</div>
            <div>
              <p class="stat-label">Total Posts</p>
              <p class="stat-value">{{ stats.totalPosts.toLocaleString() }}</p>
              <p class="stat-sub">+{{ stats.newPostsWeek }} this week</p>
            </div>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="section-card" style="margin-top:24px">
          <h2 class="section-title">Recent Activity</h2>
          <div v-if="statsLoading" class="sk-lines">
            <div v-for="i in 8" :key="i" class="sk-line" />
          </div>
          <div v-else class="activity-list">
            <div v-for="item in activity" :key="`${item.type}-${item.id}`" class="activity-item">
              <span class="activity-badge" :class="item.type === 'thread' ? 'badge-thread' : 'badge-post'">
                {{ item.type === 'thread' ? '💬' : '📝' }}
              </span>
              <div class="activity-info">
                <p class="activity-text">
                  <strong>@{{ item.authorName }}</strong>
                  {{ item.type === 'thread' ? 'created thread' : 'replied in' }}
                  <router-link
                    :to="item.type === 'thread' ? `/thread/${item.id}` : `/thread/${item.threadId}`"
                    class="activity-link"
                  >{{ item.type === 'thread' ? truncate(item.title, 60) : truncate(item.threadTitle || '', 60) }}</router-link>
                </p>
                <p class="activity-meta">{{ item.forumName || '' }} · {{ formatTimeAgo(item.createdAt) }}</p>
              </div>
              <div class="activity-actions">
                <button
                  @click="askDelete(item.type, item.id, item.type === 'thread' ? item.title : (item.threadTitle || ''))"
                  class="btn-danger-sm"
                  title="Delete"
                >🗑</button>
              </div>
            </div>
            <p v-if="activity.length === 0" class="empty-text">No recent activity.</p>
          </div>
        </div>
      </div>

      <!-- ══ USERS ══════════════════════════════════════════════════════════ -->
      <div v-else-if="activeTab === 'users'" class="tab-content">
        <div class="tab-header">
          <h1 class="page-title">Users</h1>
          <div class="search-box">
            <input
              v-model="usersSearchInput"
              @input="onUsersSearchInput"
              type="text"
              placeholder="Search name or email…"
              class="search-input"
            />
          </div>
        </div>

        <div class="section-card">
          <div v-if="usersLoading" class="sk-lines"><div v-for="i in 8" :key="i" class="sk-line" /></div>
          <table v-else-if="users && users.data.length > 0" class="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Tier</th>
                <th>Provider</th>
                <th class="text-center">Threads</th>
                <th class="text-center">Posts</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users.data" :key="user.id">
                <td>
                  <div class="user-cell">
                    <img v-if="user.avatar" :src="user.avatar" class="user-avatar" :alt="user.name" />
                    <div v-else class="user-avatar-placeholder">{{ user.name.charAt(0).toUpperCase() }}</div>
                    <span class="font-medium">{{ user.name }}</span>
                  </div>
                </td>
                <td class="text-muted text-sm">{{ user.email }}</td>
                <td>
                  <button
                    @click="toggleUserRole(user)"
                    :class="['role-badge', user.role === 'admin' ? 'role-admin' : 'role-user']"
                    :title="`Click to ${user.role === 'admin' ? 'demote to user' : 'promote to admin'}`"
                  >{{ user.role }}</button>
                </td>
                <td>
                  <select
                    :value="user.tier"
                    @change="setUserTier(user, ($event.target as HTMLSelectElement).value)"
                    class="tier-select"
                    title="Set tier (rank)"
                  >
                    <option v-for="t in TIERS" :key="t.key" :value="t.key">{{ t.icon }} {{ t.label }}</option>
                  </select>
                </td>
                <td class="text-muted text-sm">{{ user.authProvider }}</td>
                <td class="text-center text-sm">{{ user.threadCount }}</td>
                <td class="text-center text-sm">{{ user.postCount }}</td>
                <td class="text-muted text-sm">{{ formatDate(user.createdAt) }}</td>
                <td>
                  <div class="row-actions">
                    <router-link :to="`/user/${user.id}`" class="btn-view-sm" title="View profile">👁</router-link>
                    <button @click="askDelete('user', user.id, user.name)" class="btn-danger-sm" title="Delete user">🗑</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else-if="!usersLoading" class="empty-text">No users found.</p>

          <!-- Pagination -->
          <div v-if="users && users.totalPages > 1" class="pagination">
            <button @click="setUsersPage(usersPage - 1)" :disabled="usersPage <= 1" class="page-btn">←</button>
            <span class="page-info">{{ usersPage }} / {{ users.totalPages }} ({{ users.total }} total)</span>
            <button @click="setUsersPage(usersPage + 1)" :disabled="usersPage >= users.totalPages" class="page-btn">→</button>
          </div>
        </div>
      </div>

      <!-- ══ FORUMS ══════════════════════════════════════════════════════════ -->
      <div v-else-if="activeTab === 'forums'" class="tab-content">
        <div class="tab-header">
          <h1 class="page-title">Forums</h1>
          <router-link to="/forum/create" class="btn-create">+ New Forum</router-link>
        </div>

        <div class="section-card">
          <div v-if="forumsLoading" class="sk-lines"><div v-for="i in 8" :key="i" class="sk-line" /></div>
          <table v-else-if="forums && forums.data.length > 0" class="data-table">
            <thead>
              <tr>
                <th>Forum</th>
                <th>Description</th>
                <th class="text-center">Threads</th>
                <th class="text-center">Posts</th>
                <th>Created By</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="forum in forums.data" :key="forum.id">
                <td>
                  <router-link :to="`/forum/${forum.id}`" class="link-primary font-medium">{{ forum.name }}</router-link>
                </td>
                <td class="text-muted text-sm">{{ truncate(forum.description || '—', 60) }}</td>
                <td class="text-center text-sm">{{ forum.threadCount }}</td>
                <td class="text-center text-sm">{{ forum.postCount }}</td>
                <td class="text-muted text-sm">{{ forum.creatorName || '—' }}</td>
                <td class="text-muted text-sm">{{ formatDate(forum.createdAt) }}</td>
                <td>
                  <div class="row-actions">
                    <router-link :to="`/forum/${forum.id}`" class="btn-view-sm">👁</router-link>
                    <button @click="askDelete('forum', forum.id, forum.name)" class="btn-danger-sm">🗑</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else-if="!forumsLoading" class="empty-text">No forums found.</p>

          <div v-if="forums && forums.totalPages > 1" class="pagination">
            <button @click="setForumsPage(forumsPage - 1)" :disabled="forumsPage <= 1" class="page-btn">←</button>
            <span class="page-info">{{ forumsPage }} / {{ forums.totalPages }} ({{ forums.total }} total)</span>
            <button @click="setForumsPage(forumsPage + 1)" :disabled="forumsPage >= forums.totalPages" class="page-btn">→</button>
          </div>
        </div>
      </div>

      <!-- ══ THREADS ═════════════════════════════════════════════════════════ -->
      <div v-else-if="activeTab === 'threads'" class="tab-content">
        <div class="tab-header">
          <h1 class="page-title">Threads</h1>
          <div class="search-box">
            <input
              v-model="threadsSearchInput"
              @input="onThreadsSearchInput"
              type="text"
              placeholder="Search thread title…"
              class="search-input"
            />
          </div>
        </div>

        <div class="section-card">
          <div v-if="threadsLoading" class="sk-lines"><div v-for="i in 8" :key="i" class="sk-line" /></div>
          <table v-else-if="threads && threads.data.length > 0" class="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Forum</th>
                <th>Author</th>
                <th class="text-center">Replies</th>
                <th class="text-center">Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="thread in threads.data" :key="thread.id">
                <td>
                  <router-link :to="`/thread/${thread.id}`" class="link-primary font-medium">
                    {{ truncate(thread.title, 50) }}
                  </router-link>
                </td>
                <td>
                  <router-link :to="`/forum/${thread.forumId}`" class="link-muted text-sm">{{ thread.forumName }}</router-link>
                </td>
                <td class="text-muted text-sm">@{{ thread.authorName }}</td>
                <td class="text-center text-sm">{{ thread.replyCount }}</td>
                <td class="text-center">
                  <span v-if="thread.isPinned" class="badge-pin">📌</span>
                  <span v-if="thread.isLocked" class="badge-lock">🔒</span>
                  <span v-if="!thread.isPinned && !thread.isLocked" class="text-muted text-xs">—</span>
                </td>
                <td class="text-muted text-sm">{{ formatDate(thread.createdAt) }}</td>
                <td>
                  <div class="row-actions">
                    <router-link :to="`/thread/${thread.id}`" class="btn-view-sm">👁</router-link>
                    <button @click="askDelete('thread', thread.id, thread.title)" class="btn-danger-sm">🗑</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else-if="!threadsLoading" class="empty-text">No threads found.</p>

          <div v-if="threads && threads.totalPages > 1" class="pagination">
            <button @click="setThreadsPage(threadsPage - 1)" :disabled="threadsPage <= 1" class="page-btn">←</button>
            <span class="page-info">{{ threadsPage }} / {{ threads.totalPages }} ({{ threads.total }} total)</span>
            <button @click="setThreadsPage(threadsPage + 1)" :disabled="threadsPage >= threads.totalPages" class="page-btn">→</button>
          </div>
        </div>
      </div>

      <!-- ══ POSTS ═══════════════════════════════════════════════════════════ -->
      <div v-else-if="activeTab === 'posts'" class="tab-content">
        <h1 class="page-title">Posts</h1>

        <div class="section-card">
          <div v-if="postsLoading" class="sk-lines"><div v-for="i in 8" :key="i" class="sk-line" /></div>
          <table v-else-if="posts && posts.data.length > 0" class="data-table">
            <thead>
              <tr>
                <th>Content</th>
                <th>Thread</th>
                <th>Author</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="post in posts.data" :key="post.id">
                <td class="text-sm text-muted" style="max-width:260px">{{ truncate(post.content, 100) }}</td>
                <td>
                  <router-link :to="`/thread/${post.threadId}`" class="link-primary text-sm">
                    {{ truncate(post.threadTitle, 40) }}
                  </router-link>
                </td>
                <td class="text-muted text-sm">@{{ post.authorName }}</td>
                <td class="text-muted text-sm">{{ formatDateTime(post.createdAt) }}</td>
                <td>
                  <div class="row-actions">
                    <router-link :to="`/thread/${post.threadId}`" class="btn-view-sm">👁</router-link>
                    <button @click="askDelete('post', post.id, `post by @${post.authorName}`)" class="btn-danger-sm">🗑</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else-if="!postsLoading" class="empty-text">No posts found.</p>

          <div v-if="posts && posts.totalPages > 1" class="pagination">
            <button @click="setPostsPage(postsPage - 1)" :disabled="postsPage <= 1" class="page-btn">←</button>
            <span class="page-info">{{ postsPage }} / {{ posts.totalPages }} ({{ posts.total }} total)</span>
            <button @click="setPostsPage(postsPage + 1)" :disabled="postsPage >= posts.totalPages" class="page-btn">→</button>
          </div>
        </div>
      </div>

      <!-- ─── Reports ─────────────────────────────────────────────────────── -->
      <div v-else-if="activeTab === 'reports'" class="tab-content">
        <h1 class="page-title">Reports</h1>
        <div class="section-card">
          <div style="display:flex; gap:8px; margin-bottom:14px">
            <button v-for="s in ['open', 'reviewed', 'dismissed']" :key="s"
              @click="reportsStatus = s; reportsPage = 1; loadReports()" class="page-btn"
              :style="reportsStatus === s ? { background: '#2563eb', color: '#fff', borderColor: '#2563eb' } : {}">
              {{ s }}
            </button>
          </div>
          <div v-if="reportsLoading" class="sk-lines"><div v-for="i in 6" :key="i" class="sk-line" /></div>
          <table v-else-if="reports && reports.data.length > 0" class="data-table">
            <thead>
              <tr><th>Reporter</th><th>Target</th><th>Reason</th><th>Status</th><th>Created</th><th>Actions</th></tr>
            </thead>
            <tbody>
              <tr v-for="r in reports.data" :key="r.id">
                <td class="text-muted text-sm">@{{ r.reporterName }}</td>
                <td class="text-sm">
                  <router-link v-if="r.targetType === 'thread'" :to="`/thread/${r.targetId}`" class="link-primary">thread #{{ r.targetId }}</router-link>
                  <router-link v-else-if="r.targetType === 'user'" :to="`/user/${r.targetId}`" class="link-primary">user #{{ r.targetId }}</router-link>
                  <span v-else class="text-muted">{{ r.targetType }} #{{ r.targetId }}</span>
                </td>
                <td class="text-sm text-muted" style="max-width:240px">{{ truncate(r.reason, 100) }}</td>
                <td>
                  <span class="text-sm" :style="{ color: r.status === 'open' ? '#dc2626' : r.status === 'reviewed' ? '#2563eb' : '#6b7280' }">● {{ r.status }}</span>
                </td>
                <td class="text-muted text-sm">{{ formatDateTime(r.createdAt) }}</td>
                <td>
                  <div class="row-actions">
                    <button v-if="r.status === 'open'" @click="resolveReport(r.id, 'reviewed')" class="btn-view-sm" title="mark reviewed">✓</button>
                    <button v-if="r.status !== 'dismissed'" @click="resolveReport(r.id, 'dismissed')" class="btn-danger-sm" title="dismiss">✕</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else-if="!reportsLoading" class="empty-text">No reports.</p>

          <div v-if="reports && reports.totalPages > 1" class="pagination">
            <button @click="setReportsPage(reportsPage - 1)" :disabled="reportsPage <= 1" class="page-btn">←</button>
            <span class="page-info">{{ reportsPage }} / {{ reports.totalPages }} ({{ reports.total }} total)</span>
            <button @click="setReportsPage(reportsPage + 1)" :disabled="reportsPage >= reports.totalPages" class="page-btn">→</button>
          </div>
        </div>
      </div>

    </main>

    <!-- ─── Delete Confirm Modal ────────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="confirmDelete" class="modal-overlay" @click.self="confirmDelete = null">
        <div class="modal">
          <h3 class="modal-title">Confirm Delete</h3>
          <p class="modal-body">
            Are you sure you want to permanently delete
            <strong>{{ confirmDelete.label }}</strong>?
            This action <strong>cannot</strong> be undone.
          </p>
          <div class="modal-actions">
            <button @click="confirmDelete = null" class="btn-cancel">Cancel</button>
            <button @click="doDelete" :disabled="isDeleting" class="btn-danger">
              {{ isDeleting ? 'Deleting…' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* ── Layout ─────────────────────────────────────────────────────────── */
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: rgba(255, 255, 255, 0.04);
  padding-top: 64px; /* navbar height */
  font-family: 'Inter', 'Outfit', sans-serif;
}

/* ── Sidebar ────────────────────────────────────────────────────────── */
.sidebar {
  width: 220px;
  flex-shrink: 0;
  background: #1e1e2e;
  color: #cdd6f4;
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 64px;
  bottom: 0;
  overflow-y: auto;
  z-index: 40;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 18px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.sidebar-icon { font-size: 1.2rem; }
.sidebar-title { font-weight: 700; font-size: 0.95rem; color: #f1f5f9; }

.sidebar-nav {
  flex: 1;
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #94a3b8;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
  width: 100%;
}
.nav-item:hover { background: rgba(255,255,255,0.06); color: #f1f5f9; }
.nav-item--active { background: rgba(99,102,241,0.2); color: #818cf8; font-weight: 600; }
.nav-icon { font-size: 1rem; width: 20px; text-align: center; }

.sidebar-footer {
  padding: 16px 18px;
  border-top: 1px solid rgba(255,255,255,0.06);
}
.back-link {
  font-size: 12px;
  color: #94a3b8;
  text-decoration: none;
  transition: color 0.15s;
}
.back-link:hover { color: #818cf8; }

/* ── Main ───────────────────────────────────────────────────────────── */
.admin-main {
  flex: 1;
  margin-left: 220px;
  padding: 32px;
  max-width: calc(100vw - 220px);
  min-height: calc(100vh - 64px);
  overflow-x: auto;
}

.tab-content { animation: fadeIn 0.2s ease; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

.page-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: #f1f5f9;
  margin: 0 0 24px;
}

.tab-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
}
.tab-header .page-title { margin: 0; }

/* ── Stat Cards ─────────────────────────────────────────────────────── */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
  transition: box-shadow 0.2s;
}
.stat-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
.sk-card { height: 84px; background: rgba(255, 255, 255, 0.08); animation: shimmer 1.5s ease-in-out infinite; }
@keyframes shimmer { 0%,100% { opacity:0.5; } 50% { opacity:1; } }

.stat-icon {
  width: 48px; height: 48px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.3rem; flex-shrink: 0;
}
.stat-label { font-size: 12px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin: 0; }
.stat-value { font-size: 1.6rem; font-weight: 800; color: #f1f5f9; margin: 2px 0 0; line-height: 1; }
.stat-sub { font-size: 11px; color: #22c55e; margin: 4px 0 0; font-weight: 500; }

/* ── Section Card ───────────────────────────────────────────────────── */
.section-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.section-title {
  font-size: 1rem;
  font-weight: 700;
  color: #f1f5f9;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  margin: 0;
}

/* ── Activity ───────────────────────────────────────────────────────── */
.activity-list { padding: 8px 0; }
.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 20px;
  transition: background 0.15s;
}
.activity-item:hover { background: rgba(255, 255, 255, 0.04); }
.activity-badge {
  width: 32px; height: 32px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; flex-shrink: 0;
}
.badge-thread { background: rgba(99, 102, 241, 0.18); }
.badge-post { background: rgba(236, 72, 153, 0.18); }
.activity-info { flex: 1; min-width: 0; }
.activity-text { font-size: 13px; color: #cbd5e1; margin: 0 0 2px; line-height: 1.5; }
.activity-meta { font-size: 11px; color: #9ca3af; margin: 0; }
.activity-link { color: #93c5fd; text-decoration: none; font-weight: 600; }
.activity-link:hover { text-decoration: underline; }
.activity-actions { flex-shrink: 0; }

/* ── Data Table ─────────────────────────────────────────────────────── */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.data-table th {
  text-align: left;
  padding: 10px 16px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  white-space: nowrap;
}
.data-table td {
  padding: 10px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  vertical-align: middle;
}
.data-table tr:last-child td { border-bottom: none; }
.data-table tr:hover td { background: rgba(255, 255, 255, 0.04); }
.text-center { text-align: center; }
.text-muted { color: #94a3b8; }
.text-sm { font-size: 12px; }
.font-medium { font-weight: 600; }

/* ── User cell ──────────────────────────────────────────────────────── */
.user-cell { display: flex; align-items: center; gap: 8px; }
.user-avatar { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; }
.user-avatar-placeholder {
  width: 28px; height: 28px; border-radius: 50%;
  background: #6366f1; color: white;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; flex-shrink: 0;
}

/* ── Badges ─────────────────────────────────────────────────────────── */
.role-badge {
  padding: 2px 10px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  cursor: pointer;
  border: none;
  transition: all 0.15s;
}
.role-admin { background: rgba(245, 158, 11, 0.16); color: #fcd34d; }
.role-admin:hover { background: rgba(245, 158, 11, 0.26); }
.role-user { background: rgba(99, 102, 241, 0.18); color: #93c5fd; }
.role-user:hover { background: rgba(99, 102, 241, 0.3); }
.tier-select {
  padding: 3px 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #cbd5e1;
  background: rgba(255, 255, 255, 0.04);
  cursor: pointer;
}
.tier-select:focus { outline: none; border-color: #6366f1; }
.badge-pin, .badge-lock { font-size: 14px; margin: 0 2px; }

/* ── Links ──────────────────────────────────────────────────────────── */
.link-primary { color: #93c5fd; text-decoration: none; font-weight: 600; }
.link-primary:hover { text-decoration: underline; }
.link-muted { color: #94a3b8; text-decoration: none; }
.link-muted:hover { color: #93c5fd; }

/* ── Row Actions ────────────────────────────────────────────────────── */
.row-actions { display: flex; gap: 4px; align-items: center; }
.btn-view-sm {
  display: flex; align-items: center; justify-content: center;
  width: 28px; height: 28px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  color: #cbd5e1;
  text-decoration: none;
  font-size: 13px;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
}
.btn-view-sm:hover { background: rgba(99, 102, 241, 0.18); }
.btn-danger-sm {
  width: 28px; height: 28px;
  border-radius: 6px;
  background: rgba(239, 68, 68, 0.14);
  color: #fca5a5;
  font-size: 13px;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
  display: flex; align-items: center; justify-content: center;
}
.btn-danger-sm:hover { background: rgba(239, 68, 68, 0.24); }

/* ── Search ─────────────────────────────────────────────────────────── */
.search-box { display: flex; align-items: center; }
.search-input {
  padding: 8px 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  font-size: 13px;
  outline: none;
  width: 240px;
  transition: border-color 0.15s;
}
.search-input:focus { border-color: #6366f1; }

/* ── Pagination ─────────────────────────────────────────────────────── */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.page-btn {
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.15s;
}
.page-btn:hover:not(:disabled) { border-color: #6366f1; color: #93c5fd; }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-info { font-size: 12px; color: #94a3b8; }

/* ── Buttons ────────────────────────────────────────────────────────── */
.btn-create {
  display: inline-flex;
  align-items: center;
  padding: 8px 18px;
  background: #93c5fd;
  color: white;
  font-size: 13px;
  font-weight: 600;
  border-radius: 8px;
  text-decoration: none;
  transition: background 0.15s;
}
.btn-create:hover { background: #4338ca; }

/* ── Skeletons ──────────────────────────────────────────────────────── */
.sk-lines { padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; }
.sk-line { height: 14px; background: rgba(255, 255, 255, 0.08); border-radius: 6px; animation: shimmer 1.5s ease-in-out infinite; }
.sk-line:nth-child(2n) { width: 80%; }
.sk-line:nth-child(3n) { width: 60%; }

/* ── Empty ──────────────────────────────────────────────────────────── */
.empty-text { text-align: center; color: #94a3b8; font-size: 14px; padding: 40px 20px; }

/* ── Modal ──────────────────────────────────────────────────────────── */
.modal-overlay {
  position: fixed; inset: 0; z-index: 9999;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.45);
  backdrop-filter: blur(4px);
}
.modal {
  background: rgba(15, 23, 42, 0.97);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  padding: 28px;
  max-width: 420px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.5);
}
.modal-title { font-size: 1.1rem; font-weight: 800; color: #f1f5f9; margin: 0 0 10px; }
.modal-body { font-size: 14px; color: #cbd5e1; line-height: 1.6; margin: 0 0 24px; }
.modal-actions { display: flex; gap: 10px; justify-content: flex-end; }
.btn-cancel {
  padding: 8px 18px; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px;
  background: rgba(255, 255, 255, 0.05); font-size: 13px; font-weight: 600; cursor: pointer;
  transition: background 0.15s;
}
.btn-cancel:hover { background: rgba(255, 255, 255, 0.04); }
.btn-danger {
  padding: 8px 18px; background: #dc2626; color: white; border: none;
  border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;
  transition: background 0.15s;
}
.btn-danger:hover:not(:disabled) { background: #b91c1c; }
.btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Responsive ─────────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .sidebar { transform: translateX(-100%); }
  .admin-main { margin-left: 0; padding: 16px; max-width: 100vw; }
}
</style>
