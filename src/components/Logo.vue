<template>
  <svg viewBox="0 0 100 100">
    <path d="M50 15 C 25 15 10 32 10 52 C 10 68 22 80 38 84 L 34 96 L 52 84 C 74 82 90 66 90 50 C 90 30 74 15 50 15 Z" :fill="fillBg"></path>
    <circle cx="38" cy="46" r="6" :fill="fillEye"></circle>
    <circle cx="62" cy="46" r="6" :fill="fillEye"></circle>
  </svg>
</template>
<script setup lang="ts">
defineProps<{
  fillBg:string,
  fillEye: string
}>()
</script>
