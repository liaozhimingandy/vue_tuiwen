<template>
  <!--
    正常状态的占位元素
    始终保持在正文原来的左侧位置
  -->
  <span
    ref="wrapperRef"
    class="single-emoji-wrapper"
  >
    <!-- 正常 Emoji -->
    <span
      class="single-emoji"
      :class="{ 'is-hidden': isAnimating }"
    >
      {{ emoji }}
    </span>
  </span>

  <!--
    动画层
    只有播放动画时才显示

    fixed/absolute 层会把 Emoji 放到父容器水平中心
  -->
  <span
    v-if="isAnimating"
    ref="animationLayerRef"
    class="single-emoji-animation-layer"
  >
    <span
      ref="emojiRef"
      class="single-emoji-animation"
      :class="animationClass"
      @animationend="handleAnimationEnd"
    >
      {{ emoji }}
    </span>
  </span>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'

import {
  EMOJI_ANIMATION_MAP,
  isSupportedSingleEmoji,
} from '@/common/emoji'

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
   * Emoji 内容
   */
  content: string

  /**
   * 动画类型
   */
  animation?: SingleEmojiAnimation

  /**
   * 是否自动播放
   */
  autoplay?: boolean

  /**
   * 是否只播放一次
   */
  once?: boolean

  /**
   * 是否进入可视区域后播放
   */
  playOnVisible?: boolean

  /**
   * 可视区域阈值
   */
  threshold?: number
}

const props = withDefaults(defineProps<Props>(), {
  animation: 'auto',
  autoplay: true,
  once: true,
  playOnVisible: true,
  threshold: 0.5,
})

const emit = defineEmits<{
  play: []
  animationEnd: []
}>()

/**
 * 正常状态占位元素
 */
const wrapperRef = ref<HTMLElement | null>(null)

/**
 * 动画 Emoji
 */
const emojiRef = ref<HTMLElement | null>(null)

/**
 * 动画层
 */
const animationLayerRef = ref<HTMLElement | null>(null)

/**
 * 是否正在动画
 */
const isAnimating = ref(false)

/**
 * 是否已经播放
 */
const hasPlayed = ref(false)

let observer: IntersectionObserver | null = null
let playFrame: number | null = null

/**
 * Emoji 内容
 */
const emoji = computed(() => {
  return props.content.trim()
})

/**
 * 是否为单个 Emoji
 */
const isSingleEmoji = computed(() => {
  return isSupportedSingleEmoji(emoji.value)
})

/**
 * 动画类型
 */
const animationType = computed<
  Exclude<SingleEmojiAnimation, 'auto'>
>(() => {
  if (props.animation !== 'auto') {
    return props.animation
  }

  return EMOJI_ANIMATION_MAP[emoji.value] ?? 'pop'
})

/**
 * 是否可以播放
 */
const canPlay = computed(() => {
  return (
    props.autoplay &&
    isSingleEmoji.value &&
    animationType.value !== 'none'
  )
})

/**
 * 动画 class
 */
const animationClass = computed(() => {
  if (!isAnimating.value) {
    return undefined
  }

  if (animationType.value === 'none') {
    return undefined
  }

  return `animation-${animationType.value}`
})

/**
 * 播放动画
 */
async function play() {
  if (!canPlay.value) {
    return
  }

  if (props.once && hasPlayed.value) {
    return
  }

  if (playFrame !== null) {
    cancelAnimationFrame(playFrame)
    playFrame = null
  }

  /**
   * 先启动动画层
   */
  isAnimating.value = true

  await nextTick()

  const element = emojiRef.value

  if (!element) {
    isAnimating.value = false
    return
  }

  /**
   * 强制重新计算布局
   */
  void element.offsetWidth

  /**
   * 下一帧开始 CSS animation
   */
  playFrame = requestAnimationFrame(() => {
    playFrame = null

    /**
     * 此时 animation class 已经存在
     */
    emit('play')
  })

  hasPlayed.value = true
}

/**
 * 停止
 */
function stop() {
  if (playFrame !== null) {
    cancelAnimationFrame(playFrame)
    playFrame = null
  }

  isAnimating.value = false
}

/**
 * 重置
 */
function reset() {
  stop()

  hasPlayed.value = false

  observer?.disconnect()
  observer = null

  nextTick(() => {
    setupObserver()
  })
}

/**
 * 动画结束
 */
