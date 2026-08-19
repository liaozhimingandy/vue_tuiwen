<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { apiUrls } from '@/services/api.ts'

export type ImageGridProps = {
  /** 图片地址列表 */
  imageList: string[]
  /** 最大展示数量 */
  maxCount?: number
  /** 图片间距（px） */
  gap?: number
  /** 【单张图】最大高度（px），0=不限制高度 */
  singleMaxHeight?: number
  /** 多图布局整体最大宽度（2/3/4/5‑9张） */
  multiMaxWidth?: number
  /** 图片圆角（px） */
  borderRadius?: number
  /** 是否开启预览 */
  previewable?: boolean
  /** 预览分组ID */
  previewGroupId?: string
  /** 加载失败兜底图 */
  fallback?: string
}

const props = withDefaults(defineProps<ImageGridProps>(), {
  maxCount: 9,
  gap: 8,
  singleMaxHeight: 0,
  multiMaxWidth: 420,
  borderRadius: 6,
  previewable: true,
  fallback: 'data:image/png;base64,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',
})

const emit = defineEmits(['click'])

let internalGroupId = ''
onMounted(() => {
  internalGroupId = `img-grid-${Math.random().toString(36).slice(2, 8)}`
})
const groupId = computed(() => props.previewGroupId || internalGroupId)

const safeImageList = computed(() => Array.isArray(props.imageList) ? props.imageList : [])
const validImages = computed(() => safeImageList.value.slice(0, props.maxCount))
const imageCount = computed(() => validImages.value.length)
const remainCount = computed(() => Math.max(safeImageList.value.length - props.maxCount, 0))
const gridClass = computed(() => `grid-count-${Math.min(imageCount.value, 9)}`)

const gridStyle = computed(() => ({
  '--gap': `${props.gap}px`,
  '--radius': `${props.borderRadius}px`,
  '--single-max-height': props.singleMaxHeight ? `${props.singleMaxHeight}px` : 'unset',
  '--multi-max-width': `${props.multiMaxWidth}px`,
}))

const getFullSrc = (path: string) => {
  try {
    return apiUrls.static_links(path)
  } catch {
    return path
  }
}
</script>

<template>
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
      @click="emit('click', index, validImages)"
    >
      <a-image
        :src="getFullSrc(img)"
        :fallback="props.fallback"
        :preview="previewable ? { groupId: groupId } : false"
        class="grid-image"
        placeholder
      />
      <div
        v-if="index === validImages.length - 1 && remainCount > 0"
        class="remain-mask"
      >
        +{{ remainCount }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.image-grid {
  display: grid;
  gap: var(--gap);
  margin: 12px 0;
  width: 100%;
}

/* ========== 单张图：100%占满卡片宽度，高度跟随图片原始尺寸，不变形 ========== */
.grid-count-1 {
  grid-template-columns: 1fr;
  width: 100%;
}
.grid-count-1 .grid-item {
  width: 100%;
  height: auto;
  max-height: var(--single-max-height);
  border-radius: var(--radius);
  overflow: hidden;
  position: relative;
  /* 如果需要竖图时灰色背景打开下面这行 */
  /* background-color:#f2f3f5; */
}
.grid-count-1 .grid-image {
  width: 100%;
  height: auto;
}
/* 深度覆盖antd内部image dom，核心！！ */
.grid-count-1 :deep(.ant-image) {
  width:100%;
  height:auto;
}
.grid-count-1 :deep(.ant-image-img) {
  width:100%;
  height:auto;
  object-fit: contain;
  border-radius: var(--radius);
  display:block;
}

/* ========== 2张：两列等分并排（微博标准） ========== */
.grid-count-2 {
  grid-template-columns: repeat(2, 1fr);
  max-width: var(--multi-max-width);
  margin-left: auto;
  margin-right: auto;
}
/* ========== 3张：3列 ========== */
.grid-count-3 {
  grid-template-columns: repeat(3, 1fr);
  max-width: var(--multi-max-width);
  margin-left: auto;
  margin-right: auto;
}
/* ========== 4张：2×2 ========== */
.grid-count-4 {
  grid-template-columns: repeat(2, 1fr);
  max-width: var(--multi-max-width);
  margin-left: auto;
  margin-right: auto;
}
/* ========== 5~9张：固定3列 ========== */
.grid-count-5,
.grid-count-6,
.grid-count-7,
.grid-count-8,
.grid-count-9 {
  grid-template-columns: repeat(3, 1fr);
  max-width: var(--multi-max-width);
  margin-left: auto;
  margin-right: auto;
}

/* ========== 多图统一正方形裁切 ========== */
:is(.grid-count-2, .grid-count-3, .grid-count-4, .grid-count-5, .grid-count-6, .grid-count-7, .grid-count-8, .grid-count-9) .grid-item {
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: var(--radius);
  overflow: hidden;
  position: relative;
}
:is(.grid-count-2, .grid-count-3, .grid-count-4, .grid-count-5, .grid-count-6, .grid-count-7, .grid-count-8, .grid-count-9) .grid-image {
  width: 100%;
  height: 100%;
}
:is(.grid-count-2, .grid-count-3, .grid-count-4, .grid-count-5, .grid-count-6, .grid-count-7, .grid-count-8, .grid-count-9) :deep(.ant-image) {
  width:100%;
  height:100%;
}
:is(.grid-count-2, .grid-count-3, .grid-count-4, .grid-count-5, .grid-count-6, .grid-count-7, .grid-count-8, .grid-count-9) :deep(.ant-image-img) {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: var(--radius);
}

.remain-mask {
  position: absolute;
  inset: 0;
  z-index: 2;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 20px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius);
  pointer-events: none;
}

/* 移动端适配 */
@media (max-width: 768px) {
  :is(.grid-count-2, .grid-count-3, .grid-count-4, .grid-count-5, .grid-count-6, .grid-count-7, .grid-count-8, .grid-count-9) {
    max-width: 100% !important;
  }
}
</style>
