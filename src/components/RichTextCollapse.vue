<template>
  <div
    class="rich-text"
    :class="{
      'rich-text--collapsible': isCollapsible,
      'rich-text--expanded': isExpanded,
    }"
  >
    <div
      ref="contentRef"
      class="rich-text__content"
      :class="{
        'is-collapsed': isCollapsed,
        'is-expanded': isCollapsible && isExpanded && !isMeasuring,
      }"
      :style="contentStyle"
    >
      <!-- content 优先 -->
      <div
        v-if="content != null"
        class="rich-text__html"
        v-html="content"
      />

      <!-- 没有 content 时使用 slot -->
      <slot v-else />
    </div>

    <button
      v-if="shouldShowToggle"
      type="button"
      class="rich-text__toggle"
      :aria-expanded="isExpanded"
      @click="toggle"
    >
      {{ isExpanded ? collapseText : expandText }}
    </button>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from 'vue'

/**
 * =========================================================
 * Types
 * =========================================================
 */

type RichTextMode =
  | 'auto'
  | 'collapse'
  | 'full'

type ScrollContainer =
  | string
  | HTMLElement
  | null

interface Props {
  /**
   * HTML 富文本内容
   *
   * 注意：
   * content 优先于 slot
   */
  content?: string | null

  /**
   * 展示模式
   *
   * auto：
   * 根据 collapsible 决定
   *
   * collapse：
   * 强制开启折叠能力
   *
   * full：
   * 永远完整展示
   */
  mode?: RichTextMode

  /**
   * auto 模式下是否允许折叠
   */
  collapsible?: boolean

  /**
   * 折叠显示行数
   */
  lines?: number

  /**
   * 展开文字
   */
  expandText?: string

  /**
   * 收起文字
   */
  collapseText?: string

  /**
   * 是否自动监听内容变化
   */
  autoObserve?: boolean

  /**
   * 滚动容器
   *
   * 默认 window
   *
   * 支持：
   * - HTMLElement
   * - CSS selector
   */
  scrollContainer?: ScrollContainer

  /**
   * 是否显示展开/收起按钮
   */
  showToggle?: boolean

  /**
   * 受控展开状态
   *
   * v-model:expanded
   */
  expanded?: boolean
}

/**
 * =========================================================
 * Props
 * =========================================================
 */

const props = withDefaults(
  defineProps<Props>(),
  {
    mode: 'auto',
    collapsible: true,
    lines: 5,
    expandText: '展开全文',
    collapseText: '收起',
    autoObserve: true,
    scrollContainer: null,
    showToggle: true,
  },
)

/**
 * =========================================================
 * Emits
 * =========================================================
 */

const emit = defineEmits<{
  /**
   * v-model:expanded
   */
  'update:expanded': [value: boolean]

  /**
   * 展开
   */
  expand: []

  /**
   * 收起
   */
  collapse: []

  /**
   * 展开状态变化
   */
  'expanded-change': [value: boolean]
}>()

/**
 * =========================================================
 * Refs
 * =========================================================
 */

const contentRef =
  ref<HTMLElement | null>(null)

/**
 * 非受控模式下的内部状态
 */
const internalExpanded = ref(false)

/**
 * 是否发生溢出
 */
const isOverflow = ref(false)

/**
 * 是否正在测量
 *
 * 测量时强制使用折叠状态，
 * 但不修改真实 expanded 状态。
 */
const isMeasuring = ref(false)

/**
 * =========================================================
 * Mode
 * =========================================================
 */

/**
 * 当前是否允许折叠
 */
const isCollapsible = computed(() => {
  if (props.mode === 'full') {
    return false
  }

  if (props.mode === 'collapse') {
    return true
  }

  return props.collapsible
})

/**
 * 是否受控
 */
const isControlled = computed(() => {
  return props.expanded !== undefined
})

/**
 * 最终展开状态
 */
const isExpanded = computed(() => {
  if (!isCollapsible.value) {
    return false
  }

  if (isControlled.value) {
    return Boolean(props.expanded)
  }

  return internalExpanded.value
})

/**
 * 当前是否处于折叠状态
 *
 * 注意：
 * isMeasuring 时也必须使用折叠样式，
 * 用于准确计算 overflow。
 */
const isCollapsed = computed(() => {
  return (
    isCollapsible.value &&
    (
      !isExpanded.value ||
      isMeasuring.value
    )
  )
})

/**
 * 标准化行数
 */
