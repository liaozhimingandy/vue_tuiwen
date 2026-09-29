<script setup lang="ts">
/**
 * 视频侧边操作栏（抖音式右侧悬浮栏）
 *
 * 提供：作者头像、点赞、评论入口、分享、静音开关、横屏（全屏）按钮。
 * 纯展示组件：所有点击通过 emit 抛给 VideoFeed 统一处理，不持有播放逻辑。
 */
import {onBeforeUnmount, ref} from "vue";
import type {VideoInfo} from "@/video-kit/types";

const props = defineProps<{
    video: VideoInfo;
    liked: boolean;
    muted: boolean;
    /** 当前音量（0~1），由 useVideoFeed 统一管理 */
    volume: number;
    showRotate: boolean;
}>();

const emit = defineEmits<{
    like: [];
    comments: [];
    share: [];
    toggleMute: [];
    /** 拖动音量条 */
    setVolume: [v: number];
    rotate: [];
}>();

// ---------- 音量条拖动（竖向，指针事件统一触摸/鼠标） ----------
const volumeRailRef = ref<HTMLElement | null>(null);
let volumeDragging = false;

/** 悬浮面板显隐：悬停/点击出现，调节完成或移开后自动隐藏 */
const panelOpen = ref(false);
let hideTimer: ReturnType<typeof setTimeout> | undefined;

function openPanel() {
    panelOpen.value = true;
    if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = undefined;
    }
}

function scheduleHide(delay = 800) {
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
        panelOpen.value = false;
        hideTimer = undefined;
    }, delay);
}

function onVolumeEnter() {
    // 鼠标靠近即显示（桌面端）
    openPanel();
}

function onVolumeLeave() {
    if (!volumeDragging) {
        scheduleHide(250);
    }
}

function onMuteClick() {
    emit("toggleMute");
    // 点击图标时展示音量条（移动端没有 hover，靠点击唤出）
    openPanel();
    scheduleHide(1600);
}

function volumeRatioFromEvent(e: PointerEvent): number {
    // 按内部轨道条计算比例（外层胶囊含内边距）
    const el = volumeRailRef.value;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    if (rect.height <= 0) return 0;
    return Math.min(1, Math.max(0, (rect.bottom - e.clientY) / rect.height));
}

function onVolumeMove(e: PointerEvent) {
    if (volumeDragging) {
        openPanel(); // 拖动期间保持显示
        emit("setVolume", volumeRatioFromEvent(e));
    }
}

function onVolumeUp() {
    volumeDragging = false;
    window.removeEventListener("pointermove", onVolumeMove);
    window.removeEventListener("pointerup", onVolumeUp);
    scheduleHide(700); // 调节完成后自动隐藏
}

function onVolumeStart(e: PointerEvent) {
    volumeDragging = true;
    openPanel();
    emit("setVolume", volumeRatioFromEvent(e));
    window.addEventListener("pointermove", onVolumeMove);
    window.addEventListener("pointerup", onVolumeUp);
}

onBeforeUnmount(() => {
    if (hideTimer) clearTimeout(hideTimer);
    window.removeEventListener("pointermove", onVolumeMove);
    window.removeEventListener("pointerup", onVolumeUp);
});

/** 点赞数展示：万位缩写 */
function formatCount(n: number): string {
    if (n >= 10000) return `${(n / 10000).toFixed(1)}w`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
}

const likeCount = () => formatCount(props.video.stats?.likes ?? 0) ;
</script>

