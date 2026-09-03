<script setup lang="ts">
defineProps({
  name: {
    type: String,
    required: true
  },
  size: {
    type: [String, Number],
    default: 16
  },
  color: {
    type: String,
    default: 'currentColor'
  }
})

</script>
<template>

<svg
  class="svg-icon"
  :width="size"
  :height="size"
  :fill="color"
>
  <use :href="`#icon-${name}`"/>
</svg>
</template>

<style scoped>
.svg-icon {
  display: inline-block;
  vertical-align: middle;
}
</style>