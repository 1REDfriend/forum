import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import("../views/ForumHomeView.vue"),
    },
    {
      path: '/forum/:forum',
      name: 'forum',
      component: () => import("../views/ForumView.vue"),
      props: true
    },
    {
      path: '/forum/create',
      name: 'forum-create',
      component: () => import("../views/ForumCreate.vue"),
      meta: { requiresAuth: true }
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
    }
  ],
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const isAuthenticated = authStore.isAuthenticated

  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'login' })
  } else if (to.meta.requiresGuest && isAuthenticated) {
    next({ name: 'home' })
  } else {
    next()
  }
})

export default router
