import {createRouter, createWebHistory} from 'vue-router';
import type {RouteRecordRaw} from 'vue-router'
// 引入nprogress
import NProgress from 'nprogress';
import 'nprogress/nprogress.css'; // 引入样式
import {message} from 'ant-design-vue';

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
    {path: '/', name: 'home', component: HomePage},
    {path: '/login/', name: 'login', component: LoginPage},
    {path: '/register/', name: 'register', component: RegisterPage},
    {path: '/settings/', name: 'settings', component: SettingsPage},
    {path: '/friends/', name: 'friends', component: FriendsPage},
    {path: '/hot/', name: 'hot', component: HotPage},
    {path: '/test/', name: 'test', component: TestPage},
    {path: '/u/:username/', name: 'user', component: UserPage},
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
        // 获取本地token,判断是否存在
        const access_token = localStorage.getItem('access_token');
        if((!access_token || access_token === '') && !(to.name === 'login' || to.name === 'register')) {
            message.warn("你还没登录,请登录!");
            return next({name: 'login', query: {redirect: to.fullPath}});
        }else if(!(!access_token || access_token === '') && (to.name === 'login' || to.name === 'register')){
            return next({name: "home"})
        }
        next()
    }
})

router.afterEach(() => {
    // 完成进度条
    NProgress.done();
});

export default router;