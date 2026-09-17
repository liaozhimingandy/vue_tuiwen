<!--
  SingleEmoji - 单 Emoji 大动画组件

  用途：渲染一个 Emoji 字符；当该 Emoji 命中 ANIMATED_EMOJI 列表时播放大动画（Lottie），
        并可选择缩小后持续循环播放。
  职责边界：只负责单个 Emoji 的展示与动画，不含表情选择面板等业务。
  被谁使用：点赞、庆祝等需要 Emoji 动效的地方。
  注意：
  - 动画层用 position: fixed + 视口坐标（getBoundingClientRect）定位，
    而不是依赖父元素定位，从而避开 overflow / 卡片 / 折叠容器的裁剪。
    （注意：这里并没有使用 <Teleport>，动画节点仍在本组件的 DOM 树内。）
  - 用 taskId 防止 content 快速变化时旧动画异步任务污染新动画（竞态保护）。
  - 用两套坐标（原始 Emoji 中心 / 父容器中心）实现「大动画 → 缩小」的平滑过渡。
-->
<template>
  <!--     原始 Emoji
      这个元素只负责：
      1. 正常参与文本布局
      2. 提供动画中心坐标
  -->
  <span ref="rootRef" class="single-emoji" :style="rootStyle">
    <span class="emoji-normal" :class="{'is-hidden': isAnimating}">
      {{ emoji }}
    </span>
  </span>

  <!--
    ⭐ 动画层（fixed 定位，脱离父容器的裁剪范围）
    用 fixed + 视口坐标来避免被以下父容器影响：
    - overflow: hidden
    - overflow: clip
    - RichText
    - Card
    - Collapse
  -->
  <span v-if="isAnimating" ref="animationRef" class="emoji-animation" :style="animationStyle" />
</template>

<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue';
// ⚠️ 只做「类型导入」：import type 在编译期会被完全擦除，不会产生运行时依赖。
// lottie 运行时（@lottiefiles/dotlottie-web，含 wasm 加载器）体积可观，
// 又因为本组件被 Post.vue → HomePage.vue 引用，之前静态导入会让它进入首屏包。
// 现在改为首次真正需要播放大动画时才动态 import（见 loadDotLottie）。
import type {DotLottie} from '@lottiefiles/dotlottie-web';

/**
 * Emoji 动画状态
 *
 * idle
 *   ↓
 * playing-large 【在父容器居中播放大动画】
 *   ↓
 * playing-shrink 【缩小过渡阶段，坐标切回原始emoji位置】
 *   ↓
 * playing-small
 */
type EmojiState = 'idle' | 'playing-large' | 'playing-shrink' | 'playing-small';

const props = withDefaults(
  defineProps<{
    /**
     * Emoji 内容
     *
     * 例如：
     * 🙂 😂 ❤️
     */
    content: string;

    /**
     * 大动画播放完成后，
     * 是否缩小并继续播放
     *
     * false：
     *   大动画 → 静态 Emoji
     *
     * true：
     *   大动画 → 缩小 → 小动画持续循环
     */
    continueAfterShrink?: boolean;

    /**
     * 正常 Emoji 尺寸
     */
    size?: number;

    /**
     * 大动画尺寸
     */
    animationSize?: number;

    /**
     * 是否启用缩小过渡动画
     */
    shrinkTransition?: boolean;
  }>(),
  {
    continueAfterShrink: false,
    size: 24,
    animationSize: 100,
    shrinkTransition: true,
  },
);

/** 原始 Emoji DOM */
const rootRef = ref<HTMLElement>();
/** Teleport 后的动画 DOM */
const animationRef = ref<HTMLElement>();

/** 当前状态 */
const state = ref<EmojiState>('idle');

/**
 * 两套 viewport 坐标
 * originCenter：原始emoji的中心点（缩小完成要回到这里）
 * containerCenter：父容器viewport中心点（大动画播放阶段用）
 */
const originCenterX = ref(0);
const originCenterY = ref(0);
const containerCenterX = ref(0);
const containerCenterY = ref(0);

/** Lottie Player 实例 */
let player: DotLottie | null = null;
/** Canvas */
let canvas: HTMLCanvasElement | null = null;

/**
 * 缓存动态加载回来的 DotLottie 构造器
 * 只加载一次，后续复用；null 表示尚未加载
 */
let DotLottieCtor: (typeof import('@lottiefiles/dotlottie-web'))['DotLottie'] | null = null;

/**
 * 按需加载 lottie 运行时
 *
 * 该运行时体积较大且绝大多数用户不会触发 Emoji 大动画，
 * 因此拆成独立 chunk，仅在首个动画 Emoji 出现时下载一次。
 *
 * @returns DotLottie 构造器
 */
