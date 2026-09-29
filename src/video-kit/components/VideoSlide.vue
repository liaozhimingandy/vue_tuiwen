<script setup lang="ts">
/**
 * 单屏视频视图
 *
 * 职责：
 * 1. 提供播放器挂载容器 `.player-host`（PlayerPool 的槽位 DOM，
 *    通过 defineExpose 暴露给 VideoFeed，由 Pool 在其中惰性创建 video.js 实例）
 * 2. 渲染覆盖层：信息面板（标题/作者/描述）、加载态、静音降级提示、点赞动效
 *
 * 注意：本组件不创建任何播放器——「3 实例复用」由 PlayerPool 统一调度，
 * 非当前位的 slide 同样挂载着真实播放器（预加载中）。
 */
import {computed, onBeforeUnmount, onMounted, ref} from "vue";
import type {VideoInfo} from "@/video-kit/types";
import {getOrientation} from "@/video-kit/core/orientation";
import VideoSideBar from "@/video-kit/components/VideoSideBar.vue";

const props = defineProps<{
    /** 绑定的视频（非当前位也可能是预加载中的邻居） */
    video: VideoInfo | null;
    /** 是否为当前播放位 */
    active: boolean;
    /** 画面填充方式 */
    fit: "cover" | "contain";
    /** 已点赞 */
    liked: boolean;
    /** 是否静音（用于侧边栏图标与提示） */
    muted: boolean;
    /** 当前音量（0~1） */
    volume: number;
    /** 自动播放被降级为静音（提示用户点按开声） */
    showUnmuteHint: boolean;
    /** 是否正在缓冲 */
    buffering: boolean;
    /** 是否显示横屏按钮 */
    showRotate: boolean;
    /** 点击切换播放/暂停 */
    paused: boolean;
    /**
     * 布局变体：
     * - fullscreen：抖音式，侧边栏/信息覆盖在视频上，视频铺满屏幕
     * - shorts：YouTube Shorts 式，视频按横竖屏自适应尺寸居中，
     *   互动栏和信息由父组件（VideoFeed）放在视频外
     */
    variant?: "fullscreen" | "shorts";
}>();

const emit = defineEmits<{
    like: [];
    comments: [];
    share: [];
    toggleMute: [];
    setVolume: [v: number];
    togglePlay: [];
}>();

/** 布局变体（默认抖音式全屏） */
const variant = computed(() => props.variant ?? "fullscreen");

/** 播放器挂载点，VideoFeed 通过 ref 收集后交给 PlayerPool.mount */
const playerHost = ref<HTMLElement | null>(null);

/** 组件根节点（横屏全屏的目标元素） */
const rootEl = ref<HTMLElement | null>(null);

/** 横屏旋转状态：进入全屏后手动旋转 90 度 */
const rotated = ref(false);

/** 当前屏幕是否为竖持（决定是否需要旋转铺满） */
const screenPortrait = ref(true);
function updateScreenPortrait() {
    screenPortrait.value = window.innerHeight >= window.innerWidth;
}
function onFullscreenChange() {
    // 退出全屏时复位旋转
    if (!document.fullscreenElement) {
        rotated.value = false;
    }
}
onMounted(() => {
    updateScreenPortrait();
    window.addEventListener("resize", updateScreenPortrait);
    document.addEventListener("fullscreenchange", onFullscreenChange);
});
onBeforeUnmount(() => {
    window.removeEventListener("resize", updateScreenPortrait);
    document.removeEventListener("fullscreenchange", onFullscreenChange);
    if (document.fullscreenElement) {
        void document.exitFullscreen().catch(() => {});
    }
});

/**
 * 横屏按钮：未全屏 → 请求全屏并旋转；
 * 已全屏 → 切换旋转/恢复；再点视频区或退出全屏自动复位。
 */
function onRotate() {
    if (!document.fullscreenElement) {
        rootEl.value
            ?.requestFullscreen()
            .then(() => {
                rotated.value = true;
            })
            .catch(() => {
                // 全屏被拒绝（如 iframe 未授权），退化为仅旋转
                rotated.value = !rotated.value;
            });
    } else {
        rotated.value = !rotated.value;
    }
}

defineExpose({
    /** PlayerPool 槽位挂载点 */
    playerHost,
});

const orientation = computed(() => (props.video ? getOrientation(props.video) : "portrait"));

/** 横屏视频才展示「横屏」按钮 */
const showRotate = computed(() => props.showRotate && orientation.value === "landscape");

/** 画面是否需要旋转铺满（全屏 + 横屏视频 + 竖持屏幕） */
const hostRotate = computed(() => rotated.value && screenPortrait.value && orientation.value === "landscape");

function onSurfaceTap() {
    emit("togglePlay");
}
</script>

