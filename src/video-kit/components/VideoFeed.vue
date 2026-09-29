<script setup lang="ts">
/**
 * 视频信息流主组件（抖音式全屏上下滑）
 *
 * 架构总览：
 * ┌ VideoFeed（本组件：手势 / 槽位排布 / 分页调度 / 页面暂停）
 * │   ├─ 3 个固定槽位（VideoSlide），按 rel ∈ {-1,0,1} 绝对定位
 * │   ├─ PlayerPool（3 个 video.js 实例，feed 下标 % 3 静态绑定槽位）
 * │   └─ useVideoFeed（虚拟分页 / 网络策略 / 统计 / 状态机）
 *
 * 上下滑：touch 手势 + 滚轮 + 键盘方向键三种输入统一走 goTo()
 * 虚拟页面：本地只持有已拉取页；DOM 永远只有 3 个槽位，无限列表零压力
 */
import {computed, nextTick, onBeforeUnmount, onDeactivated, onMounted, ref} from "vue";
import "video.js/dist/video-js.css";
import type {VideoInfo} from "@/video-kit/types";
import {useVideoFeed} from "@/video-kit/composables/useVideoFeed";
import {usePageVisibility} from "@/video-kit/composables/usePageVisibility";
import VideoSlide from "@/video-kit/components/VideoSlide.vue";
import VideoSideBar from "@/video-kit/components/VideoSideBar.vue";
import VideoCommentsDrawer from "@/video-kit/components/VideoCommentsDrawer.vue";
import type {StatsReporter} from "@/video-kit/core/stats";

const props = defineProps<{
    /** 分页数据源（返回空数组表示没有更多） */
    fetchPage: (page: number) => Promise<VideoInfo[]>;
    /** 每页条数 */
    pageSize?: number;
    /** 画面填充方式，默认 cover（抖音式裁切铺满） */
    fit?: "cover" | "contain";
    /** 自定义埋点上报器 */
    statsReporter?: StatsReporter;
    /**
     * 布局变体：
     * - fullscreen：抖音式全屏，互动栏覆盖在视频上（默认）
     * - shorts：YouTube Shorts 式，视频按横竖屏自适应尺寸居中，
     *   互动栏在视频外右侧、标题作者在视频下方
     */
    variant?: "fullscreen" | "shorts";
}>();

const feed = useVideoFeed({
    fetchPage: props.fetchPage,
    pageSize: props.pageSize,
    playerOptions: {fit: props.fit ?? "cover"},
    statsReporter: props.statsReporter,
});

/** 布局变体 */
const isShorts = computed(() => (props.variant ?? "fullscreen") === "shorts");

// ---------- Shorts：舞台尺寸自适应（横竖屏自动切换） ----------
const rootRef = ref<HTMLElement | null>(null);
const areaSize = ref({w: window.innerWidth, h: window.innerHeight});
let resizeObserver: ResizeObserver | null = null;

/** 当前视频宽高比（宽/高），缺元数据时按手机竖屏 9:16 */
const activeAspect = computed(() => {
    const v = feed.currentVideo.value;
    if (!v?.width || !v?.height) return 9 / 16;
    return v.width / v.height;
});

/**
 * 手机设备判定（与 CSS 的 @media 断点保持一致）
 * 手机上屏幕窄，视频右侧没有空间放互动栏，
 * 交互层改为浮在视频上层（抖音/Shorts 手机端体验）
 */
const MOBILE_BREAKPOINT = 768;
const isMobile = computed(() => areaSize.value.w <= MOBILE_BREAKPOINT);

/**
 * 舞台尺寸：
 * - 手机：竖屏视频铺满整个视口（cover 裁切，抖音式全屏沉浸），
 *   横屏视频按屏幕宽度铺开（自动转横屏状态）
 * - 桌面（shorts）：竖屏=手机屏幕大小居中悬浮；横屏=横向铺开
 * 尺寸变化同时驱动视频框、外侧互动栏、底部标题的定位（CSS 变量）
 */