async function loadDotLottie() {
  if (!DotLottieCtor) {
    const mod = await import('@lottiefiles/dotlottie-web');
    DotLottieCtor = mod.DotLottie;
  }
  return DotLottieCtor;
}

/**
 * 当前播放任务 ID
 *
 * 防止：
 * content 快速变化时，
 * 旧动画异步任务影响新动画。
 */
let taskId = 0;

/** 是否正在监听位置变化 */
let positionListening = false;

/** =========================================================
 * Emoji
 * ========================================================= */
const emoji = computed(() => {
  return props.content.trim();
});

/** =========================================================
 * Emoji -> Unicode Code Point
 *
 * 🙂
 * -> 1f642
 *
 * 😂
 * -> 1f602
 *
 * ❤️
 * -> 2764-fe0f
 * ========================================================= */
const codePoint = computed(() => {
  return Array.from(emoji.value)
    .map((char) => char.codePointAt(0)?.toString(16))
    .filter((value): value is string => Boolean(value))
    .join('-');
});

/** =========================================================
 * 支持动画的 Emoji
 * =========================================================
 *
 * 后续直接往这里增加即可。
 */
const ANIMATED_EMOJI = new Set(['🙂', '😅', '😦']);

/** 是否支持动画 */
const hasAnimation = computed(() => {
  return ANIMATED_EMOJI.has(emoji.value);
});

/** 是否正在动画 */
const isAnimating = computed(() => {
  return state.value !== 'idle';
});

/** 是否处于缩小后的持续播放阶段 */
const isSmall = computed(() => {
  return state.value === 'playing-small';
});

/** 是否处于缩小过渡阶段 */
const isShrinking = computed(() => {
  return state.value === 'playing-shrink';
});

/** =========================================================
 * 根容器样式
 * ========================================================= */
const rootStyle = computed(() => {
  return {
    '--emoji-size': `${props.size}px`,
  };
});

/** =========================================================
 * 动画样式
 *
 * 注意：
 *
 * 动画并不是跟随父元素定位，
 * 而是使用 fixed + 视口坐标（left/top 由 JS 计算）。
 *
 * left / top：
 *   根据状态切换：大动画=父容器中心；缩小后=原始emoji中心
 *
 * transform：
 *   将动画自身中心移动到这个中心点
 * ========================================================= */
const animationStyle = computed(() => {
  const scale = isSmall.value || isShrinking.value ? props.size / props.animationSize : 1;

  // 状态判断坐标
  let left: number;
  let top: number;
  if (state.value === 'playing-large') {
    // 放大播放阶段：父容器中心
    left = containerCenterX.value;
    top = containerCenterY.value;
  } else {
    // shrink / small：切回原始emoji中心点
    left = originCenterX.value;
    top = originCenterY.value;
  }

  return {
    left: `${left}px`,
    top: `${top}px`,
    '--animation-size': `${props.animationSize}px`,
    '--emoji-scale': String(scale),
    '--shrink-duration': props.shrinkTransition ? '350ms' : '0ms',
  };
});

/** =========================================================
 * 更新两套坐标
 * 1. origin：当前rootRef的位置
 * 2. container：rootRef**的父元素**视口中心点
 * ========================================================= */
function updatePosition() {
  if (!rootRef.value) return;

  const rootRect = rootRef.value.getBoundingClientRect();
  // 原始emoji中心点
  originCenterX.value = rootRect.left + rootRect.width / 2;
  originCenterY.value = rootRect.top + rootRect.height / 2;

  // 获取直接父容器的bounding rect
  const parentEl = rootRef.value.parentElement;
  if (parentEl) {
    const parentRect = parentEl.getBoundingClientRect();
    containerCenterX.value = parentRect.left + parentRect.width / 2;
    containerCenterY.value = parentRect.top + parentRect.height / 2;
  } else {
    // 兜底：如果没有父，回退到原始emoji坐标
    containerCenterX.value = originCenterX.value;
    containerCenterY.value = originCenterY.value;
  }
}

/** =========================================================
 * 开始监听位置变化
 *
 * 页面滚动时：
 *
 * Emoji 会移动
 * ↓
 * 更新动画位置
 *
 * 窗口 resize 同理。
 * ========================================================= */
function startPositionListener() {
  if (positionListening) return;
  positionListening = true;

  window.addEventListener('scroll', updatePosition, true);
  window.addEventListener('resize', updatePosition);
}

/** =========================================================
 * 停止监听位置变化
 * ========================================================= */
function stopPositionListener() {
  if (!positionListening) return;
  positionListening = false;

  window.removeEventListener('scroll', updatePosition, true);
  window.removeEventListener('resize', updatePosition);
}

/** =========================================================
 * 销毁 Lottie
 * ========================================================= */