const normalizedLines = computed(() => {
  const value = Number(props.lines)

  if (!Number.isFinite(value)) {
    return 5
  }

  return Math.max(
    1,
    Math.floor(value),
  )
})

/**
 * 是否显示展开按钮
 */
const shouldShowToggle = computed(() => {
  return (
    isCollapsible.value &&
    props.showToggle &&
    isOverflow.value
  )
})

/**
 * CSS Variables
 */
const contentStyle = computed(() => ({
  '--rich-text-lines':
    normalizedLines.value,
}))

/**
 * =========================================================
 * Browser
 * =========================================================
 */

const isBrowser = () => {
  return typeof window !== 'undefined'
}

/**
 * =========================================================
 * Timer
 * =========================================================
 */

let calculationTimer:
  | ReturnType<typeof setTimeout>
  | null = null

let calculating = false

let calculationPending = false

/**
 * =========================================================
 * RAF
 * =========================================================
 */

const animationFrames = new Set<number>()

const requestFrame = (
  callback: FrameRequestCallback,
) => {
  if (!isBrowser()) {
    return
  }

  const id = requestAnimationFrame(
    time => {
      animationFrames.delete(id)

      callback(time)
    },
  )

  animationFrames.add(id)
}

const cancelAllFrames = () => {
  animationFrames.forEach(id => {
    cancelAnimationFrame(id)
  })

  animationFrames.clear()
}

/**
 * =========================================================
 * Scroll
 * =========================================================
 */

const getScrollElement = ():
  | Window
  | HTMLElement => {
  const container =
    props.scrollContainer

  if (!container) {
    return window
  }

  if (typeof container === 'string') {
    return (
      document.querySelector<HTMLElement>(
        container,
      ) || window
    )
  }

  return container
}

const getScrollTop = () => {
  const element =
    getScrollElement()

  if (element === window) {
    return (
      window.scrollY ||
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0
    )
  }

  return element.scrollTop
}

const setScrollTop = (
  value: number,
) => {
  const element =
    getScrollElement()

  if (element === window) {
    window.scrollTo({
      top: value,
      behavior: 'auto',
    })

    return
  }

  element.scrollTop = value
}

const getContentTop = () => {
  return (
    contentRef.value
      ?.getBoundingClientRect()
      .top ?? 0
  )
}

/**
 * =========================================================
 * Overflow Calculation
 * =========================================================
 */

const recalculate = async () => {
  /**
   * Full 模式完全跳过
   */
  if (!isCollapsible.value) {
    isOverflow.value = false
    return
  }

  /**
   * 防止重复计算
   */
  if (calculating) {
    calculationPending = true
    return
  }

  calculating = true

  try {
    /**
     * 强制切换到测量状态
     *
     * 注意：
     * 这里只改变 Vue 状态，
     * 不再直接 classList 操作 DOM。
     */
    isMeasuring.value = true

    await nextTick()

    const el = contentRef.value

    if (!el) {
      isOverflow.value = false
      return
    }

    /**
     * 强制浏览器布局
     */
    void el.offsetHeight

    /**
     * 判断是否溢出
     */
    isOverflow.value =
      el.scrollHeight >
      el.clientHeight + 1
  } finally {
    /**
     * 恢复真实展示状态
     */
    isMeasuring.value = false

    calculating = false

    /**
     * 如果计算期间又触发了计算，
     * 再执行一次
     */
    if (calculationPending) {
      calculationPending = false

      scheduleRecalculate()
    }
  }
}

/**
 * =========================================================
 * Schedule Recalculate
 * =========================================================
 */

const scheduleRecalculate = (
  delay = 100,
) => {
  if (!isCollapsible.value) {
    return
  }

  if (calculationTimer) {
    clearTimeout(calculationTimer)
  }

  calculationTimer = setTimeout(() => {
    calculationTimer = null

    void recalculate()
  }, delay)
}

/**
 * =========================================================
 * Media Observe
 * =========================================================
 */

const observedImages =
  new WeakSet<HTMLImageElement>()

const observedVideos =
  new WeakSet<HTMLVideoElement>()

const observedIframes =
  new WeakSet<HTMLIFrameElement>()

/**
 * Image
 */

const observeImage = (
  image: HTMLImageElement,
) => {
  if (observedImages.has(image)) {
    return
  }

  observedImages.add(image)

  const handleChange = () => {
    scheduleRecalculate(30)
  }

  image.addEventListener(
    'load',
    handleChange,
    { once: true },
  )

  image.addEventListener(
    'error',
    handleChange,
    { once: true },
  )

  /**
   * 图片已经加载完成
   */
  if (image.complete) {
    if (
      typeof image.decode === 'function'
    ) {
      image
        .decode()
        .catch(() => {})
        .finally(() => {
          scheduleRecalculate(30)
        })
    } else {
      scheduleRecalculate(30)
    }
  }
}