const stage = computed(() => {
    const aspect = activeAspect.value;

    // 手机：互动层覆盖在视频上，视频本身尽量铺满
    if (isMobile.value) {
        if (aspect < 1) {
            // 竖屏：全屏铺满（object-fit: cover 裁切两侧）
            return {w: areaSize.value.w, h: areaSize.value.h};
        }
        // 横屏：宽度铺满，高度按比例；超高则收缩留黑边
        let w = areaSize.value.w;
        let h = w / aspect;
        if (h > areaSize.value.h) {
            h = areaSize.value.h;
            w = h * aspect;
        }
        return {w: Math.round(w), h: Math.round(h)};
    }

    const padX = 24;
    const padTop = 24;
    const padBottom = 110; // 底部要留标题位置
    const railSpace = 96; // 右侧留给互动栏
    const availW = Math.max(200, areaSize.value.w - padX * 2 - railSpace);
    const availH = Math.max(200, areaSize.value.h - padTop - padBottom);

    if (aspect < 1) {
        // 竖屏：高度贴满，宽度像手机（上限 460px）
        let h = availH;
        let w = h * aspect;
        const maxW = Math.min(460, availW);
        if (w > maxW) {
            w = maxW;
            h = w / aspect;
        }
        return {w: Math.round(w), h: Math.round(h)};
    }
    // 横屏 / 方形：宽度铺满可用区，高度按比例，超出则收缩
    let w = availW;
    let h = w / aspect;
    if (h > availH) {
        h = availH;
        w = h * aspect;
    }
    return {w: Math.round(w), h: Math.round(h)};
});

const rootStyle = computed(() => {
    if (!isShorts.value) return {};
    return {
        "--stage-w": `${stage.value.w}px`,
        "--stage-h": `${stage.value.h}px`,
    };
});

// ---------- 槽位排布 ----------
/**
 * 3 个槽位与 feed 下标的映射：
 *   slot s 承载所有满足 i % 3 === s 的视频；
 *   相对位置 rel = (s - currentIndex % 3) 归一化到 {-1, 0, 1}。
 *   rel 超出窗口的视频不渲染（槽位仍存在，播放器实例待复用）。
 */
interface SlotView {
    slot: number;
    /** 相对当前位的偏移：-1 上一个 / 0 当前 / 1 下一个 */
    rel: number;
    feedIndex: number;
    video: VideoInfo | null;
}

const slotViews = computed<SlotView[]>(() => {
    const c = feed.currentIndex.value;
    const sc = ((c % 3) + 3) % 3;
    const total = feed.videos.value.length;
    return [0, 1, 2].map((slot) => {
        let rel = slot - sc;
        if (rel > 1) rel -= 3;
        if (rel < -1) rel += 3;
        const feedIndex = c + rel;
        const valid = feedIndex >= 0 && feedIndex < total;
        return {
            slot,
            rel,
            feedIndex,
            video: valid ? feed.videos.value[feedIndex] ?? null : null,
        };
    });
});

// ---------- 槽位 DOM 收集与 Pool 挂载 ----------
const slideRefs = ref<InstanceType<typeof VideoSlide>[]>([]);

function setSlideRef(slot: number, el: unknown) {
    if (el) {
        slideRefs.value[slot] = el as InstanceType<typeof VideoSlide>;
    }
}

onMounted(async () => {
    await nextTick();
    // shorts 变体：监听容器尺寸，驱动舞台自适应
    if (rootRef.value && typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver((entries) => {
            const rect = entries[0]?.contentRect;
            if (rect) {
                areaSize.value = {w: rect.width, h: rect.height};
            }
        });
        resizeObserver.observe(rootRef.value);
    }
    // 把 3 个槽位的挂载点交给 PlayerPool（惰性创建 video.js 实例）
    slideRefs.value.forEach((slide, slot) => {
        if (slide?.playerHost) {
            feed.mountSlot(slot, slide.playerHost);
        }
    });
    // 若数据先于挂载就绪，这里补一次调度
    if (feed.initialized.value) {
        feed.pool.loadAround(feed.currentIndex.value, feed.videos.value, true);
    } else {
        void feed.loadMore();
    }
});

// ---------- 上下滑手势 ----------
const SWIPE_THRESHOLD = 60; // 有效滑动距离（px）
const dragging = ref(false);
const dragOffset = ref(0);
let startY = 0;

function onTouchStart(e: TouchEvent) {
    if (e.touches.length !== 1) return;
    dragging.value = true;
    startY = e.touches[0]!.clientY;
}