function destroyPlayer() {
  if (player) {
    player.removeEventListener('complete', handleComplete);
    player.destroy();
    player = null;
  }
  canvas?.remove();
  canvas = null;
  animationRef.value?.replaceChildren();
}

/**
 * 创建 Lottie Player
 *
 * 由于 lottie 运行时是动态加载的，本函数为异步。
 * 返回 null 表示创建失败（DOM 已卸载，或运行时加载抛错）。
 *
 * @returns 创建并绑定好事件的 player 实例；失败时为 null
 */
async function createPlayer() {
  if (!animationRef.value) return null;

  destroyPlayer();

  // 动画资源约定：public/emoji-animation/{codePoint}/lottie.json，codePoint 由 Emoji 转 Unicode 码点得到
  const src = `/emoji-animation/${codePoint.value}/lottie.json`;

  let Ctor;
  try {
    Ctor = await loadDotLottie();
  } catch (err) {
    console.error('[SingleEmoji] lottie 运行时加载失败，本次动画降级为静态 Emoji', err);
    return null;
  }

  // 等待加载期间组件可能已卸载、或状态已回到 idle，此时 animationRef 会被置空
  if (!animationRef.value) return null;

  canvas = document.createElement('canvas');
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  animationRef.value.appendChild(canvas);

  player = new Ctor({
    canvas,
    src,
    autoplay: true,
    loop: false,
  });

  player.addEventListener('complete', handleComplete);
  return player;
}

/** =========================================================
 * 开始播放
 * ========================================================= */
async function start() {
  if (!hasAnimation.value) return;

  const currentTaskId = ++taskId;
  destroyPlayer();

  updatePosition();
  state.value = 'playing-large';

  startPositionListener();
  await nextTick();

  if (currentTaskId !== taskId) return;
  updatePosition();

  // 首次触发会顺带动态加载 lottie 运行时，因此这里必须 await
  const currentPlayer = await createPlayer();

  // 加载期间状态可能已变化（content 变更 / 组件卸载 / 被 stop），此时放弃本次播放
  if (currentTaskId !== taskId) {
    destroyPlayer();
    return;
  }
  if (!currentPlayer) {
    state.value = 'idle';
    stopPositionListener();
    return;
  }
  currentPlayer.play();
}

/** =========================================================
 * 大动画播放完成回调
 * ========================================================= */
async function handleComplete() {
  if (state.value !== 'playing-large') return;

  if (!props.continueAfterShrink) {
    stop();
    return;
  }

  // 🎯关键：进入缩小过渡状态，坐标会自动切回originCenter，同时scale变小
  state.value = 'playing-shrink';
  await nextTick();

  if (!player) return;

  player.setLoop(true);
  player.setFrame(0);
  player.play();

  // 等待CSS shrink过渡时长结束，再切到playing-small稳定状态
  const shrinkMs = props.shrinkTransition ? 350 : 0;
  setTimeout(() => {
    // 任务有效性校验，避免组件销毁后执行
    if (state.value === 'playing-shrink') {
      state.value = 'playing-small';
    }
  }, shrinkMs);
}

/** =========================================================
 * 停止动画
 * ========================================================= */
function stop() {
  taskId++;
  player?.stop();
  destroyPlayer();
  state.value = 'idle';
  stopPositionListener();
}

/** =========================================================
 * 重新播放
 * =========================================================  */
async function restart() {
  stop();
  await nextTick();
  start();
}

/** Mounted */
onMounted(() => {
  start();
});

watch(
  () => props.content,
  () => {
    restart();
  },
);

watch(
  () => props.continueAfterShrink,
  (value) => {
    if (!value && (state.value === 'playing-small' || state.value === 'playing-shrink')) {
      stop();
    }
  },
);

onBeforeUnmount(() => {
  stop();
});
</script>

<style scoped>
/* =========================================================
 原始 Emoji
========================================================= */
.single-emoji {
  position: relative;
  display: inline-flex;
  width: var(--emoji-size);
  height: var(--emoji-size);
  align-items: center;
  justify-content: center;
  flex: none;
  vertical-align: middle;
  overflow: visible;
}

/* =========================================================
 普通 Emoji
========================================================= */
.emoji-normal {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  line-height: 1;
  white-space: nowrap;
}

.emoji-normal.is-hidden {
  visibility: hidden;
}

/* =========================================================
 Lottie 动画
========================================================= */
.emoji-animation {
  position: fixed;
  width: var(--animation-size);
  height: var(--animation-size);

  transform: translate(-50%, -50%) scale(var(--emoji-scale));
  transform-origin: center center;

  pointer-events: none;
  opacity: 1;

  transition:
    transform var(--shrink-duration) ease,
    left var(--shrink-duration) ease,
    top var(--shrink-duration) ease;

  will-change: transform, left, top;
}

.emoji-animation :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}
</style>