<template>
    <div class="side-bar">
        <!-- 作者头像 -->
        <div class="avatar-wrap">
            <img v-if="video.author?.avatar" class="avatar" :src="video.author.avatar" alt="avatar"/>
            <div v-else class="avatar avatar-fallback">{{ (video.author?.username ?? "U").slice(0, 1).toUpperCase() }}</div>
            <span class="follow">＋</span>
        </div>

        <!-- 点赞 -->
        <button class="action" :class="{liked}" @click.stop="emit('like')" aria-label="点赞">
            <svg viewBox="0 0 24 24" class="icon heart">
                <path
                    d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <span class="count">{{ likeCount() }}</span>
        </button>

        <!-- 评论入口 -->
        <button class="action" @click.stop="emit('comments')" aria-label="评论">
            <svg viewBox="0 0 24 24" class="icon">
                <path
                    d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
            </svg>
            <span class="count">{{ formatCount(video.stats?.comments ?? 0) }}</span>
        </button>

        <!-- 分享 -->
        <button class="action" @click.stop="emit('share')" aria-label="分享">
            <svg viewBox="0 0 24 24" class="icon">
                <path
                    d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
            </svg>
            <span class="count">{{ formatCount(video.stats?.shares ?? 0) }}</span>
        </button>

        <!-- 音量调节：悬浮音量条（悬停/点击出现，不占布局空间） + 静音开关 -->
        <div
            class="volume-control"
            :class="{open: panelOpen}"
            @mouseenter="onVolumeEnter"
            @mouseleave="onVolumeLeave"
        >
            <div
                class="volume-track"
                @pointerdown="onVolumeStart"
                :aria-label="`音量 ${Math.round(volume * 100)}%`"
            >
                <div ref="volumeRailRef" class="volume-rail">
                    <div class="volume-fill" :style="{height: `${volume * 100}%`}"></div>
                </div>
            </div>

            <button class="action" @click.stop="onMuteClick" :aria-label="muted ? '开启声音' : '静音'">
                <svg v-if="muted" viewBox="0 0 24 24" class="icon">
                    <path
                        d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                </svg>
                <svg v-else viewBox="0 0 24 24" class="icon">
                    <path
                        d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
                <span class="count">{{ muted ? "静音" : "有声" }}</span>
            </button>
        </div>

        <!-- 横屏按钮：仅横屏视频显示 -->
        <button v-if="showRotate" class="action" @click.stop="emit('rotate')" aria-label="横屏播放">
            <svg viewBox="0 0 24 24" class="icon">
                <path
                    d="M16.48 2.52c3.27 1.55 5.61 4.72 5.97 8.48h1.5C23.44 4.84 18.29 0 12 0l-.66.03 3.81 3.81 1.33-1.32zm-6.25-.77c-.59-.59-1.54-.59-2.12 0L1.75 8.11c-.59.59-.59 1.54 0 2.12l12.02 12.02c.59.59 1.54.59 2.12 0l6.36-6.36c.59-.59.59-1.54 0-2.12L10.23 1.75zm4.6 19.44L2.81 9.17l6.36-6.36 12.02 12.02-6.36 6.36zm-7.31.29C4.25 19.94 1.91 16.76 1.55 13H.05C.56 19.16 5.71 24 12 24l.66-.03-3.81-3.81-1.33 1.32z"/>
            </svg>
            <span class="count">横屏</span>
        </button>
    </div>
</template>

<style scoped>
/* 定位中立：由使用方决定放在视频内(抖音式)还是视频外右侧(Shorts式) */
.side-bar {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 18px;
}

.avatar-wrap {
    position: relative;
    margin-bottom: 6px;
}

.avatar {
    width: 46px;
    height: 46px;
    border-radius: 50%;
    border: 2px solid #fff;
    object-fit: cover;
    display: block;
}

.avatar-fallback {
    background: linear-gradient(135deg, #fe2c55, #7b5cff);
    color: #fff;
    font-size: 20px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
}

.follow {
    position: absolute;
    left: 50%;
    bottom: -9px;
    transform: translateX(-50%);
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #fe2c55;
    color: #fff;
    font-size: 13px;
    line-height: 18px;
    text-align: center;
    font-weight: 700;
}

.action {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0;
}

.icon {
    width: 32px;
    height: 32px;
    fill: #fff;
    filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.5));
    transition: transform 0.15s ease, fill 0.2s ease;
}

.action:active .icon {
    transform: scale(1.25);
}

.heart {
    fill: #fff;
}

.liked .heart {
    fill: #fe2c55;
    animation: heart-pop 0.35s ease;
}

@keyframes heart-pop {
    0% {
        transform: scale(1);
    }
    40% {
        transform: scale(1.45);
    }
    100% {
        transform: scale(1);
    }
}

.count {
    color: #fff;
    font-size: 12px;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
    user-select: none;
}

/* ---------- 音量调节（悬浮式） ----------
   外层胶囊带半透明深色背景（视频上清晰可辨），
   内部轨道条承载填充；线条颜色用 --vk-volume-color（回退进度条颜色，再回退白色） */
.volume-control {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
}

.volume-track {
    position: absolute;
    bottom: calc(100% + 10px); /* 悬浮在静音按钮上方 */
    left: 50%;
    transform: translateX(-50%);
    z-index: 60; /* 悬浮最前端 */
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 86px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.45); /* 半透明背景色 */
    cursor: pointer;
    touch-action: none;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition: opacity 0.18s ease;
}

/* 悬停靠近 或 点击唤出（.open）时显示 */
.volume-control:hover .volume-track,
.volume-control.open .volume-track {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
}

/* 加宽触摸热区 */
.volume-track::after {
    content: "";
    position: absolute;
    top: -8px;
    bottom: -8px;
    left: -12px;
    right: -12px;
}

/* 内部轨道条：30% 透明度的主题色作底 */
.volume-rail {
    position: relative;
    width: 4px;
    height: 70px;
    border-radius: 2px;
    background: color-mix(in srgb, var(--vk-volume-color, var(--vk-progress-color, #fff)) 30%, transparent);
}

.volume-fill {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 2px;
    background: var(--vk-volume-color, var(--vk-progress-color, #fff));
    pointer-events: none;
}
</style>
