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
    {path: '/u/:username/', name: 'user', component: UserPage, meta: {title: "用户中心"}},
    {path: '/:catchALL(.*)/', component: NotFoundPage, name: 'not-fond', meta: {title: "Not Found"}},
]

const router = createRouter({
    // 内部提供了 history 模式的实现。为了简单起见，我们在这里使用 hash 模式
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: routes, // `routes: routes` 的缩写
});

router.beforeEach((to, from, next) => {
    //beforeEach是router的钩子函数，在进入路由前执行
    // 开始进度条
    NProgress.start();
    if (to.meta.title) {
        document.title = to.meta.title + ' | alsoapp'
    }

    // 如果路径不是以 / 开头，则自动添加 /
    if (!to.path.endsWith('/')) {
        next({path: to.path + '/'});
    } else {
        // 检查用户是否登录
        const access_token = localStorage.getItem('access_token');
        if ((to.path !== '/login/' && to.path !== '/register/')  && !access_token) {
            next({path: '/login/', query: {redirect: to.fullPath}});
        } else {
            next();
        }
    }
})

router.afterEach(() => {
    // 完成进度条
    NProgress.done();
});

export default router;