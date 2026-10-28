<!--
  MobileNavBar.vue — 移动端顶部标题栏

  用途：一级 Tab 页显示页面标题，二级页显示返回箭头 + 标题（微信/通用 App 的导航条形态）。
  职责边界：只负责"标题栏"本身：返回、标题、右侧插槽。不处理外壳留白（由 MobileShell 负责）。
  注意：
    - 固定在顶部，高度 = --m-navbar-h + 状态栏安全区；外壳的内容留白用同一个算式，改高度只改 CSS 变量。
    - 返回优先走 history.back()，直接打开二级页（如分享链接）时没有历史，退到首页而不是停在空白页。
    - 移动端没有桌面顶栏的搜索框，所以首页的标题栏右侧放一个搜索入口（showSearch）。
-->
<script setup lang="ts">
import {ChevronLeftIcon, SearchIcon} from 'tdesign-icons-vue-next';
import {useRouter} from 'vue-router';

const props = withDefaults(
  defineProps<{
    /** 标题文案 */
    title?: string;
    /** 是否显示返回按钮（一级 Tab 页为 false） */
    showBack?: boolean;
    /** 是否显示右侧搜索入口 */
    showSearch?: boolean;
  }>(),
  {title: '', showBack: false, showSearch: false},
);

const router = useRouter();

/**
 * 返回上一页
 *
 * `history.state.back` 是 vue-router 4 在 history 模式下维护的上一条记录：
 * 有了才 back()，否则（用户直接从外部链接/分享进入）replace 到首页，
 * 不然点一次返回会退出站点，用户看到的是浏览器新标签页。
 */
const onBack = () => {
  if (window.history.state?.back) {
    router.back();
    return;
  }
  router.replace({name: 'home'});
};
</script>

<template>
  <header class="m-navbar">
    <div class="m-navbar__side">
      <button v-if="props.showBack" type="button" class="m-navbar__back" aria-label="返回" @click="onBack">
        <ChevronLeftIcon size="26" />
      </button>
      <slot name="left" />
    </div>

    <h1 class="m-navbar__title">{{ props.title }}</h1>

    <div class="m-navbar__side m-navbar__side--right">
      <slot name="right" />
      <button
        v-if="props.showSearch"
        type="button"
        class="m-navbar__action"
        aria-label="搜索"
        @click="router.push({name: 'search'})"
      >
        <SearchIcon size="22" />
      </button>
    </div>
  </header>
</template>

<style scoped>
.m-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  height: calc(var(--m-navbar-h) + var(--m-safe-top));
  padding: var(--m-safe-top) 8px 0;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.92);
  /* 半透明 + 模糊：iOS 上滚动内容从标题栏下透出，比纯色更像原生 */
  backdrop-filter: saturate(180%) blur(12px);
  -webkit-backdrop-filter: saturate(180%) blur(12px);
  border-bottom: 0.5px solid rgba(0, 0, 0, 0.08);
}

.m-navbar__side {
  display: flex;
  align-items: center;
  min-width: 44px;
  height: 100%;
}

.m-navbar__side--right {
  justify-content: flex-end;
}

.m-navbar__back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* 44px 是触摸目标的下限，比图标大一圈，避免点不中 */
  width: 44px;
  height: 44px;
  margin-left: -8px;
  border: none;
  background: transparent;
  color: var(--td-text-color-primary, #1f2329);
  cursor: pointer;
}

.m-navbar__back:active {
  opacity: 0.5;
}

.m-navbar__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-right: -8px;
  border: none;
  background: transparent;
  color: var(--td-text-color-primary, #1f2329);
  cursor: pointer;
}

.m-navbar__action:active {
  opacity: 0.5;
}

.m-navbar__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
  font-size: 17px;
  font-weight: 600;
  color: var(--td-text-color-primary, #1f2329);
}
</style>
