<script setup lang="ts">
import {
  computed,
  reactive,
  ref,
} from 'vue'

import {
  apiUrls,
} from '@/services/api'

import LogoPlaceHolder from '@/assets/icons/logo‑placeholder.svg';

import {
  getGalleryLayout,
} from './LayoutEngine'

import {
  useIntersection,
} from './useIntersection'

import {
  useGalleryResize,
} from './useGalleryResize'

import type {
  ImageSource,
  NormalizedImage,
} from './types'

/* ========================================
 * Props
 * ======================================== */

interface Props {
  /**
   * 图片列表
   */
  imageList: ImageSource[]
  /**
   * 最大展示数量
   */
  maxCount?: number
  /**
   * 图片间距
   */
  gap?: number
  /**
   * 圆角
   */
  borderRadius?: number
  /**
   * 最大展示高度
   */
  maxHeight?: number
  /**
   * 是否允许预览
   */
  previewable?: boolean
  /**
   * 图片加载失败兜底
   */
  fallback?: string
  /**
   * 加载占位
   */
  placeholderImg?: string

  /**
   * IntersectionObserver 提前加载距离
   */
  rootMargin?: string
}

const props = withDefaults(
  defineProps<Props>(),
  {
    maxCount: 5,
    gap: 3,
    borderRadius: 8,
    maxHeight: 560,
    previewable: true,
    fallback: LogoPlaceHolder,
    placeholderImg: LogoPlaceHolder,
    rootMargin: '500px 0px',
  },
)

/* ========================================
 * Emits
 * ======================================== */

const emit = defineEmits<{
  click: [
    index: number,
    image: ImageSource,
    images: ImageSource[],
  ]
}>()

/* ========================================
 * Refs
 * ======================================== */

const galleryRef =
  ref<HTMLElement | null>(null)

const viewerVisible =
  ref(false)

const viewerIndex =
  ref(0)

/**
 * 图片真实尺寸
 *
 * Key = URL
 */
const dimensions = reactive(
  new Map<
    string,
    {
      width: number
      height: number
    }
  >(),
)

/* ========================================
 * Intersection
 * ======================================== */

const {
  activated,
} = useIntersection(
  galleryRef,
  {
    rootMargin:
      props.rootMargin,
  },
)

/* ========================================
 * Resize
 * ======================================== */

const {
  width: galleryWidth,
} = useGalleryResize(
  galleryRef,
)

/* ========================================
 * Images
 * ======================================== */

const safeImages = computed(() => {
  if (!Array.isArray(props.imageList)) {
    return []
  }

  return props.imageList.filter(Boolean)
})

const displayImages = computed(() => {
  const maxCount =
    Math.max(
      1,
      Math.min(
        props.maxCount,
        5,
      ),
    )

  return safeImages.value.slice(
    0,
    maxCount,
  )
})

const remainCount = computed(() => {
  return Math.max(
    safeImages.value.length -
      displayImages.value.length,
    0,
  )
})

/* ========================================
 * URL
 * ======================================== */

function getFullSrc(
  path?: string,
) {
  if (!path) {
    return ''
  }

  try {
    return apiUrls.static_links(path)
  } catch {
    return path
  }
}

function getThumbnail(
  image: ImageSource,
) {
  if (
    typeof image === 'string'
  ) {
    return getFullSrc(image)
  }

  return getFullSrc(
    image.thumbnail ||
      image.url,
  )
}

function getOriginal(
  image: ImageSource,
) {
  if (
    typeof image === 'string'
  ) {
    return getFullSrc(image)
  }

  return getFullSrc(
    image.url,
  )
}

/* ========================================
 * Normalized Images
 * ======================================== */

const normalizedImages = computed<
  NormalizedImage[]
