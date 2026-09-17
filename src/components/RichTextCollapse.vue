<!--
  RichTextCollapse - 富文本折叠 / 展开组件

  用途：渲染后端下发的富文本 HTML（或默认插槽内容），超出指定行数时自动折叠，
        并提供「展开全文 / 收起」按钮。
  职责边界：只负责「文本高度折叠」这一件事，不处理图片预览、点赞等业务逻辑。
  被谁使用：推文卡片的正文区域。
  注意：
  - 通过临时 add/remove measuring class 测量是否溢出，测量过程绝不改动受控/非受控展开状态。
  - 支持受控模式（expanded prop 双向绑定）与非受控模式（内部 internalExpanded）。
  - 同时监听 MutationObserver（内容变化）与 ResizeObserver（容器宽度变化）以重算溢出。
-->
<template>
  <div class="rich-text">
    <!-- 富文本内容 -->
    <div
      ref="contentRef"
      class="rich-text__content"
      :class="{
        'rich-text__content--collapsed': shouldCollapse,
      }"
      :style="contentStyle"
    >
      <!-- HTML -->
      <template v-if="content !== undefined && content !== null">
        <div class="rich-text__html" v-html="content" />
      </template>

      <!-- Slot -->
      <slot v-else />
    </div>

    <!-- 展开 / 收起 -->
    <button
      v-if="showToggleButton"
      type="button"
      class="rich-text__toggle"
      :aria-expanded="isExpanded"
      @click.stop="toggle"
    >
      {{ isExpanded ? collapseText : expandText }}
    </button>
  </div>
</template>

<script setup lang="ts">
import {computed, nextTick, onMounted, onUnmounted, ref, watch} from 'vue';

type Mode = 'auto' | 'collapse' | 'full';

interface Props {
  /**
   * 富文本 HTML
   */
  content?: string | null;

  /**
   * 展示模式
   *
   * auto：自动
   * collapse：支持折叠
   * full：完整展示
   */
  mode?: Mode;

  /**
   * auto 模式是否允许折叠
   */
  collapsible?: boolean;

  /**
   * 折叠行数
   */
  lines?: number;

  /**
   * 展开文字
   */
  expandText?: string;

  /**
   * 收起文字
   */
  collapseText?: string;

  /**
   * 是否显示按钮
   */
  showToggle?: boolean;

  /**
   * 是否监听内容变化
   */
  autoObserve?: boolean;

  /**
   * 受控展开状态
   */
  expanded?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'auto',
  collapsible: true,
  lines: 5,
  expandText: '展开全文',
  collapseText: '收起',
  showToggle: true,
  autoObserve: true,
  expanded: undefined,
});

const emit = defineEmits<{
  'update:expanded': [value: boolean];
  expand: [];
  collapse: [];
  'expanded-change': [value: boolean];
}>();

/**
 * =========================================================
 * Refs
 * =========================================================
 */

const contentRef = ref<HTMLElement | null>(null);

/**
 * 内部展开状态
 */
const internalExpanded = ref(false);

/**
 * 是否内容溢出
 */
const isOverflow = ref(false);

/**
 * =========================================================
 * Collapse Mode
 * =========================================================
 */

const isCollapsible = computed(() => {
  if (props.mode === 'full') {
    return false;
  }

  if (props.mode === 'collapse') {
    return true;
  }

  return props.collapsible;
});

/**
 * 是否受控模式
 */
const isControlled = computed(() => {
  return props.expanded !== undefined;
});

/**
 * 实际展开状态
 */
const isExpanded = computed(() => {
  if (!isCollapsible.value) {
    return false;
  }

  if (isControlled.value) {
    return props.expanded === true;
  }

  return internalExpanded.value;
});

/**
 * 标准化行数
 */
const normalizedLines = computed(() => {
  const value = Number(props.lines);

  if (!Number.isFinite(value)) {
    return 5;
  }

  return Math.max(1, Math.floor(value));
});

/**
 * 是否真正折叠
 *
 * ⚠️ 这是控制 CSS 的唯一地方
 */
const shouldCollapse = computed(() => {
  return isCollapsible.value && isOverflow.value && !isExpanded.value;
});

/**
 * 是否显示按钮
 */
const showToggleButton = computed(() => {
  return isCollapsible.value && props.showToggle && isOverflow.value;
});

/**
 * CSS Variables
 */
const contentStyle = computed(() => ({
  '--rich-text-lines': normalizedLines.value,
}));

/**
 * =========================================================
 * Recalculate Overflow
 * =========================================================
 */

let timer: ReturnType<typeof setTimeout> | null = null;

const scheduleRecalculate = (delay = 50) => {
  if (!isCollapsible.value) {
    return;
  }

  if (timer) {
    clearTimeout(timer);
  }

  timer = setTimeout(() => {
    timer = null;
    void recalculate();
  }, delay);
};

/**
 * 判断是否溢出
 *
 * 注意：
 * 必须临时添加 collapsed class
 * 但绝对不修改 isExpanded
 */
const recalculate = async () => {
  if (!isCollapsible.value) {
    isOverflow.value = false;
    return;
  }

  await nextTick();

  const el = contentRef.value;

  if (!el) {
    isOverflow.value = false;
    return;
  }

  /**
   * 保存当前 class
   */
  const wasCollapsed = el.classList.contains('rich-text__content--collapsed');

  /**
   * 临时强制折叠测量
   */
  el.classList.add('rich-text__content--measuring');

  /**
   * 强制浏览器重新布局
   */
  void el.offsetHeight;

  /**
   * 测量
   */
  const overflow = el.scrollHeight > el.clientHeight + 1;

  isOverflow.value = overflow;

  /**
   * 删除测量状态
   */
  el.classList.remove('rich-text__content--measuring');

  /**
   * 恢复 Vue 控制的状态
   */
  if (!wasCollapsed) {
    await nextTick();
  }
};

