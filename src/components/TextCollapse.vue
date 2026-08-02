<template>
  <div class="text-collapse">
    <div ref="contentRef" class="content rich-text" :class="{ 'is-expanded': isExpanded }">
      <slot></slot>
    </div>

    <div v-if="isOverflow" class="toggle-btn" @click="toggleExpand">
      {{ isExpanded ? collapseText : expandText }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

const debounce = (fn, delay = 300) => {
  let timer = null
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}

const props = defineProps({
  lines: { type: Number, default: 5 },
  expandText: { type: String, default: '展开全文' },
  collapseText: { type: String, default: '收起' },
  autoObserve: { type: Boolean, default: true },
  // 滚动容器选择器，不传默认是 window
  scrollContainer: { type: [String, Object], default: null }
})

const contentRef = ref(null)
const isExpanded = ref(false)
const isOverflow = ref(false)

let mutationObserver = null
let resizeHandler = null

// 核心：展开那一刻的滚动条位置，作为收起时的复位锚点
let anchorScrollTop = 0

// ========== 滚动容器工具 ==========
const getScrollEl = () => {
  if (!props.scrollContainer) return window
  if (typeof props.scrollContainer === 'string') {
    return document.querySelector(props.scrollContainer) || window
  }
  return props.scrollContainer
}

const getScrollTop = () => {
  const el = getScrollEl()
  return el === window
    ? window.pageYOffset || document.documentElement.scrollTop
    : el.scrollTop
}

const setScrollTop = (val) => {
  const el = getScrollEl()
  if (el === window) {
    window.scrollTo(0, val)
  } else {
    el.scrollTop = val
  }
}

// ========== 判断是否溢出 ==========
const calcOverflow = async () => {
  await nextTick()
  const el = contentRef.value
  if (!el) return

  el.classList.remove('is-expanded')
  el.style.webkitLineClamp = props.lines
  isOverflow.value = el.scrollHeight > el.clientHeight
  el.style.webkitLineClamp = ''

  if (isExpanded.value) el.classList.add('is-expanded')
}

// ========== 核心：切换展开收起 ==========
const toggleExpand = () => {
  const willExpand = !isExpanded.value

  if (willExpand) {
    // 【展开】
    // 1. 改状态前，先牢牢记住此刻滚动条位置
    anchorScrollTop = getScrollTop()
    // 2. 执行展开
    isExpanded.value = true
    // 3. DOM 更新 + 浏览器重排后，强制把滚动条拉回原来的位置
    nextTick(() => {
      // 用两次 rAF 确保在浏览器重排之后执行，彻底消弭一帧跳动
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setScrollTop(anchorScrollTop)
        })
      })
    })
  } else {
    // 【收起】
    // 直接把滚动条设置回展开前记录的值，一步到位
    isExpanded.value = false
    nextTick(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setScrollTop(anchorScrollTop)
        })
      })
    })
  }
}

// ========== 监听图片加载 ==========
const observeImages = () => {
  const el = contentRef.value
  if (!el) return
  const imgs = el.querySelectorAll('img')
  if (imgs.length === 0) return

  let loaded = 0
  const total = imgs.length
  const onLoad = () => {
    loaded++
    if (loaded >= total) calcOverflow()
  }

  imgs.forEach(img => {
    if (img.complete) onLoad()
    else {
      img.addEventListener('load', onLoad, { once: true })
      img.addEventListener('error', onLoad, { once: true })
    }
  })
}

// ========== 监听内容变化 ==========
const initObserver = () => {
  if (!props.autoObserve || !contentRef.value) return
  mutationObserver = new MutationObserver(debounce(calcOverflow, 200))
  mutationObserver.observe(contentRef.value, {
    childList: true, subtree: true, characterData: true
  })
}

const initResize = () => {
  resizeHandler = debounce(calcOverflow, 200)
  window.addEventListener('resize', resizeHandler)
}

// ========== 生命周期 ==========
onMounted(() => {
  calcOverflow()
  observeImages()
  initObserver()
  initResize()
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeHandler)
  mutationObserver?.disconnect()
})

defineExpose({ calcOverflow, toggleExpand })
</script>

<style scoped>
.content {
  font-size: 16px;
  line-height: 1.6;
  color: #333;
  width: 100%;
  word-break: break-word;
  overflow-wrap: break-word;

  display: -webkit-box;
  -webkit-line-clamp: 5;
  /*! autoprefixer: off */
  -webkit-box-orient: vertical;
  /*! autoprefixer: on */
  overflow: hidden;
  text-overflow: ellipsis;

  /* 强制禁用浏览器滚动锚定 */
  overflow-anchor: none !important;
}

.content.is-expanded {
  -webkit-line-clamp: unset;
  display: block;
}

/* 富文本适配 */
.rich-text :deep(img),
.rich-text :deep(video),
.rich-text :deep(iframe) {
  max-width: 100%;
  height: auto;
  display: block;
}
.rich-text :deep(table) {
  display: block;
  width: 100%;
  overflow-x: auto;
  border-collapse: collapse;
}
.rich-text :deep(pre),
.rich-text :deep(code) {
  white-space: pre-wrap;
  word-wrap: break-word;
  max-width: 100%;
  overflow-x: auto;
}
.rich-text :deep(p) {
  margin-bottom: 1em;
  line-height: 1.6;
}

/* 按钮也禁用锚定 */
.toggle-btn {
  margin-top: 8px;
  color: #1677ff;
  cursor: pointer;
  font-size: 14px;
  text-align: right;
  user-select: none;
  transition: color 0.2s ease;
  overflow-anchor: none !important;
}
.toggle-btn:hover { color: #4096ff; }
</style>