>(() => {
  return displayImages.value.map(
    (image, index) => {
      let width: number | undefined
      let height: number | undefined

      const thumbnail =
        getThumbnail(image)

      /*
       * 1. 后端尺寸
       */

      if (
        typeof image !== 'string'
      ) {
        width = image.width
        height = image.height
      }

      /*
       * 2. 前端真实尺寸
       */

      if (
        (!width || !height) &&
        dimensions.has(thumbnail)
      ) {
        const dimension =
          dimensions.get(thumbnail)!

        width =
          dimension.width

        height =
          dimension.height
      }

      /*
       * ratio
       */

      const ratio =
        width &&
        height &&
        height > 0
          ? width / height
          : 1

      return {
        index,

        thumbnail,

        original:
          getOriginal(image),

        width,

        height,

        ratio,
      }
    },
  )
})

/* ========================================
 * Layout
 * ======================================== */

const layout = computed(() => {
  return getGalleryLayout(
    normalizedImages.value,
  )
})

/**
 * Gallery 高度
 */
const galleryHeight = computed(() => {
  const width =
    galleryWidth.value

  if (!width) {
    return 320
  }

  /*
   * Facebook Feed 比例
   */
  const idealHeight =
    width / 1.35

  return Math.min(
    idealHeight,
    props.maxHeight,
  )
})

const galleryStyle = computed(() => {
  const style: Record<
    string,
    string
  > = {
    '--gap':
      `${props.gap}px`,

    '--radius':
      `${props.borderRadius}px`,
  }

  if (
    normalizedImages.value.length <= 1 ||
    !layout.value
  ) {
    return style
  }

  style.height =
    `${galleryHeight.value}px`

  style.gridTemplateColumns =
    `repeat(${layout.value.columns}, minmax(0, 1fr))`

  style.gridTemplateRows =
    `repeat(${layout.value.rows}, minmax(0, 1fr))`

  return style
})

function getItemStyle(
  index: number,
) {
  const slot =
    layout.value?.slots.find(
      item =>
        item.index === index,
    )

  if (!slot) {
    return {}
  }

  return {
    gridColumn:
      `${slot.colStart} / span ${slot.colSpan}`,

    gridRow:
      `${slot.rowStart} / span ${slot.rowSpan}`,
  }
}

/* ========================================
 * Image Load
 * ======================================== */

function handleImageLoad(
  event: Event,
  image: NormalizedImage,
) {
  const target =
    event.target as HTMLImageElement

  if (
    !target.naturalWidth ||
    !target.naturalHeight
  ) {
    return
  }

  /**
   * 如果后端已经提供尺寸
   *
   * 不需要覆盖
   */
  if (
    image.width &&
    image.height
  ) {
    return
  }

  dimensions.set(
    image.thumbnail,
    {
      width:
        target.naturalWidth,

      height:
        target.naturalHeight,
    },
  )
}

/* ========================================
 * Preview
 * ======================================== */

const previewImages = computed(() => {
  return safeImages.value.map(
    getOriginal,
  )
})

function openPreview(
  index: number,
) {
  if (!props.previewable) {
    return
  }

  viewerIndex.value = index

  viewerVisible.value = true
}

function handleClick(
  index: number,
  image: ImageSource,
) {
  emit(
    'click',
    index,
    image,
    safeImages.value,
  )

  openPreview(index)
}

/* ========================================
 * Image Source
 * ======================================== */

function getImageSrc(
  image: NormalizedImage,
) {
  /**
   * 未接近视口
   *
   * 不加载真实图片
   */
  if (!activated.value) {
    return ''
  }

  return image.thumbnail
}
</script>

