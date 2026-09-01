<template>
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <path :d="fullPath" :fill="fillBg" fill-rule="evenodd"/>
  </svg>
</template>

<script setup lang="ts">
defineProps<{
  fillBg: string
}>()

// 外轮廓 + 2个眼睛镂空圆孔合并到一条路径
const bubblePath = 'M50 15 C 25 15 10 32 10 52 C 10 68 22 80 38 84 L 34 96 L 52 84 C 74 82 90 66 90 50 C 90 30 74 15 50 15 Z'
const eye1 = 'M 38 46 m -6 0 a 6 6 0 1 0 12 0 a 6 6 0 1 0 -12 0'
const eye2 = 'M 62 46 m -6 0 a 6 6 0 1 0 12 0 a 6 6 0 1 0 -12 0'

// 拼接成带镂空孔洞的完整路径
const fullPath = `${bubblePath} ${eye1} ${eye2}`
</script>
