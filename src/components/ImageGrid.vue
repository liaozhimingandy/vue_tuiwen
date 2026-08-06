<script setup lang="ts">
import { computed } from 'vue'
import {apiUrls} from "@/services/api.ts";

interface Props {
  /** 图片地址列表（唯一必填） */
  imageList: string[]
  /** 最大展示数量 */
  maxCount?: number
  /** 图片间距（px） */
  gap?: number
  /** 单张图最大宽度（px），控制单图不撑太宽 */
  singleMaxWidth?: number
  /** 单张图最大高度（px），控制竖图不太长 */
  singleMaxHeight?: number
  /** 2列布局（2张/4张）总最大宽度（px） */
  twoColMaxWidth?: number
  /** 3列布局（3张/5-9张）总最大宽度（px） */
  threeColMaxWidth?: number
  /** 图片圆角（px） */
  borderRadius?: number
  /** 是否开启预览 */
  previewable?: boolean
  /** 预览分组ID */
  previewGroupId?: string
  /** 加载失败兜底图 */
  fallback?: string
}

// 默认值对标微博网页版尺寸，开箱即用
const props = withDefaults(defineProps<Props>(), {
  maxCount: 9,
  gap: 8,
  singleMaxWidth: 360,
  singleMaxHeight: 480,
  twoColMaxWidth: 380,
  threeColMaxWidth: 420,
  borderRadius: 6,
  previewable: true,
  fallback: "data:image/png;base64,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"
})

const validImages = computed(() => props.imageList.slice(0, props.maxCount))
const imageCount = computed(() => validImages.value.length)
const remainCount = computed(() => Math.max(props.imageList.length - props.maxCount, 0))
const gridClass = computed(() => `grid-count-${Math.min(imageCount.value, 9)}`)
const groupId = computed(() => props.previewGroupId || `img-grid-${Math.random().toString(36).slice(2, 8)}`)

// 动态注入CSS变量，所有尺寸可配置
const gridStyle = computed(() => ({
  '--gap': `${props.gap}px`,
  '--radius': `${props.borderRadius}px`,
  '--single-max-width': `${props.singleMaxWidth}px`,
  '--single-max-height': `${props.singleMaxHeight}px`,
  '--two-col-max-width': `${props.twoColMaxWidth}px`,
  '--three-col-max-width': `${props.threeColMaxWidth}px`
}))
</script>

<template>
<!-- 空数组不渲染 -->
  <div
    v-if="validImages.length"
    class="image-grid"
    :class="gridClass"
    :style="gridStyle"
  >
    <div
      v-for="(img, index) in validImages"
      :key="index"
      class="grid-item"
    >
      <!-- 复用Ant Design Vue Image组件，自带预览、加载占位、失败兜底 -->
      <a-image
        :src="apiUrls.static_links(img)"
        :fallback="fallback"
        :preview="previewable ? { groupId: groupId } : false"
        class="grid-image"
        placeholder
      >
        <!-- 超出最大数量时，显示 +N 遮罩 -->
        <div
          v-if="index === maxCount - 1 && remainCount > 0"
          class="remain-mask"
        >
          +{{ remainCount }}
        </div>
      </a-image>
    </div>
  </div>
</template>

<style scoped>
.image-grid {
  display: grid;
  gap: var(--gap);
  margin: 12px 0;
  width: fit-content; /* 核心：容器宽度随内容自适应，不强制铺满 */
}

/* ========== 1张图：按比例缩放，限制最大宽高 ========== */
.grid-count-1 {
  grid-template-columns: 1fr;
  max-width: var(--single-max-width);
}
.grid-count-1 .grid-item {
  width: 100%;
  aspect-ratio: auto;
  max-height: var(--single-max-height);
}
.grid-count-1 .grid-image {
  width: 100%;
  height: auto;
  max-height: var(--single-max-height);
}
.grid-count-1 :deep(.ant-image-img) {
  width: 100%;
  height: auto;
  max-height: var(--single-max-height);
  object-fit: contain;
  border-radius: var(--radius);
}

/* ========== 2张/4张图：2列布局，限制总宽 ========== */
.grid-count-2,
.grid-count-4 {
  grid-template-columns: repeat(2, 1fr);
  max-width: var(--two-col-max-width);
}

/* ========== 3张/5-9张图：3列布局，限制总宽 ========== */
.grid-count-3,
.grid-count-5,
.grid-count-6,
.grid-count-7,
.grid-count-8,
.grid-count-9 {
  grid-template-columns: repeat(3, 1fr);
  max-width: var(--three-col-max-width);
}

/* ========== 多图通用：正方形裁剪填充 ========== */
.grid-item {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: var(--radius);
  overflow: hidden;
  position: relative;
}
.grid-image {
  width: 100%;
  height: 100%;
}
:deep(.ant-image-img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 超出数量遮罩 */
.remain-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 20px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius);
}

/* 移动端响应式：小屏适当放宽尺寸，保证展示效果 */
@media (max-width: 768px) {
  .image-grid {
    max-width: 92% !important;
  }
  .grid-count-1 {
    max-width: 92% !important;
  }
}

</style>