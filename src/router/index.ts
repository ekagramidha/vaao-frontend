import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';

/**
 * Hash history, deliberately.
 *
 * The widget is served as static files and loaded into an iframe from a
 * HighLevel page that may be on any white-label domain. Hash routing needs no
 * server rewrite rules, so the same build drops onto any static host without
 * per-provider configuration — and the URL is never visible to a user anyway.
 */
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'agents',
    component: () => import('@/views/AgentListView.vue'),
  },
  {
    path: '/install/success',
    name: 'install-success',
    component: () => import('@/views/InstallSuccessView.vue'),
    meta: { requiresLocation: false },
  },
  {
    path: '/install/failure',
    name: 'install-failure',
    component: () => import('@/views/InstallFailureView.vue'),
    meta: { requiresLocation: false },
  },
  {
    path: '/agents/:agentId',
    name: 'agent',
    component: () => import('@/views/AgentWorkspaceView.vue'),
    props: true,
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});