const observeImages = () => {
  const el = contentRef.value

  if (!el) {
    return
  }

  el
    .querySelectorAll<HTMLImageElement>(
      'img',
    )
    .forEach(observeImage)
}

/**
 * Video
 */

const observeVideo = (
  video: HTMLVideoElement,
) => {
  if (observedVideos.has(video)) {
    return
  }

  observedVideos.add(video)

  const handleChange = () => {
    scheduleRecalculate(30)
  }

  video.addEventListener(
    'loadedmetadata',
    handleChange,
    { once: true },
  )

  video.addEventListener(
    'loadeddata',
    handleChange,
    { once: true },
  )

  video.addEventListener(
    'error',
    handleChange,
    { once: true },
  )

  if (video.readyState >= 1) {
    scheduleRecalculate(30)
  }
}

const observeVideos = () => {
  const el = contentRef.value

  if (!el) {
    return
  }

  el
    .querySelectorAll<HTMLVideoElement>(
      'video',
    )
    .forEach(observeVideo)
}

/**
 * Iframe
 */

const observeIframe = (
  iframe: HTMLIFrameElement,
) => {
  if (observedIframes.has(iframe)) {
    return
  }

  observedIframes.add(iframe)

  iframe.addEventListener(
    'load',
    () => {
      scheduleRecalculate(50)
    },
    { once: true },
  )
}

const observeIframes = () => {
  const el = contentRef.value

  if (!el) {
    return
  }

  el
    .querySelectorAll<HTMLIFrameElement>(
      'iframe',
    )
    .forEach(observeIframe)
}

/**
 * 统一媒体监听
 */

const observeMedia = () => {
  observeImages()
  observeVideos()
  observeIframes()
}

/**
 * =========================================================
 * Font
 * =========================================================
 */

const observeFonts = () => {
  if (!isBrowser()) {
    return
  }

  if (!document.fonts?.ready) {
    return
  }

  document.fonts.ready
    .then(() => {
      scheduleRecalculate(30)
    })
    .catch(() => {})
}

/**
 * =========================================================
 * MutationObserver
 * =========================================================
 */

let mutationObserver:
  | MutationObserver
  | null = null

const initMutationObserver = () => {
  mutationObserver?.disconnect()

  mutationObserver = null

  if (
    !props.autoObserve ||
    !isCollapsible.value
  ) {
    return
  }

  const el = contentRef.value

  if (
    !el ||
    typeof MutationObserver ===
      'undefined'
  ) {
    return
  }

  mutationObserver =
    new MutationObserver(() => {
      observeMedia()

      scheduleRecalculate(100)
    })

  mutationObserver.observe(el, {
    childList: true,
    subtree: true,
    characterData: true,
  })
}

/**
 * =========================================================
 * ResizeObserver
 * =========================================================
 */

let resizeObserver:
  | ResizeObserver
  | null = null

const initResizeObserver = () => {
  resizeObserver?.disconnect()

  resizeObserver = null

  if (
    !props.autoObserve ||
    !isCollapsible.value
  ) {
    return
  }

  const el = contentRef.value

  if (
    !el ||
    typeof ResizeObserver ===
      'undefined'
  ) {
    return
  }

  resizeObserver =
    new ResizeObserver(() => {
      scheduleRecalculate(100)
    })

  resizeObserver.observe(el)
}

/**
 * =========================================================
 * Observer Cleanup
 * =========================================================
 */

const disconnectObservers = () => {
  mutationObserver?.disconnect()

  resizeObserver?.disconnect()

  mutationObserver = null

  resizeObserver = null
}

/**
 * =========================================================
 * Expanded State
 * =========================================================
 */

const setExpanded = (
  value: boolean,
) => {
  if (!isCollapsible.value) {
    return
  }

  /**
   * 状态没有变化
   */
  if (value === isExpanded.value) {
    return
  }

  if (isControlled.value) {
    emit(
      'update:expanded',
      value,
    )
  } else {
    internalExpanded.value = value
  }

  emit(
    'expanded-change',
    value,
  )

  if (value) {
    emit('expand')
  } else {
    emit('collapse')
  }
}

/**
 * =========================================================
 * Expand
 * =========================================================
 */