function onTouchMove(e: TouchEvent) {
    if (!dragging.value) return;
    const delta = startY - e.touches[0]!.clientY;
    // 顶部/底部边界阻尼
    if ((delta < 0 && !feed.hasPrev.value) || (delta > 0 && !feed.hasNext.value)) {
        dragOffset.value = delta * 0.25;
    } else {
        dragOffset.value = delta;
    }
}

function onTouchEnd() {
    if (!dragging.value) return;
    dragging.value = false;
    const offset = dragOffset.value;
    dragOffset.value = 0;
    if (offset > SWIPE_THRESHOLD && feed.hasNext.value) {
        feed.goNext();
    } else if (offset < -SWIPE_THRESHOLD && feed.hasPrev.value) {
        feed.goPrev();
    }
}

/** 滚轮翻页（桌面端），节流防连跳 */
let wheelLocked = false;
function onWheel(e: WheelEvent) {
    if (wheelLocked) return;
    if (Math.abs(e.deltaY) < 20) return;
    wheelLocked = true;
    window.setTimeout(() => (wheelLocked = false), 500);
    if (e.deltaY > 0 && feed.hasNext.value) {
        feed.goNext();
    } else if (e.deltaY < 0 && feed.hasPrev.value) {
        feed.goPrev();
    }
}

/** 键盘：↑↓ 翻页，空格 播放/暂停 */
function onKeydown(e: KeyboardEvent) {
    if (e.key === "ArrowDown" && feed.hasNext.value) {
        e.preventDefault();
        feed.goNext();
    } else if (e.key === "ArrowUp" && feed.hasPrev.value) {
        e.preventDefault();
        feed.goPrev();
    } else if (e.key === " " && feed.currentVideo.value) {
        e.preventDefault();
        feed.togglePlay();
    }
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => {
    window.removeEventListener("keydown", onKeydown);
    resizeObserver?.disconnect();
    resizeObserver = null;
    feed.destroy();
});

// ---------- 页面暂停（标签页隐藏 / App 切后台 / keep-alive 失活） ----------
usePageVisibility((visible) => feed.handlePageVisibility(visible));
onDeactivated(() => feed.pool.pauseAll());

// ---------- 轨道位移样式 ----------
const trackStyle = computed(() => ({
    transform: `translateY(${dragOffset.value}px)`,
    transition: dragging.value ? "none" : "transform 0.35s cubic-bezier(0.22, 0.61, 0.36, 1)",
}));

// ---------- 互动 ----------
const showComments = ref(false);

// ---------- 进度条拖动（seek） ----------
const progressTrackRef = ref<HTMLElement | null>(null);
const scrubbing = ref(false);
const scrubRatio = ref(0);
/** 拖动开始时记录总时长，用于时间气泡展示 */
const scrubDuration = ref(0);

/** 拖动中显示拖动位置，否则显示实际播放进度 */
const displayProgress = computed(() => (scrubbing.value ? scrubRatio.value : Math.min(feed.progress.value, 1)));

/** 拖动位置对应的时间点（秒） */
const scrubTime = computed(() => scrubRatio.value * scrubDuration.value);

