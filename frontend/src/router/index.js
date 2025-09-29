import path from 'path';
import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router'

const routes = [
  {
    path: "/",
    component: () => import(/* webpackChunkName: "lemon" */ "@/view/lemon/index.vue"),
    meta: { verify: true },
    redirect: { name: "lemon" },
    children: [
      {
        path: "lemon/:agentId?/:id?",
        name: "lemon",
        component: () => import(/* webpackChunkName: "lemon" */ "@/view/lemon/components/ChatPanel.vue"),
        meta: { verify: true }
      }
    ]
  },
  {
    path:"/share/:id?",
    name: "share",
    component: () => import(/* webpackChunkName: "lemon" */ "@/view/share/index.vue"),
    meta: { verify: true }
  },
  {
    path: "/auth",
    name: "login",
    component: () => import(/* webpackChunkName: "auth" */ "@/view/auth/index.vue"),
  },
  {
    path: "/auth/google",
    name: "google",
    component: () => import(/* webpackChunkName: "auth" */ "@/view/auth/GoogleCallback.vue"),
  },
  {
    path: "/demo",
    name: "demo",
    component: () => import(/* webpackChunkName: "demo" */ "@/view/demo/index.vue"),
    meta: { verify: true }
  },{
    path: "/pricing",
    name: "pricing",
    component: () => import("@/view/pay/pricing.vue"),
    meta: { verify: true }
  },
  {
    path: "/pay/success",
    name: "paySuccess",
    component: () => import("@/view/pay/paySuccess.vue"),
    meta: { verify: true }
  },
  {
    //desktop 重定向
    path: "/desktop/redirect",
    name: "desktopRedirect",
    component: () => import("@/view/desktop/redirect.vue"),
    meta: { verify: true }
  },
  {
    path: "/setting",
    component: () => import("@/view/setting/index.vue"),
    meta: { verify: true },
    children: [
      {
        path: "basic",
        component: () => import("@/view/setting/basic.vue"),
        meta: { verify: true }
      },
      {
        path: "default-model",
        component: () => import("@/view/setting/default-model.vue"),
        meta: { verify: true }
      },
      {
        path: "default-model-setting",
        component: () => import("@/view/setting/defaultModelSetting.vue"),
        meta: { verify: true }
      },
      {
        path: "model-service",
        component: () => import("@/view/setting/model.vue"),
        meta: { verify: true }
      },
      {
        path: "search-service",
        component: () => import("@/view/setting/search.vue"),
        meta: { verify: true }

      },
      {
        path: "mcp-service",
        component: () => import("@/view/setting/mcp.vue"),
        meta: { verify: true }
      },
      {
        path: "about",
        component: () => import("@/view/setting/about.vue"),
        meta: { verify: true }
      },{
        path:"usage",
        component: () => import("@/view/auth/usage.vue"),
        meta: { verify: true }
      },{
        //UserProfile.vue
        path: "profile",
        component: () => import("@/view/auth/UserProfile.vue"),
        meta: { verify: true }
      }
    ]
  }
]


const router = createRouter({
  //判断是不是 客户端 如果是客户端则使用 createWebHashHistory 否则使用 createWebHistory
  history: import.meta.env.VITE_IS_CLIENT === 'true' ? createWebHashHistory() : createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('access_token');
  console.log("import.meta.env.VITE_IS_CLIENT === ",import.meta.env.VITE_IS_CLIENT);
  const { meta = {} } = to;
  // If route requires authentication and no token exists, redirect to login
  // if (meta.verify && !token) {
  //   console.log("Authentication failed, redirecting to login");
  //   next({ name: 'login' });
  //   return;
  // }
  next();
})

export default router