<template>
  <div
    v-if="normalizedImages.length"
    ref="galleryRef"
    class="image-gallery"
    :class="{
      'is-single':
        normalizedImages.length === 1,
    }"
    :style="galleryStyle"
  >
    <div
      v-for="image in normalizedImages"
      :key="image.original"
      class="image-item"
      :style="getItemStyle(image.index)"
      @click="
        handleClick(
          image.index,
          displayImages[image.index],
        )
      "
    >
      <t-image
        class="gallery-image"
        :src="getImageSrc(image)"
        fit="cover"
        lazy
      >
        <!-- Loading -->

        <template #loading>
          <div class="image-placeholder">
            <img
              :src="placeholderImg"
              alt=""
            >
          </div>
        </template>

        <!-- Error -->

        <template #error>
          <div class="image-placeholder">
            <img
              :src="fallback"
              alt=""
            >
          </div>
        </template>

        <!-- Image -->

        <template #image>
          <img
            :src="getImageSrc(image)"
            class="native-image"
            loading="lazy"
            alt=""
            @load="
              handleImageLoad(
                $event,
                image,
              )
            "
          >
        </template>
      </t-image>

      <!-- +N -->

      <div
        v-if="
          image.index ===
            normalizedImages.length - 1 &&
          remainCount > 0
        "
        class="remain-mask"
      >
        +{{ remainCount }}
      </div>
    </div>
  </div>

  <!-- Preview -->

  <t-image-viewer
    v-if="previewable"
    :visible="viewerVisible"
    :images="previewImages"
    :index="viewerIndex"
    @index-change="
      viewerIndex = $event
    "
    @close="
      viewerVisible = false
    "
  />
</template>

<style scoped>
/* ========================================
 * Gallery
 * ======================================== */

.image-gallery {
  width: 100%;

  display: grid;

  gap: var(--gap);

  overflow: hidden;

  border-radius: var(--radius);

  background: #f2f3f5;

  box-sizing: border-box;
}

/* ========================================
 * Item
 * ======================================== */

.image-item {
  position: relative;

  min-width: 0;
  min-height: 0;

  overflow: hidden;

  background: #f2f3f5;

  cursor: pointer;

  -webkit-tap-highlight-color:
    transparent;
}

/* ========================================
 * TDesign
 * ======================================== */

.gallery-image {
  width: 100%;
  height: 100%;
}

:deep(.t-image) {
  width: 100%;
  height: 100%;
}

:deep(.t-image__img) {
  width: 100%;
  height: 100%;

  display: block;

  object-fit: cover;
}

/* ========================================
 * Native Image
 * ======================================== */

.native-image {
  width: 100%;
  height: 100%;

  display: block;

  object-fit: cover;

  transition:
    transform 0.25s ease;
}

/* ========================================
 * Hover
 * ======================================== */

@media (hover: hover) {
  .image-item:hover
    .native-image {
    transform:
      scale(1.025);
  }
}

/* ========================================
 * Single Image
 * ======================================== */

.image-gallery.is-single {
  display: block;

  height: auto !important;

  overflow: visible;

  background: transparent;
}

.is-single .image-item {
  width: 100%;

  max-height: 600px;

  border-radius: var(--radius);

  background: #f2f3f5;
}

.is-single .gallery-image {
  height: auto;
}

.is-single
  :deep(.t-image) {
  height: auto;
}

.is-single .native-image {
  width: 100%;
  height: auto;

  max-height: 600px;

  object-fit: contain;

  background: #f2f3f5;
}

/* ========================================
 * Placeholder
 * ======================================== */

.image-placeholder {
  width: 100%;
  height: 100%;

  display: flex;

  align-items: center;
  justify-content: center;

  background: #f2f3f5;
}

.image-placeholder img {
  width: 48px;
  height: 48px;

  opacity: 0.45;

  object-fit: contain;
}

/* ========================================
 * +N
 * ======================================== */

.remain-mask {
  position: absolute;

  inset: 0;

  z-index: 10;

  display: flex;

  align-items: center;
  justify-content: center;

  background:
    rgba(0, 0, 0, 0.55);

  color: #fff;

  font-size: 30px;

  font-weight: 600;

  pointer-events: none;

  user-select: none;
}

/* ========================================
 * Mobile
 * ======================================== */

@media (max-width: 768px) {
  .remain-mask {
    font-size: 24px;
  }

  .is-single .image-item {
    max-height: 70vh;
  }

  .is-single .native-image {
    max-height: 70vh;
  }
}
</style>