function handleAnimationEnd(event: AnimationEvent) {
  if (event.target !== emojiRef.value) {
    return
  }

  /**
   * 关闭动画层
   *
   * 关闭以后：
   *
   * 动画 Emoji 消失
   *
   * 正常 Emoji 重新显示
   *
   * 因此会自动回到正文原来的左侧位置。
   */
  isAnimating.value = false

  emit('animationEnd')
}

/**
 * 创建 IntersectionObserver
 */
function setupObserver() {
  observer?.disconnect()
  observer = null

  if (!props.autoplay) {
    return
  }

  if (!isSingleEmoji.value) {
    return
  }

  /**
   * 不要求进入可视区域
   */
  if (!props.playOnVisible) {
    void play()
    return
  }

  if (typeof window === 'undefined') {
    return
  }

  /**
   * 不支持 IntersectionObserver
   */
  if (!('IntersectionObserver' in window)) {
    void play()
    return
  }

  const element = wrapperRef.value

  if (!element) {
    return
  }

  observer = new IntersectionObserver(
    entries => {
      const entry = entries[0]

      if (!entry?.isIntersecting) {
        return
      }

      void play()

      if (props.once) {
        observer?.disconnect()
        observer = null
      }
    },
    {
      threshold: props.threshold,
    },
  )

  observer.observe(element)
}

/**
 * 内容变化
 */
watch(
  () => props.content,
  () => {
    reset()
  },
)

/**
 * 动画变化
 */
watch(
  () => props.animation,
  () => {
    reset()
  },
)

/**
 * autoplay 变化
 */
watch(
  () => props.autoplay,
  value => {
    if (value) {
      reset()
      return
    }

    stop()

    observer?.disconnect()
    observer = null
  },
)

/**
 * 暴露方法
 */
defineExpose({
  play,
  stop,
  reset,
})

/**
 * mounted
 */
onMounted(() => {
  nextTick(() => {
    setupObserver()
  })
})

/**
 * unmounted
 */
onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null

  if (playFrame !== null) {
    cancelAnimationFrame(playFrame)
    playFrame = null
  }
})
</script>

<style scoped>
/* =========================================================
 * 正常状态占位
 * ========================================================= */

.single-emoji-wrapper {
  /*
   * 正常情况下仍然是 inline-block
   *
   * 所以 Emoji 会待在正文原来的位置
   */
  display: inline-block;

  /*
   * 正常字号 24px
   */
  font-size: 24px;

  line-height: 1.5;

  vertical-align: middle;
}


/* =========================================================
 * 正常 Emoji
 * ========================================================= */

.single-emoji {
  display: inline-block;

  font-size: 24px;
  line-height: 1.5;

  font-family:
    "Apple Color Emoji",
    "Segoe UI Emoji",
    "Noto Color Emoji",
    "Android Emoji",
    sans-serif;

  transform: scale(1);

  opacity: 1;

  white-space: nowrap;

  vertical-align: middle;
}

/*
 * 动画期间隐藏正常 Emoji
 *
 * 但是 wrapper 仍然保留，
 * 所以动画结束以后不会改变正文布局。
 */
.single-emoji.is-hidden {
  visibility: hidden;
}


/* =========================================================
 * 动画层
 * ========================================================= */

.single-emoji-animation-layer {
  /*
   * 关键：
   * 整个动画区域覆盖父容器
   */
  position: absolute;

  /*
   * 父容器需要 position: relative
   */
  inset: 0;

  /*
   * 水平居中
   */
  display: flex;

  align-items: center;

  justify-content: center;

  /*
   * 动画可以超出正常范围
   */
  overflow: visible;

  /*
   * 不影响鼠标事件
   */
  pointer-events: none;

  /*
   * 不改变正文布局
   */
  z-index: 10;
}


/* =========================================================
 * 动画 Emoji
 * ========================================================= */

.single-emoji-animation {
  display: inline-block;

  /*
   * 动画状态仍然以 24px 为基础
   */
  font-size: 24px;

  line-height: 1.5;

  font-family:
    "Apple Color Emoji",
    "Segoe UI Emoji",
    "Noto Color Emoji",
    "Android Emoji",
    sans-serif;

  /*
   * 从自身中心放大
   */
  transform-origin: center center;

  transform: scale(1);

  white-space: nowrap;

  vertical-align: middle;

  will-change: transform;

  backface-visibility: hidden;
}


/* =========================================================
 * POP
 * ========================================================= */

.animation-pop {
  animation: single-emoji-pop 3s ease-in-out both;
}

