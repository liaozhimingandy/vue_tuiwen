<!--
  FacePicker.vue — 表情选择面板
  用途：在发帖/评论输入框中弹出表情面板，用户点击表情后向父组件抛回表情标记。
  职责边界：只负责「展示表情分组 + 抛出选中事件」，不感知发送、不维护草稿、不渲染输入框。
  使用场景：被 NewPost.vue 用 <t-popup> 包裹，作为「表情包」按钮的弹层。
  注意：
    - 表情数据来自 @/common/emoji 的 FACE_GROUPS（含原生 Unicode 与自定义图片两类）。
    - 抛出格式分两种：原生表情抛 Unicode 字符；自定义图片抛 [face:编码] 标记。
    - 根节点 @mousedown.prevent 用于阻止面板抢走输入框焦点（避免 textarea 失焦导致光标丢失）。
-->
<script setup lang="ts">
import {ref} from 'vue';
import {FACE_GROUPS} from '@/common/emoji.ts';
import type {FaceItem} from '@/common/emoji.ts';

/**
 * 向父组件抛出表情选中事件。
 * @emits select — 参数为表情标记字符串：
 *   - 原生 Unicode 表情：直接抛出字符本身（如 "😀"）
 *   - 自定义图片表情：抛出标准化标记 `[face:编码]`（如 "[face:smile]"）
 */
const emit = defineEmits(['select']);
// 当前激活的分组索引，默认选中第一组（索引 0）
const activeKey = ref('0');

const selectFace = (item: FaceItem) => {
  if (item.type === 'unicode') {
    // 原生表情：直接抛出 Unicode 字符
    emit('select', item.unicode);
  } else {
    // 自定义图片表情：抛出标准化标记 [face:编码]
    emit('select', `[face:${item.code}]`);
  }
};
</script>

<template>
  <div class="face-panel" @mousedown.prevent>
    <t-tabs :value="activeKey" placement="bottom" animated>
      <t-tab-panel v-for="(group, idx) in FACE_GROUPS" :value="String(idx)">
        <template #label>
          <t-tooltip :content="group.label" show-arrow>
            <span>{{ group.icon }}</span>
          </t-tooltip>
        </template>
        <div class="face-content">
          <div class="face-grid">
            <div v-for="item in group.list" :key="item.code" class="face-item" @click="selectFace(item)">
              <t-tooltip :content="item.name" show-arrow>
                <!-- 自动区分渲染原生字符 / 自定义图片 -->
                <span v-if="item.type === 'unicode'">{{ item.unicode }}</span>
                <t-image v-else :src="item.src" alt="" class="custom-face-img" />
              </t-tooltip>
            </div>
          </div>
        </div>
      </t-tab-panel>
    </t-tabs>
  </div>
</template>

<style scoped>
.face-panel {
  width: 360px;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
}

.face-content {
  padding: 12px;
  max-height: 240px;
  overflow-y: auto;
}

.face-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 6px;
}

.face-item {
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  cursor: pointer;
  border-radius: 4px;
}

.face-item:hover {
  background: #f0f0f0;
}

.custom-face-img {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

/* 优化 TDesign 底部 Tab 样式
   注意：这里必须用 TDesign 的类名（t-tabs__*）。
   早期写成 .ant-tabs-*（Ant Design 的类名），
   在本项目中根本匹配不到任何元素，样式等于从未生效。 */
:deep(.t-tabs__nav-item) {
  padding: 10px 6px !important;
  margin: 0 !important;
  min-width: 44px;
  justify-content: center;
  font-size: 22px;
}

:deep(.t-tabs__nav-wrap) {
  justify-content: flex-start;
}
</style>
