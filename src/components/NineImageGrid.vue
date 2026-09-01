<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { apiUrls } from '@/services/api.ts'
// 引入assets下的logo作为占位&兜底图
import LogoPlaceHolder from '@/assets/logo‑placeholder.svg'

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
  /** 预览分组ID（兼容旧入参，tdesign不再使用） */
  previewGroupId?: string
  /** 加载失败兜底图 */
  fallback?: string
  /** 加载中占位图片 */
  placeholderImg?: string
}

const props = withDefaults(defineProps<ImageGridProps>(), {
  maxCount: 9,
  gap: 8,
  singleMaxHeight: 0,
  multiMaxWidth: 420,
  borderRadius: 6,
  previewable: true,
  fallback: LogoPlaceHolder,
  placeholderImg: LogoPlaceHolder,
})

const emit = defineEmits(['click'])

// t-image-viewer 需要控制打开索引
const viewerVisible = ref(false)
const viewerIndex = ref(0)

let internalGroupId = ''
onMounted(() => {
  internalGroupId = `img-grid-${Math.random().toString(36).slice(2, 8)}`
})
const groupId = computed(() => props.previewGroupId || internalGroupId)

const safeImageList = computed(() => Array.isArray(props.imageList) ? props.imageList : [])
const validImages = computed(() => safeImageList.value.slice(0, props.maxCount))
// 预览用完整图片地址数组
const fullPreviewImages = computed(() => validImages.value.map(img => getFullSrc(img)))
const imageCount = computed(() => validImages.value.length)
const remainCount = computed(() => Math.max(safeImageList.value.length - props.maxCount, 0))
const gridClass = computed(() => `grid-count-${Math.min(imageCount.value, 9)}`)

const gridStyle = computed(() => ({
  '--gap': `${props.gap}px`,
  '--radius': `${props.borderRadius}px`,
  '--single-max-height': props.singleMaxHeight ? `${props.singleMaxHeight}px` : 'unset',
  '--multi-max-width': `${props.multiMaxWidth}px`,
}))

function getFullSrc(path: string) {
  try {
    return apiUrls.static_links(path)
  } catch {
    return path
  }
}

// 打开预览，指定当前索引
function openPreview(index: number) {
  viewerIndex.value = index
  viewerVisible.value = true
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
        <img class="img-placeholder" :src="props.placeholderImg" alt="placeholder" />

        <t-image
          :src="getFullSrc(img)"
          class="grid-image"
          @click="previewable && openPreview(index)"
        >
          <!-- 加载失败兜底图 替代 fallback 属性 -->
          <template #error>
            <img class="img-error-fallback" :src="props.fallback" alt="fallback" />
          </template>
          <!-- 加载中自定义占位（可选，和原有逻辑对齐） -->
          <template #loading>
            <img class="img-loading-placeholder" :src="props.placeholderImg" alt="loading" />
          </template>
        </t-image>
      </div>

      <!-- 多张图片：原有正方形网格布局 -->
      <t-image
        v-else
        :src="getFullSrc(img)"
        class="grid-image"
        placeholder
        @click="previewable && openPreview(index)"
      >
        <template #error>
          <img class="img-error-fallback" :src="props.fallback" alt="fallback" />
        </template>
      </t-image>

      <div
        v-if="index === validImages.length - 1 && remainCount > 0"
        class="remain-mask"
      >
        +{{ remainCount }}
      </div>
    </div>

    <!-- 全局预览弹窗（统一图集预览，等价 antd previewGroup） -->
    <t-image-viewer
      v-if="previewable"
      :visible="viewerVisible"
      :images="fullPreviewImages"
      :index="viewerIndex"
      @close="viewerVisible = false"
    />
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
.img-placeholder {
  position: absolute;
  width: 64px;
  height: 64px;
  object-fit: contain;
  opacity: 0.7;
  pointer-events: none;
  z-index: 1;
}
.single-placeholder-wrap :deep(.t-image) {
  width: 100%;
  height: auto;
  display: block;
  position: relative;
  z-index: 2;
}
.single-placeholder-wrap :deep(.t-image__img) {
  width: 100%;
  height: auto;
  object-fit: contain;
  border-radius: var(--radius);
  display: block;
  opacity: 0;
  animation: fadeIn 0.3s ease forwards;
}
.img-error-fallback {
  width: 100%;
  height: auto;
  object-fit: contain;
  background-color: #f2f3f5;
  border-radius: var(--radius);
}

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
:is(.grid-count-2, .grid-count-3, .grid-count-4, .grid-count-5, .grid-count-6, .grid-count-7, .grid-count-8, .grid-count-9) :deep(.t-image) {
  width:100%;
  height:100%;
}
:is(.grid-count-2, .grid-count-3, .grid-count-4, .grid-count-5, .grid-count-6, .grid-count-7, .grid-count-8, .grid-count-9) :deep(.t-image__img) {
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