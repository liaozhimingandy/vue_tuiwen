<!--
  LogoSvg - 气泡「发声」符号（方案B）SVG 组件

  用途：渲染备选方案B 的图形——气泡外轮廓 + 两只镂空眼睛，整体像一个有表情的"发声"符号。
  被谁使用：LogoPage.vue（配色预览 / 导出）。
  实现要点：外轮廓与眼睛拼成一条 path，配合 fill-rule="evenodd" 让眼睛区域镂空。

  注意：路径常量已抽到 `common/logo-paths.ts`，与方案A、导出逻辑共用同一份数据源，
  避免三处各写一份后慢慢漂移。
-->
<template>
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path :d="BUBBLE_FULL_PATH" :fill="fillBg" fill-rule="evenodd" />
  </svg>
</template>

<script setup lang="ts">
import {BUBBLE_FULL_PATH} from '@/common/logo-paths.ts';

// 填充色，由父组件传入，控制 Logo 前景色
withDefaults(
  defineProps<{
    /** Logo 前景填充色 */
    fillBg?: string;
  }>(),
  {
    fillBg: '#2E7DFF',
  },
);
</script>
