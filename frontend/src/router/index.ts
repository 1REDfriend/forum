import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

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

export default router
