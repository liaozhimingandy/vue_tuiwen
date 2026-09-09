<template>
  <div class="rich-text">
    <div
      ref="contentRef"
      class="rich-text__content"
      :class="{
        'is-collapsed': isCollapsible && !isExpanded,
        'is-expanded': isCollapsible && isExpanded,
      }"
      :style="contentStyle"
    >
      <!--
        content 优先于 slot。

        标准用法：
        <RichTextCollapse :content="html" />

        高级用法：
        <RichTextCollapse>
          <article>...</article>
        </RichTextCollapse>
      -->
      <template v-if="content != null">
        <div
          class="rich-text__html"
          v-html="content"
        />
      </template>

      <slot v-else />
    </div>

    <button
      v-if="showToggle"
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

type ScrollContainer = string | HTMLElement | null

type RichTextMode =
  | 'auto'
  | 'collapse'
  | 'full'

interface Props {
  /**
   * HTML 富文本内容。
   *
   * content 优先级高于 default slot。
   *
   * 注意：
   * content 必须在进入本组件之前完成 HTML 安全清洗。
   */
  content?: string | null

  /**
   * 展示模式：
   *
   * auto     根据 collapsible 判断
   * collapse 强制启用折叠
   * full     完整展示
   */
  mode?: RichTextMode

  /**
   * auto 模式下是否允许折叠。
   *
   * mode="collapse" 时始终折叠能力开启。
   * mode="full" 时始终关闭。
   */
  collapsible?: boolean

  /**
   * 折叠行数。
   */
  lines?: number

  /**
   * 展开按钮文字。
   */
  expandText?: string

  /**
   * 收起按钮文字。
   */
  collapseText?: string

  /**
   * 是否监听内容 / 尺寸变化。
   *
   * 关闭后仍会进行初始化计算，
   * 但不会启动 MutationObserver / ResizeObserver。
   */
  autoObserve?: boolean

  /**
   * 页面滚动容器。
   *
   * 默认使用 window。
   *
   * 可以传：
   * - CSS selector
   * - HTMLElement
   * - null
   */
  scrollContainer?: ScrollContainer

  /**
   * 是否显示展开 / 收起按钮。
   *
   * 注意：
   * 即使为 true，只有实际发生溢出时才显示。
   */
  showToggle?: boolean

  /**
   * 受控展开状态。
   *
   * 配合：
   * v-model:expanded
   */
  expanded?: boolean
}

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

const emit = defineEmits<{
  /**
   * v-model:expanded
   */
  'update:expanded': [value: boolean]

  /**
   * 展开事件。
   */
  expand: []

  /**
   * 收起事件。
   */
  collapse: []

  /**
   * 展开状态变化。
   */
  'expanded-change': [value: boolean]
}>()

const contentRef = ref<HTMLElement | null>(null)

const internalExpanded = ref(false)

const isOverflow = ref(false)

/**
 * =========================================================
 * 展示模式
 * =========================================================
 */

const isCollapsible = computed(() => {
  switch (props.mode) {
    case 'full':
      return false

    case 'collapse':
      return true

    case 'auto':
    default:
      return props.collapsible
  }
})

/**
 * 是否为受控模式。
 */
const isControlled = computed(() => {
  return props.expanded !== undefined
})

/**
 * 最终展开状态。
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
 * 规范折叠行数。
 */
const normalizedLines = computed(() => {
  const value = Number(props.lines)

  if (!Number.isFinite(value)) {
    return 5
  }

  return Math.max(1, Math.floor(value))
})

/**
 * 是否显示按钮。
 */
const showToggle = computed(() => {
  return (
    isCollapsible.value &&
    props.showToggle &&
    isOverflow.value
  )
})

/**
 * CSS 变量。
 */
const contentStyle = computed(() => {
  return {
    '--rich-text-lines': normalizedLines.value,
  }
})

/**
 * =========================================================
 * Observer / Timer
 * =========================================================
 */

let mutationObserver: MutationObserver | null = null

let resizeObserver: ResizeObserver | null = null

let calculationTimer:
  ReturnType<typeof setTimeout> | null = null

let calculating = false

let calculationPending = false

const animationFrames = new Set<number>()

/**
 * 已监听媒体元素。
 *
 * WeakSet 不会阻止 DOM 元素被垃圾回收。
 */
const observedImages =
  new WeakSet<HTMLImageElement>()

const observedVideos =
  new WeakSet<HTMLVideoElement>()

const observedIframes =
  new WeakSet<HTMLIFrameElement>()

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
 * Scroll
 * =========================================================
 */