@keyframes single-emoji-pop {
  0% {
    transform: scale(1);
  }

  8% {
    transform: scale(2);
  }

  18% {
    transform: scale(4);
  }

  28% {
    transform: scale(4.8);
  }

  40% {
    transform: scale(4.2);
  }

  52% {
    transform: scale(4.6);
  }

  64% {
    transform: scale(4);
  }

  75% {
    transform: scale(3);
  }

  85% {
    transform: scale(2);
  }

  93% {
    transform: scale(1.3);
  }

  100% {
    transform: scale(1);
  }
}


/* =========================================================
 * BOUNCE
 * ========================================================= */

.animation-bounce {
  animation: single-emoji-bounce 3s ease-in-out both;
}

@keyframes single-emoji-bounce {
  0%,
  100% {
    transform: scale(1) translateY(0);
  }

  10% {
    transform: scale(3) translateY(-20px);
  }

  20% {
    transform: scale(4.8) translateY(-50px);
  }

  30% {
    transform: scale(5.2) translateY(-30px);
  }

  40% {
    transform: scale(4.6) translateY(0);
  }

  50% {
    transform: scale(3.8) translateY(-15px);
  }

  60% {
    transform: scale(3) translateY(0);
  }

  72% {
    transform: scale(2.2) translateY(-8px);
  }

  85% {
    transform: scale(1.5) translateY(0);
  }

  94% {
    transform: scale(1.15);
  }
}


/* =========================================================
 * SHAKE
 * ========================================================= */

.animation-shake {
  animation: single-emoji-shake 3s ease-in-out both;
}

@keyframes single-emoji-shake {
  0%,
  100% {
    transform: scale(1) rotate(0);
  }

  8% {
    transform: scale(4) rotate(-10deg);
  }

  16% {
    transform: scale(4.8) rotate(10deg);
  }

  24% {
    transform: scale(4.8) rotate(-10deg);
  }

  32% {
    transform: scale(4.8) rotate(10deg);
  }

  40% {
    transform: scale(4.6) rotate(-7deg);
  }

  48% {
    transform: scale(4.3) rotate(7deg);
  }

  58% {
    transform: scale(3.6) rotate(-5deg);
  }

  68% {
    transform: scale(2.8) rotate(5deg);
  }

  78% {
    transform: scale(2.1) rotate(-3deg);
  }

  88% {
    transform: scale(1.4) rotate(2deg);
  }

  96% {
    transform: scale(1.1) rotate(0);
  }
}


/* =========================================================
 * HEARTBEAT
 * ========================================================= */

.animation-heartbeat {
  animation: single-emoji-heartbeat 3s ease-in-out both;
}

@keyframes single-emoji-heartbeat {
  0%,
  100% {
    transform: scale(1);
  }

  12% {
    transform: scale(4);
  }

  20% {
    transform: scale(4.8);
  }

  28% {
    transform: scale(4.2);
  }

  40% {
    transform: scale(4.8);
  }

  52% {
    transform: scale(4);
  }

  65% {
    transform: scale(3.2);
  }

  78% {
    transform: scale(2.4);
  }

  90% {
    transform: scale(1.5);
  }
}


/* =========================================================
 * PULSE
 * ========================================================= */

.animation-pulse {
  animation: single-emoji-pulse 3s ease-in-out both;
}

@keyframes single-emoji-pulse {
  0%,
  100% {
    transform: scale(1);
  }

  20% {
    transform: scale(4.6);
  }

  40% {
    transform: scale(3.8);
  }

  60% {
    transform: scale(4.6);
  }

  80% {
    transform: scale(2.4);
  }
}


/* =========================================================
 * WAVE
 * ========================================================= */

.animation-wave {
  animation: single-emoji-wave 3s ease-in-out both;
}

@keyframes single-emoji-wave {
  0%,
  100% {
    transform: scale(1) rotate(0);
  }

  15% {
    transform: scale(4) rotate(-15deg);
  }

  30% {
    transform: scale(4.8) rotate(15deg);
  }

  45% {
    transform: scale(4.8) rotate(-15deg);
  }

  60% {
    transform: scale(4.3) rotate(12deg);
  }

  72% {
    transform: scale(3.3) rotate(-8deg);
  }

  84% {
    transform: scale(2.1) rotate(5deg);
  }

  94% {
    transform: scale(1.3) rotate(0);
  }
}


/* =========================================================
 * CLAP
 * ========================================================= */

