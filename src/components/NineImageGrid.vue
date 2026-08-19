<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { apiUrls } from '@/services/api.ts'
// 引入assets下的logo作为占位&兜底图
import logoImg from '@/assets/logo.svg'

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
  /** 加载失败兜底图，不传默认使用assets/logo.png */
  fallback?: string
  /** 加载中占位图片，不传默认使用assets/logo.png */
  placeholderImg?: string
}

const props = withDefaults(defineProps<ImageGridProps>(), {
  maxCount: 9,
  gap: 8,
  singleMaxHeight: 0,
  multiMaxWidth: 420,
  borderRadius: 6,
  previewable: true,
  fallback: logoImg,
  placeholderImg: logoImg,
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
      <!-- 单张图片：灰色容器 + 居中logo占位 -->
      <div v-if="imageCount === 1" class="single-placeholder-wrap">
        <!-- 加载中居中logo占位（固定大小，不会拉伸模糊） -->
        <img class="img-placeholder" :src="props.placeholderImg" alt="placeholder" />

        <a-image
          :src="getFullSrc(img)"
          :fallback="props.fallback"
          :preview="previewable ? { groupId: groupId } : false"
          class="grid-image"
        />
      </div>

      <!-- 多张图片：原有正方形网格布局 -->
      <a-image
        v-else
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

/* ========== 单图容器 ========== */
.grid-count-1 {
  grid-template-columns: 1fr;
  width: 100%;
}
.grid-count-1 .grid-item {
  width: 100%;
  max-height: var(--single-max-height);
  border-radius: var(--radius);
  overflow: hidden;
  position: relative;
}
.single-placeholder-wrap {
  width: 100%;
  min-height: 200px;
  background-color: #f2f3f5;
  border-radius: var(--radius);
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
/* 居中占位Logo：固定尺寸，禁止拉伸 */
.img-placeholder {
  position: absolute;
  width: 64px;
  height: 64px;
  object-fit: contain;
  opacity: 0.7;
  pointer-events: none;
  z-index: 1;
}
/* 真实图片 */
.single-placeholder-wrap :deep(.ant-image) {
  width: 100%;
  height: auto;
  display: block;
  position: relative;
  z-index: 2;
}
.single-placeholder-wrap :deep(.ant-image-img) {
  width: 100%;
  height: auto;
  object-fit: contain;
  border-radius: var(--radius);
  display: block;
  opacity: 0;
  animation: fadeIn 0.3s ease forwards;
}
/* 加载失败兜底图样式 */
.single-placeholder-wrap :deep(.ant-image-fallback) {
  width: 100%;
  height: auto;
  object-fit: contain;
  background-color: #f2f3f5;
}

/* 淡入动画 */
@keyframes fadeIn {
  to {
    opacity: 1;
  }
}

/* ========== 多图网格布局 2~9张 ========== */
.grid-count-2 {
  grid-template-columns: repeat(2, 1fr);
  max-width: var(--multi-max-width);
  margin-left: auto;
  margin-right: auto;
}
.grid-count-3 {
  grid-template-columns: repeat(3, 1fr);
  max-width: var(--multi-max-width);
  margin-left: auto;
  margin-right: auto;
}
.grid-count-4 {
  grid-template-columns: repeat(2, 1fr);
  max-width: var(--multi-max-width);
  margin-left: auto;
  margin-right: auto;
}
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

@media (max-width: 768px) {
  :is(.grid-count-2, .grid-count-3, .grid-count-4, .grid-count-5, .grid-count-6, .grid-count-7, .grid-count-8, .grid-count-9) {
    max-width: 100% !important;
  }
}
</style>
