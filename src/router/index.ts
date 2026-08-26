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
import {MessagePlugin} from 'tdesign-vue-next';
import SearchResultPage from "../pages/SearchResultPage.vue";
import TwoStepVerificationPage from "../pages/TwoStepVerificationPage.vue";

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
    {path: '/two_step_verification/authentication/', name: 'two_step_verification', component: TwoStepVerificationPage},
    {path: '/login/', name: 'login', component: LoginPage, meta: {title: "登录", need_two_step_verification: true}},
    {path: '/register/', name: 'register', component: RegisterPage, meta: {title: "注册", need_two_step_verification: true}},
    {path: '/settings/', name: 'settings', component: SettingsPage, meta: {title: "设置"}},
    {path: '/search/result/', name: 'search', component: SearchResultPage, meta: {title: "搜索结果"}},
    {path: '/friends/', name: 'friends', component: FriendsPage, meta: {title: "朋友"}},
    {path: '/hot/', name: 'hot', component: HotPage, meta: {title: "热点"}},
    {path: '/test/', name: 'test', component: TestPage, meta: {title: "测试"}},
    {path: '/articles/', name: 'article', component: () => import("@/pages/ArticlePage.vue"), meta: {title: "发长文"}},
    {path: '/s/:post_id/', name: 'post', component: () => import("@/pages/SharePage.vue"), meta: {title: "分享帖子"}},
    {path: '/u/:username/', name: 'user', component: UserPage, meta: {title: "用户中心"}},
    {
        path: '/reset_password/', name: 'reset_password', component: () => import("@/pages/ResetPasswordPage.vue"),
        meta: {title: "密码重置", need_two_step_verification: true}
    },
    {path: '/:catchALL(.*)/', component: NotFoundPage, name: 'not-fond', meta: {title: "Not Found"}},
]

const router = createRouter({
    // 内部提供了 history 模式的实现。为了简单起见，我们在这里使用 hash 模式
    history: createWebHistory('/'),
    routes: routes, // `routes: routes` 的缩写
});

router.beforeEach((to, _) => {
    NProgress.start();


    const siteSuffix = 'alsoapp';
    if (to.meta.title) {
        if (to.name === 'search') {
            const q = (to.query.q as string)?.trim()
            if (q) {
                document.title = `${q} - ${to.meta.title} | ${siteSuffix}`
            } else {
                document.title = `${to.meta.title} | ${siteSuffix}`
            }
        } else {
            document.title = `${to.meta.title} | ${siteSuffix}`
        }
    }

    // ==========【新增：人机预检拦截逻辑】==========
    // 访问需要预检的页面，检查本地凭证
    // if (to.meta.need_two_step_verification) {
    //     const ok = !! sessionStorage.getItem('two_step_verification_success')
    //     if (!ok) {
    //         // 没有凭证，跳转到预检页，并记录跳转回来的地址
    //         return {
    //             name: 'two_step_verification',
    //             query: {redirect: to.fullPath},
    //             replace: true
    //         }
    //     }
    // }
    // ==========================================

    const whiteList = ['login', 'register', 'reset_password', 'post', 'two_step_verification', "test"];
    const isWhiteList = whiteList.includes(to.name as string);
    const hasToken = !!appStore.useAccountStore.token?.access_token;

    const authPages = ['login', 'register', 'reset_password'];
    if (authPages.includes(to.name as string) && hasToken) {
        return {name: 'home', replace: true}
    }

    if (!isWhiteList && !hasToken) {
        MessagePlugin.warning("需要重新登录!");
        return {
            name: 'login',
            query: {redirect: to.fullPath},
            replace: true
        }
    }

    // 正常放行
    return true
})

router.afterEach(() => {
    // 完成进度条
    NProgress.done();
});

export default router;