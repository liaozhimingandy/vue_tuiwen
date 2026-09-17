<!--
  TextCollapse - 纯文本 / 插槽内容折叠组件

  用途：对插槽内的文本做「最多 N 行」折叠，提供展开/收起，并在展开/收起时把滚动条
        复位到锚点，避免页面因内容撑高而跳动。
  职责边界：比 RichTextCollapse 更轻量，不渲染 HTML，仅处理插槽文本与滚动锚定。
  被谁使用：评论、短描述等纯文本场景。
  注意：
  - 用两次 requestAnimationFrame 确保浏览器重排后再复位滚动条，消弭一帧跳动。
  - CSS 中 overflow-anchor: none 强制禁用浏览器滚动锚定，避免与手写锚点冲突。
-->
<template>
  <div class="text-collapse">
    <div ref="contentRef" class="content rich-text" :class="{'is-expanded': isExpanded}">
      <slot></slot>
    </div>

    <div v-if="isOverflow" class="toggle-btn" @click="toggleExpand">
      {{ isExpanded ? collapseText : expandText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import {ref, onMounted, onUnmounted, nextTick} from 'vue';

/**
 * 简易防抖：delay 毫秒内的多次调用只执行最后一次。
 * @param fn 被防抖的函数
 * @param delay 静默等待时间（ms），默认 300
 * @returns 防抖后的函数
 */
const debounce = <T extends (...args: any[]) => void>(fn: T, delay = 300) => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

interface TextCollapseProps {
  /** 折叠阈值：最多展示的行数（配合 -webkit-line-clamp 生效） */
  lines?: number;
  /** 展开按钮文案 */
  expandText?: string;
  /** 收起按钮文案 */
  collapseText?: string;
  /** 是否监听内容变化（MutationObserver）以重算溢出 */
  autoObserve?: boolean;
  /** 滚动容器：CSS 选择器或元素本身；不传则使用 window */
  scrollContainer?: string | HTMLElement | null;
}

const props = withDefaults(defineProps<TextCollapseProps>(), {
  lines: 5,
  expandText: '展开全文',
  collapseText: '收起',
  autoObserve: true,
  scrollContainer: null,
});

const contentRef = ref<HTMLElement | null>(null);
const isExpanded = ref(false);
const isOverflow = ref(false);

let mutationObserver: MutationObserver | null = null;
let resizeHandler: (() => void) | null = null;

// 核心：展开那一刻的滚动条位置，作为收起时的复位锚点
let anchorScrollTop = 0;

// ========== 滚动容器工具 ==========

/**
 * 解析出实际的滚动宿主。
 * @returns 配置了 scrollContainer 就用它（选择器未命中时回退 window），否则 window
 */
const getScrollEl = (): HTMLElement | Window => {
  if (!props.scrollContainer) return window;
  if (typeof props.scrollContainer === 'string') {
    return document.querySelector<HTMLElement>(props.scrollContainer) ?? window;
  }
  return props.scrollContainer;
};

/**
 * 读取当前滚动位置
 * 用 instanceof Window 收窄联合类型（`el === window` 在 TS 里不足以收窄 Window | HTMLElement）
 */
const getScrollTop = (): number => {
  const el = getScrollEl();
  if (el instanceof Window) {
    return window.pageYOffset || document.documentElement.scrollTop;
  }
  return el.scrollTop;
};

/**
 * 设置滚动位置
 * @param val 目标 scrollTop
 */
const setScrollTop = (val: number) => {
  const el = getScrollEl();
  if (el instanceof Window) {
    window.scrollTo(0, val);
    return;
  }
  el.scrollTop = val;
};

// ========== 判断是否溢出 ==========
const calcOverflow = async () => {
  await nextTick();
  const el = contentRef.value;
  if (!el) return;

  // 先临时解除展开态，才能量到"折叠后"的真实高度
  el.classList.remove('is-expanded');
  // 用 setProperty 而不是 el.style.webkitLineClamp：后者在部分 TS DOM 定义里不存在
  el.style.setProperty('-webkit-line-clamp', String(props.lines));
  isOverflow.value = el.scrollHeight > el.clientHeight;
  el.style.removeProperty('-webkit-line-clamp');

  if (isExpanded.value) el.classList.add('is-expanded');
};

// ========== 核心：切换展开收起 ==========
const toggleExpand = () => {
  const willExpand = !isExpanded.value;

  if (willExpand) {
    // 【展开】
    // 1. 改状态前，先牢牢记住此刻滚动条位置
    anchorScrollTop = getScrollTop();
    // 2. 执行展开
    isExpanded.value = true;
    // 3. DOM 更新 + 浏览器重排后，强制把滚动条拉回原来的位置
    nextTick(() => {
      // 用两次 rAF 确保在浏览器重排之后执行，彻底消弭一帧跳动
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setScrollTop(anchorScrollTop);
        });
      });
    });
  } else {
    // 【收起】
    // 直接把滚动条设置回展开前记录的值，一步到位
    isExpanded.value = false;
    nextTick(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setScrollTop(anchorScrollTop);
        });
      });
    });
  }
};

// ========== 监听图片加载 ==========
const observeImages = () => {
  const el = contentRef.value;
  if (!el) return;
  const imgs = el.querySelectorAll<HTMLImageElement>('img');
  if (imgs.length === 0) return;

  let loaded = 0;
  const total = imgs.length;
  const onLoad = () => {
    loaded++;
    if (loaded >= total) calcOverflow();
  };

  imgs.forEach((img) => {
    if (img.complete) onLoad();
    else {
      img.addEventListener('load', onLoad, {once: true});
      img.addEventListener('error', onLoad, {once: true});
    }
  });
};

// ========== 监听内容变化 ==========
const initObserver = () => {
  if (!props.autoObserve || !contentRef.value) return;
  mutationObserver = new MutationObserver(debounce(calcOverflow, 200));
  mutationObserver.observe(contentRef.value, {
    childList: true,
    subtree: true,
    characterData: true,
  });
};

const initResize = () => {
  resizeHandler = debounce(calcOverflow, 200);
  window.addEventListener('resize', resizeHandler);
};

// ========== 生命周期 ==========
onMounted(() => {
  calcOverflow();
  observeImages();
  initObserver();
  initResize();
});

onUnmounted(() => {
  if (resizeHandler) window.removeEventListener('resize', resizeHandler);
  mutationObserver?.disconnect();
});

defineExpose({calcOverflow, toggleExpand});
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
  -webkit-line-clamp: 2;
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
.toggle-btn:hover {
  color: #4096ff;
}
</style>