.animation-clap {
  animation: single-emoji-clap 3s ease-in-out both;
}

@keyframes single-emoji-clap {
  0%,
  100% {
    transform: scale(1);
  }

  10% {
    transform: scale(3.8);
  }

  20% {
    transform: scale(4.8);
  }

  30% {
    transform: scale(3.8);
  }

  40% {
    transform: scale(4.8);
  }

  50% {
    transform: scale(3.8);
  }

  65% {
    transform: scale(4.3);
  }

  78% {
    transform: scale(2.8);
  }

  90% {
    transform: scale(1.5);
  }
}


/* =========================================================
 * LAUGH
 * ========================================================= */

.animation-laugh {
  animation: single-emoji-laugh 3s ease-in-out both;
}

@keyframes single-emoji-laugh {
  0%,
  100% {
    transform: scale(1) rotate(0);
  }

  12% {
    transform: scale(3.8) rotate(-5deg);
  }

  24% {
    transform: scale(4.8) rotate(5deg);
  }

  36% {
    transform: scale(4.3) rotate(-5deg);
  }

  48% {
    transform: scale(4.8) rotate(5deg);
  }

  62% {
    transform: scale(3.8) rotate(-4deg);
  }

  76% {
    transform: scale(2.7) rotate(3deg);
  }

  90% {
    transform: scale(1.5) rotate(0);
  }
}


/* =========================================================
 * SLEEP
 * ========================================================= */

.animation-sleep {
  animation: single-emoji-sleep 3s ease-in-out both;
}

@keyframes single-emoji-sleep {
  0% {
    transform: scale(1) translateY(0);
  }

  15% {
    transform: scale(3.8);
  }

  30% {
    transform: scale(4.8);
  }

  45% {
    transform: scale(4.3) translateY(-8px);
  }

  60% {
    transform: scale(3.8) translateY(5px);
  }

  75% {
    transform: scale(2.8) translateY(-5px);
  }

  88% {
    transform: scale(1.8);
  }

  96% {
    transform: scale(1.15);
  }

  100% {
    transform: scale(1) translateY(0);
  }
}


/* =========================================================
 * CRY
 * ========================================================= */

.animation-cry {
  animation: single-emoji-cry 3s ease-in-out both;
}

@keyframes single-emoji-cry {
  0%,
  100% {
    transform: scale(1) translateY(0);
  }

  10% {
    transform: scale(4.2);
  }

  20% {
    transform: scale(4.8) translateY(5px);
  }

  30% {
    transform: scale(4.8) translateY(-5px);
  }

  40% {
    transform: scale(4.8) translateY(5px);
  }

  50% {
    transform: scale(4.6) translateY(-5px);
  }

  60% {
    transform: scale(4) translateY(5px);
  }

  72% {
    transform: scale(3) translateY(-3px);
  }

  84% {
    transform: scale(2.1);
  }

  94% {
    transform: scale(1.3);
  }
}


/* =========================================================
 * SPIN
 * ========================================================= */

.animation-spin {
  animation: single-emoji-spin 3s ease-in-out both;
}

@keyframes single-emoji-spin {
  0% {
    transform: scale(1) rotate(0deg);
  }

  15% {
    transform: scale(3.8) rotate(90deg);
  }

  30% {
    transform: scale(4.8) rotate(180deg);
  }

  45% {
    transform: scale(4.8) rotate(270deg);
  }

  60% {
    transform: scale(4.3) rotate(360deg);
  }

  75% {
    transform: scale(2.8) rotate(450deg);
  }

  88% {
    transform: scale(1.8) rotate(540deg);
  }

  96% {
    transform: scale(1.15) rotate(600deg);
  }

  100% {
    transform: scale(1) rotate(720deg);
  }
}


/* =========================================================
 * FIRE
 * ========================================================= */

.animation-fire {
  animation: single-emoji-fire 3s ease-in-out both;
}

@keyframes single-emoji-fire {
  0%,
  100% {
    transform: scale(1);
  }

  10% {
    transform: scale(3.8);
  }

  20% {
    transform: scale(4.8);
  }

  30% {
    transform: scale(4.3);
  }

  40% {
    transform: scale(5);
  }

  50% {
    transform: scale(4.6);
  }

  60% {
    transform: scale(5);
  }

  70% {
    transform: scale(3.8);
  }

  80% {
    transform: scale(2.8);
  }

  90% {
    transform: scale(1.8);
  }

  96% {
    transform: scale(1.2);
  }
}
</style>