/** 秒 → m:ss（超过 1 小时为 h:mm:ss） */
function formatTime(s: number): string {
    if (!Number.isFinite(s) || s < 0) s = 0;
    const total = Math.floor(s);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const sec = total % 60;
    const ss = String(sec).padStart(2, "0");
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${ss}`;
    return `${m}:${ss}`;
}

function ratioFromEvent(e: PointerEvent): number {
    const el = progressTrackRef.value;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
}

function onScrubMove(e: PointerEvent) {
    if (scrubbing.value) {
        scrubRatio.value = ratioFromEvent(e);
    }
}

function onScrubEnd(e: PointerEvent) {
    if (!scrubbing.value) return;
    scrubbing.value = false;
    window.removeEventListener("pointermove", onScrubMove);
    window.removeEventListener("pointerup", onScrubEnd);
    const player = feed.pool.get(feed.currentIndex.value);
    const dur = player?.duration() ?? 0;
    if (player && dur > 0 && Number.isFinite(dur)) {
        player.seek(ratioFromEvent(e) * dur);
        // seek 后立刻同步一次进度，避免进度条回跳
        feed.progress.value = ratioFromEvent(e);
    }
}

function onScrubStart(e: PointerEvent) {
    // HLS 直流/时长未知时不可拖
    const player = feed.pool.get(feed.currentIndex.value);
    const dur = player?.duration() ?? 0;
    if (!player || dur <= 0 || !Number.isFinite(dur)) return;
    scrubbing.value = true;
    scrubDuration.value = dur;
    scrubRatio.value = ratioFromEvent(e);
    window.addEventListener("pointermove", onScrubMove);
    window.addEventListener("pointerup", onScrubEnd);
}

function onLike(video: VideoInfo) {
    feed.toggleLike(video);
}

function onComments() {
    showComments.value = true;
    if (feed.currentVideo.value) {
        feed.openComments(feed.currentVideo.value);
    }
}

function onShare(video: VideoInfo) {
    feed.shareVideo(video);
    // 演示实现：优先调起系统分享，失败退化为复制链接
    const url = `${location.origin}/videos/`;
    if (navigator.share) {
        navigator.share({title: video.title ?? "视频分享", url}).catch(() => {});
    } else {
        void navigator.clipboard?.writeText(url).catch(() => {});
    }
}

function onTogglePlay() {
    // 点击画面：若处于静音降级状态，第一次点击先开声（抖音同款交互）
    if (feed.autoplayMuted.value) {
        feed.toggleMute();
        return;
    }
    feed.togglePlay();
}
</script>

<template>
    <div
        ref="rootRef"
        class="video-feed"
        :class="{'v-shorts': isShorts, 'is-portrait': isShorts && activeAspect < 1}"
        :style="rootStyle"
        @touchstart.passive="onTouchStart"
        @touchmove.passive="onTouchMove"
        @touchend.passive="onTouchEnd"
        @touchcancel.passive="onTouchEnd"
        @wheel.passive="onWheel"
    >
        <!-- 3 实例轨道：拖动时整体跟手 -->
        <div class="feed-track" :style="trackStyle">
            <div
                v-for="view in slotViews"
                :key="view.slot"
                class="feed-cell"
                :class="{'cell-shorts': isShorts}"
                :style="{transform: `translateY(${view.rel * 100}%)`}"
            >
                <VideoSlide
                    :ref="(el) => setSlideRef(view.slot, el)"
                    :video="view.video"
                    :active="view.rel === 0"
                    :fit="props.fit ?? 'cover'"
                    :variant="props.variant ?? 'fullscreen'"
                    :liked="view.video ? feed.isLiked(view.video.id) : false"
                    :muted="feed.muted.value"
                    :volume="feed.volume.value"
                    :show-unmute-hint="view.rel === 0 && feed.autoplayMuted.value"
                    :buffering="feed.buffering.value"
                    :show-rotate="true"
                    :paused="feed.paused.value"
                    @like="view.video && onLike(view.video)"
                    @comments="onComments"
                    @share="view.video && onShare(view.video)"
                    @toggle-mute="feed.toggleMute()"
                    @set-volume="feed.setVolume($event)"
                    @toggle-play="onTogglePlay"
                />
            </div>
        </div>

        <!-- Shorts：互动栏在视频外右侧（头像/点赞/评论/分享/静音） -->
        <div v-if="isShorts && feed.currentVideo.value" class="shorts-rail">
            <VideoSideBar
                :video="feed.currentVideo.value"
                :liked="feed.isLiked(feed.currentVideo.value.id)"
                :muted="feed.muted.value"
                :volume="feed.volume.value"
                :show-rotate="false"
                @like="feed.currentVideo.value && onLike(feed.currentVideo.value)"
                @comments="onComments"
                @share="feed.currentVideo.value && onShare(feed.currentVideo.value)"
                @toggle-mute="feed.toggleMute()"
                @set-volume="feed.setVolume($event)"
            />
        </div>

        <!-- Shorts：作者与标题在视频下方 -->
        <div v-if="isShorts && feed.currentVideo.value" class="shorts-info">
            <div class="s-author">
                <span class="s-name">@{{ feed.currentVideo.value.author?.username ?? "未知用户" }}</span>
                <button class="s-follow" @click.stop>订阅</button>
            </div>
            <div class="s-title">{{ feed.currentVideo.value.title }}</div>
        </div>

        <!-- 底部进度条（可拖动 seek；shorts 模式贴在视频底边） -->
        <div
            ref="progressTrackRef"
            class="progress-track"
            :class="{'progress-shorts': isShorts, 'is-scrubbing': scrubbing}"
            @pointerdown="onScrubStart"
        >
            <div class="progress-inner" :style="{width: `${displayProgress * 100}%`}"></div>
            <div v-if="scrubbing" class="progress-thumb" :style="{left: `${displayProgress * 100}%`}"></div>
            <!-- 拖动时的时间气泡：当前时间 / 总时长 -->
            <div v-if="scrubbing" class="progress-time" :style="{left: `${displayProgress * 100}%`}">
                {{ formatTime(scrubTime) }} / {{ formatTime(scrubDuration) }}
            </div>
        </div>

        <!-- 右上角计数与加载态 -->
        <div class="hud">
            <span v-if="feed.videos.value.length > 0" class="hud-count">
                {{ feed.currentIndex.value + 1 }} / {{ feed.videos.value.length }}
            </span>
            <span v-if="feed.loadingMore.value" class="hud-loading">加载更多…</span>
        </div>

        <!-- 评论抽屉 -->
        <VideoCommentsDrawer :visible="showComments" :video="feed.currentVideo.value" @close="showComments = false"/>
    </div>
</template>

<style scoped>
/* ---------- 主题定制 ----------
   组件内只写 var(--xxx, 默认值) 回退，不在组件上定义变量本身，
   这样外部无论用内联 style、自身选择器还是父级容器设置都能生效：
   --vk-bg             页面/舞台背景色（全屏模式默认 #000，shorts 默认 #0f0f0f）
   --vk-progress-color 进度条前景色（已播放部分，默认 #fff）
   --vk-progress-bg    进度条轨道底色（未播放部分，默认 rgba(255,255,255,.2)）
   --vk-fg             页面文字颜色（标题/作者等，深色背景配白字，默认 #fff）
*/
.video-feed {
    position: relative;
    width: 100%;
    height: 100dvh;
    overflow: hidden;
    background: var(--vk-bg, #000);
    /* 吃掉所有手势，避免与页面滚动冲突 */
    touch-action: none;
    user-select: none;
    outline: none;
}

/* ---------- Shorts 变体（YouTube Shorts 式布局） ---------- */
.video-feed.v-shorts {
    background: var(--vk-bg, #0f0f0f);
}

.feed-cell.cell-shorts {
    display: flex;
    align-items: center;
    justify-content: center;
}

/* 互动栏：紧贴视频右侧、底边对齐（位置由 --stage-w/--stage-h 驱动） */
.shorts-rail {
    position: absolute;
    left: calc(50% + (var(--stage-w, 360px) / 2) + 14px);
    bottom: calc(50% - (var(--stage-h, 640px) / 2));
    z-index: 30;
}

/* 作者/标题：视频正下方，与视频同宽 */
.shorts-info {
    position: absolute;
    left: calc(50% - (var(--stage-w, 360px) / 2));
    top: calc(50% + (var(--stage-h, 640px) / 2) + 12px);
    width: var(--stage-w, 360px);
    z-index: 30;
    color: var(--vk-fg, #fff);
}

.s-author {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 6px;
}

.s-name {
    font-size: 14px;
    font-weight: 600;
}

.s-follow {
    border: 1px solid color-mix(in srgb, var(--vk-fg, #fff) 40%, transparent);
    background: transparent;
    color: var(--vk-fg, #fff);
    border-radius: 999px;
    padding: 3px 12px;
    font-size: 12px;
    cursor: pointer;
    transition: background 0.2s;
}

.s-follow:hover {
    background: color-mix(in srgb, var(--vk-fg, #fff) 12%, transparent);
}

.s-title {
    font-size: 13px;
    color: color-mix(in srgb, var(--vk-fg, #fff) 85%, transparent);
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

/* 进度条：shorts 模式下贴住视频底边（同宽）
   注意不能 overflow:hidden —— 会把拖动时间气泡裁掉，圆角由内条自己负责 */
.progress-track.progress-shorts {
    left: calc(50% - (var(--stage-w, 360px) / 2));
    right: auto;
    width: var(--stage-w, 360px);
    bottom: calc(50% - (var(--stage-h, 640px) / 2));
}

/* ---------- 手机设备：互动层浮在视频上层（抖音/Shorts 手机端体验） ----------
   手机屏幕窄，视频右侧没有空间；视频已铺满视口（stage=视口），
   互动栏垂直居中悬浮在视频右侧，标题贴近屏幕最底部 */
@media (max-width: 768px) {
    .shorts-rail {
        left: auto;
        right: 10px;
        top: 50%;
        bottom: auto;
        transform: translateY(-50%);
    }

    .shorts-info {
        left: 14px;
        right: 80px; /* 给右侧互动栏让位，避免文字压到点赞按钮 */
        top: auto;
        width: auto;
        bottom: calc(16px + env(safe-area-inset-bottom)); /* 贴近最底部，给进度条留空间 */
    }

    /* 手机端进度条贴屏幕底，加高一点方便拖动 */
    .progress-track.progress-shorts {
        left: 0;
        width: 100%;
        bottom: 0;
        height: 5px;
    }

    .hud {
        top: calc(8px + env(safe-area-inset-top));
    }
}

/* ---------- 大屏 + 竖屏视频（shorts）：标题覆盖在视频上层 ----------
   视频本身由 flex 垂直居中；标题压在视频内底部（进度条上方），
   配合 .video-slide 的底部渐变遮罩保证可读性 */
@media (min-width: 769px) {
    .video-feed.v-shorts.is-portrait .shorts-info {
        left: calc(50% - (var(--stage-w, 360px) / 2) + 14px);
        right: auto;
        width: calc(var(--stage-w, 360px) - 28px);
        top: auto;
        bottom: calc(50% - (var(--stage-h, 640px) / 2) + 18px);
        z-index: 35;
        text-shadow: 0 1px 6px rgba(0, 0, 0, 0.75);
    }
}

.feed-track {
    position: absolute;
    inset: 0;
    will-change: transform;
}

.feed-cell {
    position: absolute;
    inset: 0;
    will-change: transform;
}

.progress-track {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 3px;
    background: var(--vk-progress-bg, rgba(255, 255, 255, 0.2));
    z-index: 30;
    /* 可拖动 seek */
    cursor: pointer;
    touch-action: none;
}

/* 加宽触摸热区（手机上好按），不影响视觉高度 */
.progress-track::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    top: -10px;
    bottom: -10px;
}

.progress-inner {
    height: 100%;
    border-radius: 2px;
    background: var(--vk-progress-color, #fff);
    transition: width 0.2s linear;
    pointer-events: none;
}

/* 拖动中：暂停动画跟随 + 加粗 + 圆形拖块 */
.progress-track.is-scrubbing .progress-inner {
    transition: none;
}

.progress-thumb {
    position: absolute;
    top: 50%;
    width: 13px;
    height: 13px;
    border-radius: 50%;
    background: var(--vk-progress-color, #fff);
    transform: translate(-50%, -50%);
    box-shadow: 0 0 6px rgba(0, 0, 0, 0.4);
    pointer-events: none;
}

.progress-track.is-scrubbing {
    height: 5px;
}

/* 拖动时的时间气泡：当前时间 / 总时长，跟随拖块位置 */
.progress-time {
    position: absolute;
    bottom: calc(100% + 10px);
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.75);
    color: #fff;
    font-size: 12px;
    line-height: 1;
    padding: 5px 9px;
    border-radius: 5px;
    white-space: nowrap;
    pointer-events: none;
    z-index: 40;
}

.hud {
    position: absolute;
    top: calc(10px + env(safe-area-inset-top));
    right: 12px;
    z-index: 30;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
    pointer-events: none;
}

.hud-count {
    color: rgba(255, 255, 255, 0.85);
    font-size: 12px;
    background: rgba(0, 0, 0, 0.35);
    padding: 3px 10px;
    border-radius: 999px;
}

.hud-loading {
    color: rgba(255, 255, 255, 0.7);
    font-size: 12px;
    animation: hud-blink 1.2s ease infinite;
}

@keyframes hud-blink {
    50% {
        opacity: 0.4;
    }
}
</style>
