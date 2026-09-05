import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: MainLayout,
    children: [
      { path: '', name: 'dashboard', component: () => import('@/pages/Dashboard.vue') },
      { path: 'proxies', name: 'proxies', component: () => import('@/pages/Proxies.vue') },
      { path: 'subscriptions', name: 'subscriptions', component: () => import('@/pages/Subscriptions.vue') },
      { path: 'connections', name: 'connections', component: () => import('@/pages/Connections.vue') },
      { path: 'logs', name: 'logs', component: () => import('@/pages/Logs.vue') },
      { path: 'settings', name: 'settings', component: () => import('@/pages/Settings.vue') }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
