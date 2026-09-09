<template>
  <div
    ref="containerRef"
    class="single-emoji"
    :class="{
      'is-playing': isAnimating,
      'is-disabled': animationType === 'none'
    }"
    :style="containerStyle"
  >
    <span
      ref="emojiRef"
      class="single-emoji__content"
      :class="animationClass"
      :style="emojiStyle"
      @animationend="handleAnimationEnd"
    >
      {{ emoji }}
    </span>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';
import {
  EMOJI_ANIMATION_MAP,
  isSupportedSingleEmoji,
} from '@/common/emoji'

/**
 * 支持的动画类型
 */
export type SingleEmojiAnimation =
  | 'auto'
  | 'none'
  | 'pop'
  | 'bounce'
  | 'shake'
  | 'heartbeat'
  | 'pulse'
  | 'wave'
  | 'clap'
  | 'laugh'
  | 'sleep'
  | 'cry'
  | 'spin'
  | 'fire'

interface Props {
  /**
   * 数据库返回的 Emoji Unicode
   *
   * 例如：
   * 😂
   * ❤️
   * 👍
   */
  content: string

  /**
   * Emoji 大小
   *
   * 默认 96px
   */
  size?: number | string

  /**
   * 动画类型
   *
   * auto：根据 Emoji 自动选择
   */
  animation?: SingleEmojiAnimation

  /**
   * 是否自动播放
   *
   * 默认 true
   */
  autoplay?: boolean

  /**
   * 是否只播放一次
   *
   * true：进入视口播放一次
   * false：每次进入视口都播放
   */
  once?: boolean

  /**
   * 是否进入视口后才播放
   *
   * 默认 true
   *
   * 如果为 false，则组件 mounted 后立即播放
   */
  playOnVisible?: boolean

  /**
   * IntersectionObserver threshold
   *
   * 默认 0.5
   */
  threshold?: number

  /**
   * 动画播放完成后的回调
   */
  onAnimationEnd?: () => void
}

const props = withDefaults(defineProps<Props>(), {
  size: 96,
  animation: 'auto',
  autoplay: true,
  once: true,
  playOnVisible: true,
  threshold: 0.5,
})

const emit = defineEmits<{
  animationEnd: []
  play: []
}>()

/**
 * DOM
 */
const containerRef = ref<HTMLElement | null>(null)
const emojiRef = ref<HTMLElement | null>(null)

/**
 * 状态
 */
const isAnimating = ref(false)
const hasPlayed = ref(false)

/**
 * IntersectionObserver
 */
let observer: IntersectionObserver | null = null

/**
 * 是否支持当前 Emoji
 *
 * 这里只判断：
 * 内容是否是一个完整 Emoji，
 * 而不是普通文本。
 */
const emoji = computed(() => {
  return props.content.trim()
})

const isSingleEmoji = computed(() => {
  return isSupportedSingleEmoji(emoji.value)
})

/**
 * 自动匹配动画
 */
const animationType = computed<Exclude<SingleEmojiAnimation, 'auto'>>(() => {
  /**
   * 用户强制指定动画
   */
  if (props.animation !== 'auto') {
    return props.animation
  }

  /**
   * 不支持的 Emoji 默认 pop
   *
   * 正常情况下 SingleEmoji 只应该接收到支持的 Emoji。
   */
  return EMOJI_ANIMATION_MAP[emoji.value] ?? 'pop'
})

/**
 * CSS animation class
 */
const animationClass = computed(() => {
  if (!isAnimating.value || animationType.value === 'none') {
    return undefined
  }

  return `animation-${animationType.value}`
})

/**
 * Emoji 尺寸
 */
const emojiSize = computed(() => {
  if (typeof props.size === 'number') {
    return `${props.size}px`
  }

  return props.size
})

/**
 * Emoji 样式
 */
const emojiStyle = computed(() => ({
  fontSize: emojiSize.value,
  lineHeight: 1,
}))

/**
 * 容器样式
 *
 * 这里不设置固定宽高，
 * 让 Emoji 自然撑开。
 */
const containerStyle = computed(() => ({
  '--emoji-size': emojiSize.value,
}))

/**
 * 是否应该播放
 */
const canPlay = computed(() => {
  return (
    props.autoplay &&
    isSingleEmoji.value &&
    animationType.value !== 'none'
  )
})

/**
 * 停止动画
 */
function stop() {
  isAnimating.value = false
}

/**
 * 播放动画
 *
 * 通过：
 *
 * false
 * ↓
 * nextTick
 * ↓
 * 强制读取 offsetWidth
 * ↓
 * true
 *
 * 让同一个动画可以重复触发。
 */
