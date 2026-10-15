<!--
  LogoSvg2 - 品牌图标（方案A）SVG 组件

  用途：渲染 iconfont 来源的「推文」品牌标记，并镂空出一个圆形高光点。
  与 LogoSvg（方案B：气泡 + 双眼睛）并列为同一套 Logo 备选方案。

  实现要点：
  - 图形由 mask 实现「整体着色 + 镂空圆孔」：mask 里白色矩形代表完全显示，
    黑色圆代表完全透明（透出下层背景），因此图标本身可以是任意颜色。
  - mask 的 id 必须**每个实例唯一**：SVG 文档内 id 全局有效，
    多个实例共用同一个 id 时，浏览器会统一解析到文档中第一个同 id 的 mask，
    导致后续实例的镂空跟着第一个实例走。这里用 useId() 生成唯一后缀。
  - 原始路径来自 1269×1024 画布，通过 translate + scale 映射到 100×100 视口，
    因此组件对外只需暴露 100×100 的坐标系。

  被谁使用：LogoPage.vue（配色预览 / 导出）。
-->
<template>
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <mask :id="maskId">
        <!-- 白色矩形：整块可见 -->
        <rect x="0" y="0" width="100" height="100" fill="#ffffff" />
        <!-- 黑色圆：完全透明，形成镂空高光点 -->
        <circle cx="80" cy="28" :r="holeRadius" fill="#000000" />
      </mask>
    </defs>

    <g :mask="`url(#${maskId})`">
      <g :transform="BRAND_TRANSFORM">
        <path :d="BRAND_PATH_1" :fill="fillBg" />
        <path :d="BRAND_PATH_2" :fill="fillBg" />
      </g>
    </g>
  </svg>
</template>

<script setup lang="ts">
import {useId} from 'vue';
import {BRAND_PATH_1, BRAND_PATH_2, BRAND_TRANSFORM} from '@/common/logo-paths.ts';

withDefaults(
  defineProps<{
    /** Logo 前景填充色（图标本身的颜色），对应文件头注释中的「填充色」语义 */
    fillBg?: string;
    /** 镂空高光点半径（100×100 视口单位） */
    holeRadius?: number;
  }>(),
  {
    fillBg: '#ffffff',
    holeRadius: 4,
  },
);

/** 每个实例唯一的 mask id，避免多实例互相抢占同一个 id */
const maskId = `logo-brand-mask-${useId()}`;
</script>
