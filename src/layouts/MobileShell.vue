<!--
  MobileShell.vue — 移动端外壳布局

  用途：给所有移动端页面套上「顶部标题栏 + 中间内容 + 底部 Tab 栏」的结构（参考微信）。
  职责边界：只负责外壳与内容留白；页面内部布局仍由各页面自己决定。
  注意：
    - 顶栏/底栏都是 position: fixed，内容留白由本组件用 padding 撑开；
      padding 与条高必须用同一组 CSS 变量（--m-navbar-h / --m-tabbar-h），否则会出现半截遮挡。
    - 是否需要顶栏/底栏由路由 meta 决定，见 common/mobile.ts 的 resolveMobileView。
-->
<script setup lang="ts">
import {computed} from 'vue';
import {useRoute} from 'vue-router';

import {resolveMobileView} from '@/common/mobile.ts';
import MobileNavBar from '@/components/mobile/MobileNavBar.vue';
import MobileTabBar from '@/components/mobile/MobileTabBar.vue';

const route = useRoute();
const view = computed(() => resolveMobileView(route));
</script>

<template>
  <div
    class="mobile-shell"
    :class="{
      'mobile-shell--no-navbar': !view.navbar,
      'mobile-shell--no-tabbar': !view.tabbar,
    }"
  >
    <!-- 搜索框只在桌面顶栏里，移动端把它放到首页标题栏右侧 -->
    <MobileNavBar
      v-if="view.navbar"
      :title="view.title"
      :show-back="!view.tabKey"
      :show-search="view.tabKey === 'home'"
    />

    <!--
      内容区不加 overflow，交给文档流整体滚动：
      移动端浏览器地址栏收起/展开会改变可视高度，用 100vh 固定高度的容器会被截掉一截，
      而「整页滚动」是原生行为，也才能用上 iOS 的橡皮筋回弹。
      首页例外——它需要内部滚动来触发触底加载，自己算高度（见 HomePage）。
    -->
    <slot />

    <MobileTabBar v-if="view.tabbar" :active="view.tabKey" />
  </div>
</template>

<style scoped>
.mobile-shell {
  min-height: 100dvh;
  box-sizing: border-box;
  /* 顶栏/底栏都是 fixed，这里留出与它们等高的空白 */
  padding-top: calc(var(--m-navbar-h) + var(--m-safe-top));
  padding-bottom: calc(var(--m-tabbar-h) + var(--m-safe-bottom));
  background: #f7f7fa;
}

/* 页面自己画头部时（mobileHeader: false），内容从屏幕顶部开始 */
.mobile-shell--no-navbar {
  padding-top: 0;
}

/* 二级页没有底部栏 */
.mobile-shell--no-tabbar {
  padding-bottom: 0;
}
</style>