const expand = async () => {
  if (
    !isCollapsible.value ||
    !isOverflow.value ||
    isExpanded.value
  ) {
    return
  }

  const scrollTop =
    getScrollTop()

  const contentTop =
    getContentTop()

  setExpanded(true)

  await nextTick()

  /**
   * 等待布局完成
   */
  requestFrame(() => {
    requestFrame(() => {
      const currentTop =
        getContentTop()

      const delta =
        currentTop - contentTop

      setScrollTop(
        scrollTop + delta,
      )
    })
  })
}

/**
 * =========================================================
 * Collapse
 * =========================================================
 */

const collapse = async () => {
  if (
    !isCollapsible.value ||
    !isExpanded.value
  ) {
    return
  }

  const scrollTop =
    getScrollTop()

  const contentTop =
    getContentTop()

  setExpanded(false)

  await nextTick()

  requestFrame(() => {
    requestFrame(() => {
      const currentTop =
        getContentTop()

      const delta =
        currentTop - contentTop

      setScrollTop(
        scrollTop + delta,
      )
    })
  })
}

/**
 * =========================================================
 * Toggle
 * =========================================================
 */

const toggle = () => {
  if (isExpanded.value) {
    void collapse()
  } else {
    void expand()
  }
}

/**
 * =========================================================
 * Initialize
 * =========================================================
 */

const initialize = async () => {
  await nextTick()

  /**
   * Full 模式
   *
   * 不启动 Observer
   */
  if (!isCollapsible.value) {
    isOverflow.value = false

    return
  }

  observeMedia()

  observeFonts()

  await recalculate()

  initMutationObserver()

  initResizeObserver()
}

/**
 * =========================================================
 * Watch
 * =========================================================
 */

/**
 * mode / collapsible
 */

watch(
  [
    () => props.mode,
    () => props.collapsible,
  ],
  async () => {
    disconnectObservers()

    if (!isCollapsible.value) {
      isOverflow.value = false

      return
    }

    await nextTick()

    observeMedia()

    observeFonts()

    await recalculate()

    initMutationObserver()

    initResizeObserver()
  },
)

/**
 * lines
 */

watch(
  normalizedLines,
  () => {
    scheduleRecalculate(0)
  },
)

/**
 * autoObserve
 */

watch(
  () => props.autoObserve,
  () => {
    disconnectObservers()

    if (
      props.autoObserve &&
      isCollapsible.value
    ) {
      initMutationObserver()

      initResizeObserver()
    }
  },
)

/**
 * content
 */

watch(
  () => props.content,
  async () => {
    if (!isCollapsible.value) {
      isOverflow.value = false

      return
    }

    await nextTick()

    observeMedia()

    scheduleRecalculate(0)
  },
)

/**
 * =========================================================
 * Lifecycle
 * =========================================================
 */

onMounted(() => {
  void initialize()
})

onUnmounted(() => {
  disconnectObservers()

  if (calculationTimer) {
    clearTimeout(calculationTimer)

    calculationTimer = null
  }

  cancelAllFrames()

  calculating = false

  calculationPending = false
})

/**
 * =========================================================
 * Expose
 * =========================================================
 */

defineExpose({
  expand,
  collapse,
  toggle,
  recalculate,
  isExpanded,
  isOverflow,
})
</script>

<style scoped>
/**
 * =========================================================
 * Root
 * =========================================================
 */

.rich-text {
  width: 100%;
  min-width: 0;

  color: #333;
  font-size: 16px;
  line-height: 1.6;
}

/**
 * =========================================================
 * Content
 * =========================================================
 */

.rich-text__content {
  width: 100%;
  min-width: 0;

  word-break: break-word;
  overflow-wrap: anywhere;

  overflow-anchor: none;
}

.rich-text__html {
  width: 100%;
  min-width: 0;
}

/**
 * =========================================================
 * Collapse
 * =========================================================
 */

.rich-text__content.is-collapsed {
  display: -webkit-box;

  -webkit-box-orient: vertical;

  -webkit-line-clamp:
    var(--rich-text-lines, 5);

  overflow: hidden;

  text-overflow: ellipsis;
}

/**
 * =========================================================
 * Expanded
 * =========================================================
 */

.rich-text__content.is-expanded {
  display: block;
}

/**
 * =========================================================
 * Paragraph
 * =========================================================
 */

.rich-text__content :deep(p) {
  margin: 0 0 1em;
}

.rich-text__content :deep(p:last-child) {
  margin-bottom: 0;
}

/**
 * =========================================================
 * Heading
 * =========================================================
 */

