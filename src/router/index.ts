import {createRouter, createWebHistory} from 'vue-router';
import type {RouteRecordRaw} from 'vue-router'
// 引入nprogress
import NProgress from 'nprogress';
import 'nprogress/nprogress.css'; // 引入样式

import NotFoundPage from "../pages/NotFoundPage.vue";
import HomePage from "../pages/HomePage.vue";
import TestPage from "../pages/TestPage.vue";
import SettingsPage from "../pages/SettingsPage.vue";
import UserPage from "../pages/UserPage.vue";
import FriendsPage from "../pages/FriendsPage.vue";
import HotPage from "../pages/HotPage.vue";
import LoginPage from "../pages/LoginPage.vue";
import RegisterPage from "../pages/RegisterPage.vue";
import appStore from "../stores";
import {message} from "ant-design-vue";
import {config} from "../common/config.ts";

NProgress.inc(0.2)
// 进度条配置（可选）
NProgress.configure({
    speed: 2000,            // 进度条增加的速度
    showSpinner: false,    // 是否显示加载小图标
    trickle: false,        // 是否显示一个小的进度条在顶部
    trickleSpeed: 200,     // 顶部小进度条的更新速度
    minimum: 0.08,         // 进度条开始时的最小百分比
    positionUsing: '',    // CSS选择器或DOM元素，进度条将使用其边界进行定位
}); // 不显示默认的spinner

const routes: RouteRecordRaw[] = [
    {path: '/', name: 'home', component: HomePage, meta: {title: "首页"}},
    {path: '/login/', name: 'login', component: LoginPage, meta: {title: "登录"}},
    {path: '/register/', name: 'register', component: RegisterPage, meta: {title: "注册"}},
    {path: '/settings/', name: 'settings', component: SettingsPage, meta: {title: "设置"}},
    {path: '/friends/', name: 'friends', component: FriendsPage, meta: {title: "朋友"}},
    {path: '/hot/', name: 'hot', component: HotPage, meta: {title: "热点"}},
    {path: '/test/', name: 'test', component: TestPage, meta: {title: "测试"}},
    {path: '/l/', name: 'long', component: ()=>import("@/pages/LongPostPage.vue"), meta: {title: "发长文"}},
    {path: '/s/:post_id/', name: 'post', component: ()=>import("@/pages/SharePage.vue"), meta: {title: "分享帖子"}},
    {path: '/u/:username/', name: 'user', component: UserPage, meta: {title: "用户中心"}},
    {path: '/reset_password/', name: 'reset_password', component:()=>import("@/pages/ResetPasswordPage.vue"),
        meta: {title: "密码重置"}},
    {path: '/:catchALL(.*)/', component: NotFoundPage, name: 'not-fond', meta: {title: "Not Found"}},
]

const router = createRouter({
    // 内部提供了 history 模式的实现。为了简单起见，我们在这里使用 hash 模式
    history: createWebHistory(config.APP_BASE_URL),
    routes: routes, // `routes: routes` 的缩写
});

router.beforeEach((to, _, next) => {
    //beforeEach是router的钩子函数，在进入路由前执行
    // 开始进度条
    NProgress.start();
    if (to.meta.title) {
        document.title = to.meta.title + ' | alsoapp'
    }

    // 白名单：不需要登录的页面
  const whiteNames = ['login', 'register', 'reset_password', 'post'];
  const isWhiteList = whiteNames.includes(to.name as string);
  const hasToken = !!appStore.useAccountStore.token.access_token; //access_token可能为 '' / null / undefined
  console.info(isWhiteList, hasToken)
  // 已登录，访问登录/注册页 → 跳首页
  if (isWhiteList && hasToken) {
    return next('/')
  }
  // 未登录，访问需要权限的页 → 跳登录
  if (!isWhiteList && !hasToken) {
    message.warn("需要重新登录!");
    return next({
      path: '/login/',
      query: { redirect: to.fullPath }
    })
  }
  next();
})

router.afterEach(() => {
    // 完成进度条
    NProgress.done();
});

export default router;