<script setup lang="ts">
import { ref } from 'vue'
import { FACE_GROUPS } from '@/common/emoji.ts'
import type { FaceItem } from '@/common/emoji.ts'

const emit = defineEmits(['select'])
// 当前激活分组索引
const activeTabIndex = ref(0)

const selectFace = (item: FaceItem) => {
  emit('select', `[${item.code}]`)
}

// 切换分组
const changeTab = (idx: number) => {
  activeTabIndex.value = idx
}
</script>

<template>
  <div class="face-panel">
    <!-- 表情内容区域 -->
    <div class="face-content">
      <div class="face-grid">
        <div
          v-for="item in FACE_GROUPS[activeTabIndex].list"
          :key="item.code"
          class="face-item"
          @click="selectFace(item)"
        >
          <img :src="item.src" :alt="item.name" />
        </div>
      </div>
    </div>

    <!-- 底部分类Tab（修复Tab过宽问题） -->
    <div class="face-tabs">
      <div
        v-for="(group, idx) in FACE_GROUPS"
        :key="group.label"
        class="tab-item"
        :class="{ active: activeTabIndex === idx }"
        @click="changeTab(idx)"
      >
        <span class="tab-icon">{{ group.label }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.face-panel {
  width: 360px;
  background: #fff;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
/* 上方表情滚动区域 */
.face-content {
  padding: 12px;
  max-height: 320px;
  overflow-y: auto;
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

/* 底部Tab导航栏【重点改动】 */
.face-tabs {
  display: flex;
  align-items: center;
  border-top: 1px solid #eee;
  /* 让tab靠左紧凑排列；想居中就加上 justify-content: center */
  justify-content: flex-start;
}
.tab-item {
  /* 删除 flex:1，不再均分宽度 */
  min-width: 48px;
  padding: 10px 4px;
  text-align: center;
  cursor: pointer;
  transition: background 0.2s;
}
.tab-item:hover {
  background-color: #f7f7f7;
}
.tab-item.active {
  background-color: #eeeeee;
}
.tab-icon {
  font-size: 22px;
}
</style>
