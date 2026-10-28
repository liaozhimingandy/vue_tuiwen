<!--
  MobileTabBar.vue — 移动端底部 Tab 栏

  用途：一级页面的主导航（首页 / 树洞 / 视频 / 我的），形态参考微信：图标 + 文字、选中变主色。
  职责边界：只负责导航与高亮；不处理页面留白（由 MobileShell 负责），不做红点/角标。
  注意：
    - 「我的」需要登录：已登录跳自己的主页（/u/{account_id}/），未登录跳登录页并带回跳地址。
    - 固定高度 54px + 底部安全区，与 style.css 的 --m-tabbar-h 对应；改高度只需改 CSS 变量。
-->
<script setup lang="ts">
import {computed, h} from 'vue';
import {HomeIcon, PlayCircleIcon, UserCircleIcon} from 'tdesign-icons-vue-next';

import appStore from '@/stores';
import SvgIcon from '@/components/SvgIcon.vue';
import type {MobileTabKey} from '@/common/mobile.ts';

const props = defineProps<{
  /** 当前激活的 Tab，由 MobileShell 根据路由 meta.mobileTab 传入 */
  active?: MobileTabKey | null;
}>();

/** 已登录用户的主页地址；未登录先去登录页 */
const meRoute = computed(() => {
  const accountId = appStore.useAccountStore.account?.account_id;
  if (accountId) return {name: 'user', params: {username: accountId}};
  return {name: 'login', query: {redirect: '/'}};
});

/**
 * Tab 定义
 *
 * 图标用 h() 生成 VNode 而不是放组件对象：
 * 「树洞」用的是项目自己的 SVG 雪碧图图标（SvgIcon），与 TDesign 图标混用时
 * `<component :is>` 传组件对象和传 VNode 写法不统一，统一成 VNode 模板里只剩一个分支。
 */
const tabs = computed(() => [
  {key: 'home' as const, label: '首页', to: {name: 'home'}, icon: h(HomeIcon, {size: '22px'})},
  {key: 'snap' as const, label: '树洞', to: {name: 'snap'}, icon: h(SvgIcon, {name: 'snap', size: '22px'})},
  {key: 'video' as const, label: '视频', to: {name: 'video_feed'}, icon: h(PlayCircleIcon, {size: '22px'})},
  {key: 'me' as const, label: '我的', to: meRoute.value, icon: h(UserCircleIcon, {size: '22px'})},
]);
</script>

<template>
  <nav class="m-tabbar" role="tablist">
    <router-link
      v-for="tab in tabs"
      :key="tab.key"
      :to="tab.to"
      class="m-tabbar__item"
      :class="{'is-active': tab.key === props.active}"
      role="tab"
      :aria-selected="tab.key === props.active"
    >
      <component :is="tab.icon" class="m-tabbar__icon" />
      <span class="m-tabbar__label">{{ tab.label }}</span>
    </router-link>
  </nav>
</template>

<style scoped>
.m-tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  display: flex;
  align-items: stretch;
  height: calc(var(--m-tabbar-h) + var(--m-safe-bottom));
  padding-bottom: var(--m-safe-bottom);
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: saturate(180%) blur(12px);
  -webkit-backdrop-filter: saturate(180%) blur(12px);
  border-top: 0.5px solid rgba(0, 0, 0, 0.08);
}

.m-tabbar__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-width: 0;
  color: #8a8f99;
  text-decoration: none;
  /* 去掉移动端点击时的蓝色高亮块，仅保留按下态透明度 */
  -webkit-tap-highlight-color: transparent;
}

.m-tabbar__item:active {
  opacity: 0.6;
}

.m-tabbar__item.is-active {
  color: var(--td-brand-color, #027aff);
}

.m-tabbar__icon {
  display: block;
  /* SvgIcon 的 fill 默认继承 currentColor，选中时随文字一起变主色 */
  fill: currentColor;
}

.m-tabbar__label {
  font-size: 11px;
  line-height: 1.2;
}
</style>
