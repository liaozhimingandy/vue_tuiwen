<template>
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path :d="fullPath" :fill="fillBg" fill-rule="evenodd" />
  </svg>
</template>

<script setup lang="ts">
// 填充色，由父组件传入，控制 Logo 前景色
defineProps<{
  fillBg: string;
}>();

// 气泡外轮廓路径（一段闭合贝塞尔曲线，底部带小尾巴）
const bubblePath =
  'M50 15 C 25 15 10 32 10 52 C 10 68 22 80 38 84 L 34 96 L 52 84 C 74 82 90 66 90 50 C 90 30 74 15 50 15 Z';
// 左眼镂空圆孔（以 (38,46) 为圆心、半径 6 的整圆路径）
const eye1 = 'M 38 46 m -6 0 a 6 6 0 1 0 12 0 a 6 6 0 1 0 -12 0';
// 右眼镂空圆孔（以 (62,46) 为圆心、半径 6 的整圆路径）
const eye2 = 'M 62 46 m -6 0 a 6 6 0 1 0 12 0 a 6 6 0 1 0 -12 0';

// 将外轮廓与两只眼睛拼成一个 path；配合 evenodd 填充规则形成镂空眼孔
const fullPath = `${bubblePath} ${eye1} ${eye2}`;
</script>
