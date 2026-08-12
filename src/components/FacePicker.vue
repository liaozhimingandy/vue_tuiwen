<script setup lang="ts">
import { FACE_GROUPS } from '@/common/emoji.ts';
import type FaceItem from '@/common/emoji.ts';

const emit = defineEmits(['select'])

const selectFace = (item: FaceItem) => {
  // 向父组件抛出标记文本 [face01]
  emit('select', `[${item.code}]`)
}
</script>

<template>
  <div class="face-panel">
    <div v-for="group in FACE_GROUPS" :key="group.label" class="face-group">
      <div class="group-title">{{ group.label }}</div>
      <div class="face-grid">
        <div
          v-for="item in group.list"
          :key="item.code"
          class="face-item"
          @click="selectFace(item)"
        >
          <img :src="item.src" :alt="item.name" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.face-panel {
  width: 360px;
  max-height: 380px;
  overflow-y: auto;
  padding: 12px;
  background: #fff;
  border-radius: 8px;
}
.group-title {
  font-size: 13px;
  color: #666;
  margin: 6px 0 8px;
}
.face-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 6px;
}
.face-item {
  padding: 4px;
  cursor: pointer;
  border-radius: 4px;
}
.face-item:hover {
  background: #f0f0f0;
}
.face-item img {
  width: 32px;
  height: 32px;
  object-fit: contain;
}
</style>
