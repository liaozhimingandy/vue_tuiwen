<!--
  SvgIcon - SVG 雪碧图图标组件

  用途：通过 <use href="#icon-{name}"> 引用全局注入的 SVG symbol，渲染单色矢量图标。
  职责边界：纯展示，颜色默认继承 currentColor。
  被谁使用：各处需要矢量图标的位置。
  注意：
  - 依赖全局已注册的 SVG sprite（#icon-{name} 必须存在，通常由 vite 插件或入口注入）。
  - size 支持数字（视为 px）或字符串（如 '1em' / '24px'）。
-->
<script setup lang="ts">
defineProps({
  // 图标名称，对应全局 SVG sprite 中的 #icon-{name} 符号
  name: {
    type: String,
    required: true,
  },
  // 图标尺寸：数字视为 px，字符串原样透传（如 '1em' / '24px'）
  size: {
    type: [String, Number],
    default: 16,
  },
  // 图标颜色，默认继承 currentColor（随父级文字颜色变化）
  color: {
    type: String,
    default: 'currentColor',
  },
});
</script>
<template>
  <svg class="svg-icon" :width="size" :height="size" :fill="color">
    <use :href="`#icon-${name}`" />
  </svg>
</template>

<style scoped>
.svg-icon {
  display: inline-block;
  vertical-align: middle;
}
</style>
