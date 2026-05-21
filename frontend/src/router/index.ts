import { createRouter, createWebHistory } from 'vue-router'

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
    }
  ],
})

export default router
