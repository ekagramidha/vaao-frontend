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
    path: '/agents/:agentId',
    name: 'agent',
    component: () => import('@/views/AgentWorkspaceView.vue'),
    props: true,
  },
  {
    path: '/agents/:agentId/runs/:testRunId',
    name: 'test-run',
    component: () => import('@/views/TestRunView.vue'),
    props: true,
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});
