import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import { usePostHog } from "~/composables/usePostHog";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "home",
    component: () => import("~/views/HomeView.vue"),
  },
  {
    path: "/appointments",
    name: "appointments",
    component: () => import("~/views/AppointmentsView.vue"),
  },
  {
    path: "/:pathMatch(.*)*",
    name: "not-found",
    component: () => import("~/views/NotFoundView.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

usePostHog();

export default router;