/**
 * =========================================================
 * Expanded State
 * =========================================================
 */

const setExpanded = (value: boolean) => {
  /**
   * 非折叠模式
   */
  if (!isCollapsible.value) {
    return;
  }

  /**
   * 当前状态相同
   */
  if (value === isExpanded.value) {
    return;
  }

  /**
   * 受控模式
   */
  if (isControlled.value) {
    emit('update:expanded', value);
  } else {
    /**
     * 非受控模式
     */
    internalExpanded.value = value;
  }

  emit('expanded-change', value);

  if (value) {
    emit('expand');
  } else {
    emit('collapse');
  }
};

const expand = () => {
  if (!isOverflow.value) {
    return;
  }

  setExpanded(true);
};

const collapse = () => {
  setExpanded(false);
};

const toggle = () => {
  console.log('[RichTextCollapse]', {
    isExpanded: isExpanded.value,
    isOverflow: isOverflow.value,
    isControlled: isControlled.value,
  });

  if (isExpanded.value) {
    collapse();
  } else {
    expand();
  }
};

/**
 * =========================================================
 * MutationObserver
 * =========================================================
 */

let mutationObserver: MutationObserver | null = null;

const initMutationObserver = () => {
  mutationObserver?.disconnect();

  if (!props.autoObserve || !isCollapsible.value || !contentRef.value) {
    return;
  }

  mutationObserver = new MutationObserver(() => {
    observeImages();
    scheduleRecalculate();
  });

  mutationObserver.observe(contentRef.value, {
    childList: true,
    subtree: true,
    characterData: true,
  });
};

/**
 * =========================================================
 * ResizeObserver
 * =========================================================
 */

let resizeObserver: ResizeObserver | null = null;

const initResizeObserver = () => {
  resizeObserver?.disconnect();

  if (!props.autoObserve || !isCollapsible.value || !contentRef.value || typeof ResizeObserver === 'undefined') {
    return;
  }

  /**
   * 监听父容器宽度
   *
   * 不监听 content 自己，
   * 防止展开收起循环触发
   */
  const target = contentRef.value.parentElement;

  if (!target) {
    return;
  }

  resizeObserver = new ResizeObserver(() => {
    scheduleRecalculate();
  });

  resizeObserver.observe(target);
};

/**
 * =========================================================
 * Images
 * =========================================================
 */

const observedImages = new WeakSet<HTMLImageElement>();

const observeImages = () => {
  const el = contentRef.value;

  if (!el) {
    return;
  }

  el.querySelectorAll<HTMLImageElement>('img').forEach((image) => {
    if (observedImages.has(image)) {
      return;
    }

    observedImages.add(image);

    const handler = () => {
      scheduleRecalculate(30);
    };

    image.addEventListener('load', handler, {once: true});

    image.addEventListener('error', handler, {once: true});

    /**
     * 已加载
     */
    if (image.complete) {
      handler();
    }
  });
};

/**
 * =========================================================
 * Initialize
 * =========================================================
 */

const initialize = async () => {
  await nextTick();

  if (!isCollapsible.value) {
    isOverflow.value = false;
    return;
  }

  observeImages();

  /**
   * 初始状态：
   *
   * 先强制认为可能需要折叠
   */
  isOverflow.value = true;

  await nextTick();

  await recalculate();

  initMutationObserver();

  initResizeObserver();
};

/**
 * =========================================================
 * Watch
 * =========================================================
 */

watch(
  () => props.content,
  () => {
    void initialize();
  },
);

watch(normalizedLines, () => {
  scheduleRecalculate(0);
});

watch([() => props.mode, () => props.collapsible], () => {
  void initialize();
});

/**
 * =========================================================
 * Lifecycle
 * =========================================================
 */

onMounted(() => {
  void initialize();
});

onUnmounted(() => {
  mutationObserver?.disconnect();

  resizeObserver?.disconnect();

  if (timer) {
    clearTimeout(timer);
  }
});

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
});
</script>

<style scoped>
.rich-text {
  width: 100%;
  min-width: 0;

  color: #333;
  font-size: 16px;
  line-height: 1.6;
}

.rich-text__content {
  width: 100%;
  min-width: 0;

  word-break: break-word;
  overflow-wrap: anywhere;
}

/**
 * 正常折叠
 */
.rich-text__content--collapsed,

/**
 * 测量时强制折叠
 */
.rich-text__content--measuring {
  display: -webkit-box;

  -webkit-box-orient: vertical;

  -webkit-line-clamp: var(--rich-text-lines, 5);

  overflow: hidden;
}

/* HTML */
.rich-text__html {
  width: 100%;
}

/* 富文本元素 */

.rich-text__content :deep(p) {
  margin: 0 0 1em;
}

.rich-text__content :deep(p:last-child) {
  margin-bottom: 0;
}

.rich-text__content :deep(img),
.rich-text__content :deep(video) {
  display: block;

  max-width: 100%;
  height: auto;

  margin: 0.5em 0;
}

.rich-text__content :deep(table) {
  display: block;

  max-width: 100%;

  overflow-x: auto;
}

.rich-text__content :deep(pre) {
  max-width: 100%;

  overflow-x: auto;

  white-space: pre-wrap;
}

.rich-text__toggle {
  display: block;

  margin-top: 8px;
  margin-left: auto;

  padding: 0;

  border: 0;
  background: transparent;

  color: #1677ff;

  font-size: 14px;

  cursor: pointer;
}

.rich-text__toggle:hover {
  color: #4096ff;
}
</style>