.rich-text__content :deep(h1),
.rich-text__content :deep(h2),
.rich-text__content :deep(h3),
.rich-text__content :deep(h4),
.rich-text__content :deep(h5),
.rich-text__content :deep(h6) {
  margin: 1em 0 0.6em;

  line-height: 1.4;
  font-weight: 600;
}

.rich-text__content :deep(h1:first-child),
.rich-text__content :deep(h2:first-child),
.rich-text__content :deep(h3:first-child),
.rich-text__content :deep(h4:first-child),
.rich-text__content :deep(h5:first-child),
.rich-text__content :deep(h6:first-child) {
  margin-top: 0;
}

/**
 * =========================================================
 * List
 * =========================================================
 */

.rich-text__content :deep(ul),
.rich-text__content :deep(ol) {
  margin: 1em 0;
  padding-left: 2em;
}

.rich-text__content :deep(li) {
  margin-bottom: 0.35em;
}

/**
 * =========================================================
 * Link
 * =========================================================
 */

.rich-text__content :deep(a) {
  color: #1677ff;

  text-decoration: none;

  overflow-wrap: anywhere;
}

.rich-text__content :deep(a:hover) {
  text-decoration: underline;
}

/**
 * =========================================================
 * Image
 * =========================================================
 */

.rich-text__content :deep(img) {
  display: block;

  max-width: 100%;
  height: auto;

  margin: 0.5em 0;

  object-fit: contain;
}

/**
 * =========================================================
 * Video
 * =========================================================
 */

.rich-text__content :deep(video) {
  display: block;

  width: auto;
  max-width: 100%;
  height: auto;

  margin: 0.5em 0;
}

/**
 * =========================================================
 * Audio
 * =========================================================
 */

.rich-text__content :deep(audio) {
  display: block;

  max-width: 100%;

  margin: 0.5em 0;
}

/**
 * =========================================================
 * iframe
 * =========================================================
 */

.rich-text__content :deep(iframe) {
  display: block;

  width: 100%;
  max-width: 100%;

  margin: 0.5em 0;

  border: 0;
}

/**
 * =========================================================
 * Table
 * =========================================================
 */

.rich-text__content :deep(table) {
  display: block;

  width: 100%;
  max-width: 100%;

  margin: 1em 0;

  border-collapse: collapse;

  overflow-x: auto;
}

.rich-text__content :deep(th),
.rich-text__content :deep(td) {
  padding: 8px 12px;

  border: 1px solid #e5e5e5;

  white-space: nowrap;
}

/**
 * =========================================================
 * Blockquote
 * =========================================================
 */

.rich-text__content :deep(blockquote) {
  margin: 1em 0;
  padding: 0.5em 1em;

  border-left: 4px solid #e5e5e5;

  color: #666;
}

/**
 * =========================================================
 * Code
 * =========================================================
 */

.rich-text__content :deep(code) {
  padding: 0.15em 0.35em;

  border-radius: 4px;

  font-family:
    ui-monospace,
    SFMono-Regular,
    Menlo,
    Monaco,
    Consolas,
    monospace;

  font-size: 0.9em;

  overflow-wrap: anywhere;
}

.rich-text__content :deep(pre) {
  max-width: 100%;

  margin: 1em 0;
  padding: 12px 14px;

  overflow-x: auto;

  border-radius: 6px;

  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.rich-text__content :deep(pre code) {
  padding: 0;

  background: transparent;

  white-space: inherit;
}

/**
 * =========================================================
 * HR
 * =========================================================
 */

.rich-text__content :deep(hr) {
  margin: 1.5em 0;

  border: 0;

  border-top: 1px solid #e5e5e5;
}

/**
 * =========================================================
 * Figure
 * =========================================================
 */

.rich-text__content :deep(figure) {
  margin: 1em 0;
}

.rich-text__content :deep(figcaption) {
  margin-top: 0.5em;

  color: #888;

  font-size: 13px;

  text-align: center;
}

/**
 * =========================================================
 * Toggle
 * =========================================================
 */

.rich-text__toggle {
  display: block;

  margin-top: 8px;
  margin-left: auto;

  padding: 0;

  border: 0;
  background: transparent;

  color: #1677ff;

  font-size: 14px;
  line-height: 1.5;

  cursor: pointer;

  user-select: none;

  overflow-anchor: none;
}

.rich-text__toggle:hover {
  color: #4096ff;
}

.rich-text__toggle:focus-visible {
  outline: 2px solid currentColor;

  outline-offset: 2px;

  border-radius: 2px;
}
</style>