<template>
    <div ref="rootEl" class="video-slide" :class="`v-${variant}`" :data-orientation="orientation">
        <!-- 播放器挂载点（video.js 实例由 PlayerPool 注入） -->
        <div ref="playerHost" class="player-host" :class="[`fit-${fit}`, {'host-rotate': hostRotate}]"></div>

        <!-- 点击热区（不遮挡侧边栏） -->
        <div class="tap-surface" @click.stop="onSurfaceTap"></div>

        <!-- 顶部渐变遮罩：保证白色文字可读 -->
        <div class="shade shade-top"></div>
        <div class="shade shade-bottom"></div>

        <!-- 暂停指示 -->
        <div v-if="active && paused" class="pause-badge" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </div>

        <!-- 缓冲中 -->
        <div v-if="active && buffering" class="spinner" aria-label="加载中"></div>

        <!-- 自动播放降级提示 -->
        <button v-if="active && showUnmuteHint" class="unmute-hint" @click.stop="emit('toggleMute')">
            🔇 点击开启声音
        </button>

        <!-- 信息面板（shorts 变体由父组件放到视频下方） -->
        <div v-if="video && variant === 'fullscreen'" class="info-panel">
            <div class="author">@{{ video.author?.username ?? "未知用户" }}</div>
            <div class="title">{{ video.title }}</div>
            <div v-if="video.description" class="desc">{{ video.description }}</div>
        </div>

        <!-- 侧边操作栏（shorts 变体由父组件放到视频外右侧） -->
        <div v-if="video && variant === 'fullscreen'" class="sidebar-overlay">
            <VideoSideBar
                :video="video"
                :liked="liked"
                :muted="muted"
                :volume="volume"
                :show-rotate="showRotate"
                @like="emit('like')"
                @comments="emit('comments')"
                @share="emit('share')"
                @toggle-mute="emit('toggleMute')"
                @set-volume="(v) => emit('setVolume', v)"
                @rotate="onRotate"
            />
        </div>
    </div>
</template>

<style scoped>
.video-slide {
    position: absolute;
    inset: 0;
    overflow: hidden;
    background: #000;
}

/* shorts 变体：尺寸由 VideoFeed 通过 --stage-w/--stage-h 按横竖屏算好，
   单元格 flex 居中，视频像 Shorts 一样悬浮在页面中央 */
.video-slide.v-shorts {
    position: relative;
    inset: auto;
    width: var(--stage-w, 360px);
    height: var(--stage-h, 640px);
    border-radius: 14px;
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.6);
}

/* 手机端视频铺满全屏：去掉圆角和阴影，做成沉浸式 */
@media (max-width: 768px) {
    .video-slide.v-shorts {
        border-radius: 0;
        box-shadow: none;
    }
}

.sidebar-overlay {
    position: absolute;
    right: 8px;
    bottom: 110px;
    z-index: 20;
}

.player-host {
    position: absolute;
    inset: 0;
}

/* ⚠️ video.js 包裹层 .video-js 在 video-js.css 里是 inline-block 且无尺寸，
   不撑满挂载点的话视频会按原始分辨率渲染、溢出裁切成局部画面 */
.player-host :deep(.video-js) {
    width: 100%;
    height: 100%;
    display: block;
}

/* 双保险：tech 元素直接锁死在挂载点（绝对定位的包含块就是 .player-host） */
.player-host :deep(.vjs-tech) {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
}

.player-host :deep(video) {
    width: 100%;
    height: 100%;
    display: block;
}

/* 画面填充：cover 裁切铺满（抖音默认），contain 完整显示留黑边 */
.player-host.fit-cover :deep(video) {
    object-fit: cover;
}

.player-host.fit-contain :deep(video) {
    object-fit: contain;
}

/* 横屏全屏旋转：全屏 + 竖持设备时，把画面转 90 度铺满 */
.video-slide:fullscreen {
    background: #000;
}

.video-slide:fullscreen .player-host.host-rotate {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100vh;
    height: 100vw;
    transform: translate(-50%, -50%) rotate(90deg);
}

.tap-surface {
    position: absolute;
    inset: 0;
    z-index: 10;
}

.shade {
    position: absolute;
    left: 0;
    right: 0;
    height: 120px;
    pointer-events: none;
    z-index: 11;
}

.shade-top {
    top: 0;
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.45), transparent);
}

.shade-bottom {
    bottom: 0;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.5), transparent);
}

.pause-badge {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 15;
    pointer-events: none;
}

.pause-badge svg {
    width: 40px;
    height: 40px;
    fill: rgba(255, 255, 255, 0.9);
}

.spinner {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 42px;
    height: 42px;
    margin: -21px 0 0 -21px;
    border: 3px solid rgba(255, 255, 255, 0.25);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    z-index: 15;
    pointer-events: none;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.unmute-hint {
    position: absolute;
    top: 76px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 20;
    background: rgba(0, 0, 0, 0.6);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 999px;
    padding: 7px 16px;
    font-size: 13px;
    cursor: pointer;
    backdrop-filter: blur(4px);
}

.info-panel {
    position: absolute;
    left: 14px;
    right: 84px;
    bottom: 34px;
    z-index: 20;
    color: #fff;
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
    pointer-events: none;
}

.author {
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 6px;
}

.title {
    font-size: 14px;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.desc {
    font-size: 12px;
    opacity: 0.8;
    margin-top: 4px;
    display: -webkit-box;
    -webkit-line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
}
</style>