async function play() {
  if (!canPlay.value) {
    return
  }

  /**
   * once 模式下已经播放过，就不再播放
   */
  if (props.once && hasPlayed.value) {
    return
  }

  /**
   * 先取消当前动画
   */
  isAnimating.value = false

  /**
   * 等待 DOM 更新
   */
  await nextTick()

  /**
   * 强制浏览器重新计算布局
   *
   * 解决：
   * 点击播放后 animation 不重新执行的问题。
   */
  if (emojiRef.value) {
    void emojiRef.value.offsetWidth
  }

  /**
   * 开始动画
   */
  isAnimating.value = true
  hasPlayed.value = true

  emit('play')
}

/**
 * 动画结束
 */
function handleAnimationEnd() {
  isAnimating.value = false

  emit('animationEnd')
  props.onAnimationEnd?.()
}

/**
 * 初始化 IntersectionObserver
 */
function setupObserver() {
  /**
   * 不需要进入视口播放
   */
  if (!props.playOnVisible) {
    void play()
    return
  }

  /**
   * SSR 环境
   */
  if (typeof window === 'undefined') {
    return
  }

  /**
   * 浏览器不支持 IntersectionObserver
   *
   * 直接播放，保证功能正常。
   */
  if (!('IntersectionObserver' in window)) {
    void play()
    return
  }

  if (!containerRef.value) {
    return
  }

  observer?.disconnect()

  observer = new IntersectionObserver(
    entries => {
      const entry = entries[0]

      if (!entry?.isIntersecting) {
        return
      }

      void play()

      /**
       * 只播放一次
       *
       * observer 可以直接断开，
       * 避免 Feed 长列表不断触发。
       */
      if (props.once) {
        observer?.disconnect()
        observer = null
      }
    },
    {
      threshold: props.threshold,
    },
  )

  observer.observe(containerRef.value)
}

/**
 * 重新初始化
 */
function resetObserver() {
  observer?.disconnect()
  observer = null

  hasPlayed.value = false
  isAnimating.value = false

  if (props.autoplay) {
    nextTick(() => {
      setupObserver()
    })
  }
}

/**
 * 内容变化
 *
 * 例如：
 *
 * 😂 → 😍
 *
 * 需要重新播放新 Emoji 的动画。
 */
watch(
  () => props.content,
  () => {
    resetObserver()
  },
)

/**
 * 动画类型变化
 *
 * 例如：
 *
 * animation="pop"
 * ↓
 * animation="heartbeat"
 */
watch(
  () => props.animation,
  () => {
    resetObserver()
  },
)

/**
 * autoplay 变化
 */
watch(
  () => props.autoplay,
  value => {
    if (value) {
      resetObserver()
    } else {
      stop()
      observer?.disconnect()
      observer = null
    }
  },
)

/**
 * 暴露给父组件
 *
 * 父组件可以：
 *
 * const emojiRef = ref()
 *
 * emojiRef.value?.play()
 */
defineExpose({
  play,
  stop,
  reset: resetObserver,
})

onMounted(() => {
  if (!props.autoplay) {
    return
  }

  /**
   * nextTick 确保 containerRef 已经挂载
   */
  nextTick(() => {
    setupObserver()
  })
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})
</script>

<style scoped>
.single-emoji {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  /**
   * Emoji 本身不应该影响文字布局
   */
  vertical-align: middle;

  /**
   * 防止动画过程中出现奇怪的文字选中
   */
  user-select: none;

  /**
   * Emoji 动画需要硬件加速
   */
  contain: layout paint;
}

.single-emoji__content {
  display: inline-block;

  /**
   * Emoji 默认字体表现
   */
  font-family:
    "Apple Color Emoji",
    "Segoe UI Emoji",
    "Noto Color Emoji",
    "Android Emoji",
    sans-serif;

  /**
   * 动画优化
   */
  transform-origin: center center;
  will-change: transform, opacity, filter;

  /**
   * 避免部分浏览器动画时出现闪烁
   */
  backface-visibility: hidden;

  /**
   * 让 Emoji 更像一个独立视觉元素
   */
  white-space: nowrap;
}

/* =========================================================
 * Pop
 * ========================================================= */

