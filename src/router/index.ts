/**
 * 路由配置与全局导航守卫
 *
 * 守卫职责（按执行顺序）：
 * 1. 打开顶部进度条 NProgress，并按 meta.title 设置页面标题
 * 2. 需要人机预检的页面（meta.need_two_step_verification）先校验本地凭证
 * 3. 白名单页面无需登录；已登录用户访问登录/注册页时重定向回首页
 * 4. 其余页面未登录统一跳登录页并带 redirect
 */
import {createRouter, createWebHistory} from 'vue-router';
import type {RouteRecordRaw} from 'vue-router';
// 引入nprogress
import NProgress from 'nprogress';
import 'nprogress/nprogress.css'; // 引入样式

import appStore from '../stores';
import {MessagePlugin} from 'tdesign-vue-next';

NProgress.inc(0.2);
// 进度条配置（可选）
NProgress.configure({
  speed: 2000, // 进度条增加的速度
  showSpinner: false, // 是否显示加载小图标
  trickle: false, // 是否关闭"自动递增"（true 时进度条会自行缓慢增长）
  trickleSpeed: 200, // 自动递增的更新间隔（毫秒）
  minimum: 0.08, // 进度条开始时的最小百分比
  positionUsing: '', // 进度条定位方式；空字符串表示不做特殊定位，按默认 fixed 处理
}); // 不显示默认的spinner

/**
 * 路由表
 * meta.title：浏览器标题后缀（拼在 `${title} | alsoapp` 中）
 * meta.need_two_step_verification：进入前需先通过人机预检
 *
 * ⚠️ 分包约定：**所有页面一律使用动态 import()**
 * 原因：静态 import 会被打进入口 chunk，导致「首屏必须下载全部页面 + 它们的依赖」。
 * 改造前 12 个页面是静态导入，入口 JS 达 914KB（含 dayjs / lottie / turnstile / vue-clamp 等）；
 * 改为动态 import 后，入口只保留框架运行时，各页面按访问时机单独下载。
 * 新增页面时请沿用这种写法，不要写 `import XxxPage from '../pages/XxxPage.vue'`。
 */
const routes: RouteRecordRaw[] = [
  {path: '/', name: 'home', component: () => import('@/pages/HomePage.vue'), meta: {title: '首页'}},
  {
    path: '/two_step_verification/authentication/',
    name: 'two_step_verification',
    component: () => import('@/pages/TwoStepVerificationPage.vue'),
    meta: {title: '人机验证'},
  },
  {
    path: '/login/',
    name: 'login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: {title: '登录', need_two_step_verification: true},
  },
  {
    path: '/register/',
    name: 'register',
    component: () => import('@/pages/RegisterPage.vue'),
    meta: {title: '注册', need_two_step_verification: true},
  },
  {
    path: '/settings/',
    name: 'settings',
    component: () => import('@/pages/SettingsPage.vue'),
    meta: {title: '设置'},
  },
  {
    path: '/search/result/',
    name: 'search',
    component: () => import('@/pages/SearchResultPage.vue'),
    meta: {title: '搜索结果'},
  },
  {path: '/friends/', name: 'friends', component: () => import('@/pages/FriendsPage.vue'), meta: {title: '朋友'}},
  {path: '/hot/', name: 'hot', component: () => import('@/pages/HotPage.vue'), meta: {title: '热点'}},
  {path: '/logo/', name: 'logo', component: () => import('@/pages/LogoPage.vue'), meta: {title: 'logo'}},
  {path: '/snaps/', name: 'snap', component: () => import('@/pages/SnapPage.vue'), meta: {title: '天亮即焚'}},
  {path: '/test/', name: 'test', component: () => import('@/pages/TestPage.vue'), meta: {title: '测试'}},
  {
    path: '/articles/',
    name: 'article',
    component: () => import('@/pages/ArticlePage.vue'),
    meta: {title: '发长文'},
  },
  {
    path: '/s/:post_id/',
    name: 'post',
    component: () => import('@/pages/SharePage.vue'),
    meta: {title: '分享帖子'},
  },
  {
    path: '/u/:username/',
    name: 'user',
    component: () => import('@/pages/UserPage.vue'),
    meta: {title: '用户中心'},
  },
  {
    path: '/reset_password/',
    name: 'reset_password',
    component: () => import('@/pages/ResetPasswordPage.vue'),
    meta: {title: '密码重置', need_two_step_verification: true},
  },
  {
    path: '/models/dcf/',
    name: 'dcf',
    component: () => import('@/pages/DCFModelPage.vue'),
    meta: {title: 'DCF企业自由现金流估值模型'},
  },
  {
    path: '/:catchALL(.*)/',
    name: 'not-fond',
    component: () => import('@/pages/NotFoundPage.vue'),
    meta: {title: 'Not Found'},
  },
];

const router = createRouter({
  // 使用 HTML5 History 模式（URL 无 # 号），base 固定为 '/'
  // 注意：服务端需配置 history fallback，把未知路径回落到 index.html
  history: createWebHistory('/'),
  routes: routes,
});

router.beforeEach((to, _) => {
  NProgress.start();

  const siteSuffix = 'alsoapp';
  if (to.meta.title) {
    if (to.name === 'search') {
      // 搜索页把关键词拼进标题，便于分享与浏览器历史识别
      const q = (to.query.q as string)?.trim();
      if (q) {
        document.title = `${q} - ${to.meta.title} | ${siteSuffix}`;
      } else {
        document.title = `${to.meta.title} | ${siteSuffix}`;
      }
    } else {
      document.title = `${to.meta.title} | ${siteSuffix}`;
    }
  }

  // ==========【人机预检拦截逻辑】==========
  // 访问需要预检的页面，检查本地凭证
  // if (to.meta.need_two_step_verification) {
  //   const ok = !!sessionStorage.getItem('two_step_verification_success');
  //   if (!ok) {
  //     // 没有凭证，跳转到预检页，并记录跳转回来的地址
  //     return {
  //       name: 'two_step_verification',
  //       query: {redirect: to.fullPath},
  //       replace: true,
  //     };
  //   }
  // }
  // ==========================================

  /** 免登录可访问的路由名（分享页、天亮即焚、DCF 模型等对外内容） */
  const whiteList = ['login', 'register', 'reset_password', 'post', 'two_step_verification', 'test', 'snap', 'dcf'];
  const isWhiteList = whiteList.includes(to.name as string);
  const hasToken = !!appStore.useAccountStore.token?.access_token;

  /** 已登录用户不应再看到的鉴权页 */
  const authPages = ['login', 'register', 'reset_password'];
  if (authPages.includes(to.name as string) && hasToken) {
    return {name: 'home', replace: true};
  }

  if (!isWhiteList && !hasToken) {
    MessagePlugin.warning('需要重新登录!');
    return {
      name: 'login',
      query: {redirect: to.fullPath},
      replace: true,
    };
  }

  // 正常放行
  return true;
});

router.afterEach(() => {
  // 完成进度条
  NProgress.done();
});

export default router;
