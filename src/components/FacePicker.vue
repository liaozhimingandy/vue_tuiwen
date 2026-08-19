<script setup lang="ts">
import {ref} from "vue";
import {FACE_GROUPS} from "@/common/emoji.ts";
import type {FaceItem} from "@/common/emoji.ts";

const emit = defineEmits(["select"]);
const activeKey = ref("0");

const selectFace = (item: FaceItem) => {
  if (item.type === "unicode") {
    // 原生表情：直接抛出 Unicode 字符
    emit("select", item.unicode);
  } else {
    // 自定义图片表情：抛出标准化标记 [face:编码]
    emit("select", `[face:${item.code}]`);
  }
};
</script>

<template>
  <div class="face-panel" @mousedown.prevent>
    <a-tabs
        v-model:activeKey="activeKey"
        tab-position="bottom"
        animated
        size="small"
    >
      <a-tab-pane
          v-for="(group, idx) in FACE_GROUPS"
          :key="String(idx)"
      >
        <template #tab>
          <a-tooltip :title="group.label">
            <span>{{ group.icon }}</span>
          </a-tooltip>
        </template>
        <div class="face-content">
          <div class="face-grid">
            <div
                v-for="item in group.list"
                :key="item.code"
                class="face-item"
                @click="selectFace(item)"
            >
              <a-tooltip :title="item.name">
                <!-- 自动区分渲染原生字符 / 自定义图片 -->
                <span v-if="item.type === 'unicode'">{{ item.unicode }}</span>
                <img
                    v-else
                    :src="item.src"
                    alt=""
                    class="custom-face-img"
                />
              </a-tooltip>
            </div>
          </div>
        </div>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<style scoped>
.face-panel {
  width: 420px;
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
  grid-template-columns: repeat(10, 1fr);
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

/* 优化Antd底部Tab样式 */
:deep(.ant-tabs-tab) {
  padding: 10px 6px !important;
  margin: 0 !important;
  min-width: 44px;
  justify-content: center;
  font-size: 22px;
}

:deep(.ant-tabs-nav-wrap) {
  justify-content: flex-start;
}
</style>
