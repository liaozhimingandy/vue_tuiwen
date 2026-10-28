/**
 * 移动端外壳（顶部标题栏 / 底部 Tab 栏）的布局决策
 *
 * 为什么要抽成纯函数：一页要不要外壳、要不要顶栏、要不要底栏，全由路由 meta 决定。
 * 逻辑写在 App.vue 的模板条件里会有三层嵌套三元，既难读也没法单测。
 *
 * 约定（写在路由 meta 上）：
 * - `mobileTab`: 'home' | 'snap' | 'video' | 'me' —— 属于一级 Tab 页，显示底部栏；
 * - `mobileHeader: false` —— 页面自己画了头部（如「天亮即焚」的深色顶栏），外壳不再重复画；
 * - `mobileShell: false` —— 完全不要外壳（登录、短视频、全屏编辑器这类沉浸页）。
 *
 * 三者缺省时：有外壳、有顶栏、无底栏 —— 也就是「普通二级页」的默认形态。
 */
import type {RouteLocationNormalizedLoaded} from 'vue-router';

/** 底部 Tab 的标识，与 MobileTabBar 里的顺序一致 */
export type MobileTabKey = 'home' | 'snap' | 'video' | 'me';

/**
 * 顶部栏高度（不含安全区）
 *
 * 与 style.css 里的 `--m-navbar-h` 必须一致：CSS 负责撑开留白，
 * 这里给需要「自己算高度」的页面（首页的滚动容器）用，两处不一致就会出现半截错位。
 */
export const MOBILE_NAVBAR_HEIGHT = 46;

/** 底部栏高度（不含安全区），同样与 `--m-tabbar-h` 对应 */
export const MOBILE_TABBAR_HEIGHT = 54;

/** 一页在移动端应该渲染成什么样 */
export interface MobileView {
  /** 是否套外壳（外壳负责顶部栏/底部栏与内容留白） */
  shell: boolean;
  /** 是否由外壳画顶部标题栏 */
  navbar: boolean;
  /** 是否显示底部 Tab 栏 */
  tabbar: boolean;
  /** 顶部标题，取自 route.meta.title */
  title: string;
  /** 当前激活的 Tab（非 Tab 页为 null） */
  tabKey: MobileTabKey | null;
}

/**
 * 根据当前路由算出移动端的渲染形态
 *
 * @param route 当前路由（只用到 meta）
 */
export function resolveMobileView(route: Pick<RouteLocationNormalizedLoaded, 'meta'>): MobileView {
  const meta = (route.meta ?? {}) as Record<string, unknown>;
  const shell = meta.mobileShell !== false;
  const tabKey = (meta.mobileTab as MobileTabKey | undefined) ?? null;

  return {
    shell,
    // 页面自带头部时（mobileHeader: false）外壳不画，否则会两套头叠在一起
    navbar: shell && meta.mobileHeader !== false,
    // 只有一级 Tab 页才有底部栏：二级页（设置、搜索结果、帖子详情）留着底栏会误以为还能切页
    tabbar: shell && tabKey !== null,
    title: typeof meta.title === 'string' ? meta.title : '',
    tabKey,
  };
}

/**
 * 量出移动端外壳占掉的高度（顶栏 + 底栏 + 上下安全区）
 *
 * 给需要「自己算滚动容器高度」的页面用（首页、设置页）。
 * 为什么不是直接用常量相加：刘海屏的 `env(safe-area-inset-*)` 只有 CSS 算得出来，
 * JS 里读不到真实的 px 值；而外壳的 padding 本来就是「条高 + 安全区」，
 * 直接读它的计算值最准，也不会因为以后调高度而漂移。
 *
 * @returns 外壳上下的总留白（px）；不在外壳内（桌面端）时返回 0
 */
export function measureMobileChrome(): number {
  if (typeof document === 'undefined') return 0;
  const shell = document.querySelector('.mobile-shell') as HTMLElement | null;
  if (!shell) return 0;

  const style = getComputedStyle(shell);
  return (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0);
}
