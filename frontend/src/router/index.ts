import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'
import { setPageMeta } from '../utils/meta.js'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: () => import("../views/LandingHomeView.vue"),
    },
    {
      path: '/forums',
      name: 'home',
      component: () => import("../views/ForumHomeView.vue"),
    },
    {
      path: '/forum/create',
      name: 'forum-create',
      component: () => import("../views/ForumCreate.vue"),
      meta: { requiresAuth: true }
    },
    {
      path: '/forum/:forum',
      name: 'forum',
      component: () => import("../views/ForumView.vue"),
      props: true
    },
    {
      path: '/forum/:forum/create-thread',
      name: 'thread-create',
      component: () => import("../views/ThreadCreateView.vue"),
      props: true,
      meta: { requiresAuth: true }
    },
    {
      path: '/thread/:id',
      name: 'thread-detail',
      component: () => import("../views/ThreadDetailView.vue"),
      props: true
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import("../views/AdminDashboardView.vue"),
      meta: { requiresAuth: true }
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import("../views/ProfileView.vue"),
      meta: { requiresAuth: true }
    },
    {
      path: '/user/:id',
      name: 'user-profile',
      component: () => import("../views/ProfileView.vue"),
      props: true
    },
    {
      path: '/search',
      name: 'search',
      component: () => import("../views/SearchView.vue"),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import("../views/LoginView.vue"),
      meta: { requiresGuest: true }
    },
    {
      path: '/register',
      name: 'register',
      component: () => import("../views/RegisterView.vue"),
      meta: { requiresGuest: true }
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import("../views/ForgotPasswordView.vue"),
      meta: { requiresGuest: true }
    },
    {
      path: '/reset-password',
      name: 'reset-password',
      component: () => import("../views/ResetPasswordView.vue"),
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import("../views/NotFoundView.vue"),
    }
  ],
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const isAuthenticated = authStore.isAuthenticated

  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'login', query: { redirect: to.fullPath } })
  } else if (to.meta.requiresGuest && isAuthenticated) {
    next({ name: 'home' })
  } else {
    next();
  }
})

const ROUTE_META: Record<string, { title: string; description: string }> = {
  landing: { title: 'Home', description: 'A community for developers — ask, share, and grow.' },
  home: { title: 'Forums', description: 'Browse all developer forums on IT.Forum.' },
  search: { title: 'Search', description: 'Search threads and posts across IT.Forum.' },
  login: { title: 'Log in', description: 'Log in to IT.Forum.' },
  register: { title: 'Register', description: 'Create your IT.Forum account.' },
}

// Views with dynamic data (thread, forum, profile) call setPageMeta themselves
// once loaded; this only fills in the static pages.
router.afterEach((to) => {
  const m = ROUTE_META[to.name as string]
  if (m) setPageMeta(m)
})

export default router