.animation-pop {
  animation: emoji-pop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes emoji-pop {
  0% {
    opacity: 0;
    transform: scale(0.2);
  }

  55% {
    opacity: 1;
    transform: scale(1.18);
  }

  75% {
    transform: scale(0.94);
  }

  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* =========================================================
 * Bounce
 * ========================================================= */

.animation-bounce {
  animation: emoji-bounce 0.9s ease;
}

@keyframes emoji-bounce {
  0%,
  100% {
    transform: translateY(0);
  }

  25% {
    transform: translateY(-18px);
  }

  45% {
    transform: translateY(0);
  }

  65% {
    transform: translateY(-8px);
  }

  80% {
    transform: translateY(0);
  }
}

/* =========================================================
 * Shake
 * ========================================================= */

.animation-shake {
  animation: emoji-shake 0.55s ease-in-out;
}

@keyframes emoji-shake {
  0%,
  100% {
    transform: translateX(0) rotate(0);
  }

  20% {
    transform: translateX(-8px) rotate(-5deg);
  }

  40% {
    transform: translateX(8px) rotate(5deg);
  }

  60% {
    transform: translateX(-6px) rotate(-4deg);
  }

  80% {
    transform: translateX(6px) rotate(4deg);
  }
}

/* =========================================================
 * Heartbeat
 * ========================================================= */

.animation-heartbeat {
  animation: emoji-heartbeat 1s ease-in-out;
}

@keyframes emoji-heartbeat {
  0%,
  100% {
    transform: scale(1);
  }

  15% {
    transform: scale(1.2);
  }

  30% {
    transform: scale(1);
  }

  45% {
    transform: scale(1.18);
  }

  60% {
    transform: scale(1);
  }
}

/* =========================================================
 * Pulse
 * ========================================================= */

.animation-pulse {
  animation: emoji-pulse 1s ease-in-out;
}

@keyframes emoji-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }

  50% {
    transform: scale(1.18);
    opacity: 0.78;
  }
}

/* =========================================================
 * Wave
 * ========================================================= */

.animation-wave {
  transform-origin: 70% 80%;
  animation: emoji-wave 0.9s ease-in-out;
}

@keyframes emoji-wave {
  0% {
    transform: rotate(0deg);
  }

  15% {
    transform: rotate(14deg);
  }

  30% {
    transform: rotate(-8deg);
  }

  45% {
    transform: rotate(14deg);
  }

  60% {
    transform: rotate(-6deg);
  }

  75% {
    transform: rotate(10deg);
  }

  100% {
    transform: rotate(0deg);
  }
}

/* =========================================================
 * Clap
 * ========================================================= */

.animation-clap {
  animation: emoji-clap 0.7s ease-in-out;
}

@keyframes emoji-clap {
  0%,
  100% {
    transform: scale(1);
  }

  25% {
    transform: scale(1.08) rotate(-4deg);
  }

  50% {
    transform: scale(0.92) rotate(4deg);
  }

  75% {
    transform: scale(1.08) rotate(-3deg);
  }
}

/* =========================================================
 * Laugh
 * ========================================================= */

.animation-laugh {
  animation: emoji-laugh 0.8s ease-in-out;
}

@keyframes emoji-laugh {
  0%,
  100% {
    transform: translateY(0) rotate(0);
  }

  20% {
    transform: translateY(-3px) rotate(-4deg);
  }

  40% {
    transform: translateY(2px) rotate(4deg);
  }

  60% {
    transform: translateY(-3px) rotate(-4deg);
  }

  80% {
    transform: translateY(2px) rotate(3deg);
  }
}

/* =========================================================
 * Sleep
 * ========================================================= */

.animation-sleep {
  animation: emoji-sleep 1.5s ease-in-out;
}

@keyframes emoji-sleep {
  0% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }

  50% {
    transform: translateY(4px) scale(0.96);
    opacity: 0.7;
  }

  100% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

/* =========================================================
 * Cry
 * ========================================================= */

.animation-cry {
  animation: emoji-cry 1s ease-in-out;
}

@keyframes emoji-cry {
  0%,
  100% {
    transform: translateY(0);
  }

  25% {
    transform: translateY(-3px);
  }

  50% {
    transform: translateY(3px);
  }

  75% {
    transform: translateY(-2px);
  }
}

/* =========================================================
 * Spin
 * ========================================================= */

.animation-spin {
  animation: emoji-spin 0.8s ease-in-out;
}

@keyframes emoji-spin {
  0% {
    transform: rotate(0deg) scale(0.8);
  }

  60% {
    transform: rotate(380deg) scale(1.1);
  }

  100% {
    transform: rotate(360deg) scale(1);
  }
}

/* =========================================================
 * Fire
 * ========================================================= */

.animation-fire {
  animation: emoji-fire 0.8s ease-in-out;
}

@keyframes emoji-fire {
  0%,
  100% {
    transform: scale(1) translateY(0);
  }

  25% {
    transform: scale(1.08, 1.15) translateY(-2px);
  }

  50% {
    transform: scale(0.96, 1.08) translateY(1px);
  }

  75% {
    transform: scale(1.06, 1.12) translateY(-2px);
  }
}

/* =========================================================
 * 无障碍：用户开启减少动画
 * ========================================================= */

@media (prefers-reduced-motion: reduce) {
  .single-emoji__content {
    animation: none !important;
    transition: none !important;
    transform: none !important;
  }
}
</style>