const getScrollElement = (): Window | HTMLElement => {
  if (!isBrowser()) {
    return window
  }

  const container = props.scrollContainer

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
  const element = getScrollElement()

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

const setScrollTop = (value: number) => {
  const element = getScrollElement()

  if (element === window) {
    window.scrollTo({
      top: value,
      behavior: 'auto',
    })

    return
  }

  element.scrollTop = value
}

/**
 * 获取富文本顶部位置。
 */
const getContentTop = () => {
  return (
    contentRef.value?.getBoundingClientRect().top ??
    0
  )
}

/**
 * =========================================================
 * RAF
 * =========================================================
 */

const requestFrame = (
  callback: FrameRequestCallback,
) => {
  if (!isBrowser()) {
    return
  }

  const id = requestAnimationFrame(time => {
    animationFrames.delete(id)
    callback(time)
  })

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
 * Overflow
 * =========================================================
 */

const recalculate = async () => {
  /**
   * full 模式不需要任何折叠计算。
   */
  if (!isCollapsible.value) {
    isOverflow.value = false
    return
  }

  /**
   * 防止并发计算。
   */
  if (calculating) {
    calculationPending = true
    return
  }

  calculating = true

  try {
    await nextTick()

    const el = contentRef.value

    if (!el) {
      isOverflow.value = false
      return
    }

    /**
     * 保存当前真实状态。
     */
    const expanded = isExpanded.value

    /**
     * 临时强制折叠。
     *
     * 不修改 Vue 状态，只修改 DOM。
     *
     * 这样可以在 expanded=true 时，
     * 仍然准确计算“折叠后是否有溢出”。
     */
    el.classList.add('is-collapsed')
    el.classList.remove('is-expanded')

    /**
     * 强制浏览器完成布局。
     */
    void el.offsetHeight

    /**
     * 判断折叠状态下是否超过容器高度。
     */
    const overflow =
      el.scrollHeight >
      el.clientHeight + 1

    isOverflow.value = overflow

    /**
     * 恢复真实 DOM 状态。
     */
    if (expanded) {
      el.classList.remove('is-collapsed')
      el.classList.add('is-expanded')
    } else {
      el.classList.add('is-collapsed')
      el.classList.remove('is-expanded')
    }
  } finally {
    calculating = false

    if (calculationPending) {
      calculationPending = false
      scheduleRecalculate()
    }
  }
}

/**
 * =========================================================
 * Debounce
 * =========================================================
 */

const scheduleRecalculate = (
  delay = 100,
) => {
  /**
   * full 模式不做任何计算。
   */
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
 * Image
 * =========================================================
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
    {
      once: true,
    },
  )

  image.addEventListener(
    'error',
    handleChange,
    {
      once: true,
    },
  )

  /**
   * 图片已经完成加载。
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
    .querySelectorAll<HTMLImageElement>('img')
    .forEach(observeImage)
}

/**
 * =========================================================
 * Video
 * =========================================================
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
    {
      once: true,
    },
  )

  video.addEventListener(
    'loadeddata',
    handleChange,
    {
      once: true,
    },
  )

  video.addEventListener(
    'error',
    handleChange,
    {
      once: true,
    },
  )

  /**
   * 视频已经有 metadata。
   */
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
 * =========================================================
 * iframe
 * =========================================================
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
    {
      once: true,
    },
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
 * =========================================================
 * Media
 * =========================================================
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
    typeof MutationObserver === 'undefined'
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
    typeof ResizeObserver === 'undefined'
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
 * Expanded
 * =========================================================
 */

const setExpanded = (
  value: boolean,
) => {
  if (!isCollapsible.value) {
    return
  }

  /**
   * 防止重复触发事件。
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

  const scrollTop = getScrollTop()

  const contentTop = getContentTop()

  setExpanded(true)

  await nextTick()

  /**
   * 等待浏览器完成两轮布局。
   *
   * 主要用于：
   * - 图片
   * - 字体
   * - iframe
   * - 动态内容
   */
  requestFrame(() => {
    requestFrame(() => {
      const currentTop = getContentTop()

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

  const scrollTop = getScrollTop()

  const contentTop = getContentTop()

  setExpanded(false)

  await nextTick()

  requestFrame(() => {
    requestFrame(() => {
      const currentTop = getContentTop()

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
 * 初始化
 * =========================================================
 */

const initialize = async () => {
  await nextTick()

  /**
   * full 模式：
   *
   * 只负责渲染，不进行任何折叠相关工作。
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
 * Props Watch
 * =========================================================
 */

/**
 * mode / collapsible。
 */
watch(
  [
    () => props.mode,
    () => props.collapsible,
  ],
  async () => {
    disconnectObservers()

    /**
     * full 模式。
     */
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
 * lines。
 */
watch(
  normalizedLines,
  () => {
    scheduleRecalculate(0)
  },
)

/**
 * autoObserve。
 */
watch(
  () => props.autoObserve,
  () => {
    if (!isCollapsible.value) {
      disconnectObservers()
      return
    }

    if (props.autoObserve) {
      initMutationObserver()
      initResizeObserver()
    } else {
      disconnectObservers()
    }
  },
)

/**
 * content。
 *
 * content 本身变化时：
 * - MutationObserver 不一定能捕获 Vue 的整体替换
 * - 因此直接重新计算
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
 * 外部 expanded。
 *
 * 这里不主动修改父组件状态。
 *
 * 例如：
 *
 * expanded=true
 * 但内容只有 2 行
 *
 * 仍然允许 expanded=true，
 * 只是不会显示展开按钮。
 */
watch(
  () => props.expanded,
  value => {
    if (
      value === undefined ||
      !isCollapsible.value
    ) {
      return
    }

    /**
     * 外部状态变化后，
     * 让 DOM class 与 Vue 状态同步。
     */
    void nextTick()
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

/**
 * content HTML 容器。
 *
 * 仅作为 content 模式下的 HTML 承载节点。
 */
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

