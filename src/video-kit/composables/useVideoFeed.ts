import {computed, ref, shallowRef, type Ref} from "vue";
import type {VideoInfo, VideoPlayerOptions} from "@/video-kit/types";
import type {PlayerCoreEvent, PlayerCoreEventPayload} from "@/video-kit/core/types";
import {PlayerPool} from "@/video-kit/core/PlayerPool";
import {
    HEARTBEAT_INTERVAL,
    PROGRESS_MILESTONES,
    ConsoleStatsReporter,
    type StatsReporter,
    type VideoStatEvent,
} from "@/video-kit/core/stats";
import {getNetworkInfo, getPreloadStrategy, watchNetworkInfo} from "@/video-kit/core/network";

/**
 * Video Feed 状态中枢
 *
 * 把 PlayerPool（3 实例复用）、虚拟分页、网络策略、统计上报、页面暂停
 * 编排成一个对组件层友好的响应式状态机。组件只管渲染 + 手势，
 * 播放调度全部收敛在这里。
 */

export interface VideoFeedOptions {
    /** 分页拉取视频列表（返回空数组表示没有更多了） */
    fetchPage: (page: number) => Promise<VideoInfo[]>;
    /** 每页条数 */
    pageSize?: number;
    /** 埋点上报器，默认打印控制台 */
    statsReporter?: StatsReporter;
    /** 播放器选项 */
    playerOptions?: VideoPlayerOptions;
}

export function useVideoFeed(options: VideoFeedOptions) {
    const pageSize = options.pageSize ?? 5;
    const reporter: StatsReporter = options.statsReporter ?? new ConsoleStatsReporter();

    // ---------- 响应式状态 ----------
    /** 视频列表（虚拟分页：本地只持有已拉取页，DOM 只渲染 3 个 slide） */
    const videos = shallowRef<VideoInfo[]>([]);
    const currentIndex = ref(0);
    const loadingMore = ref(false);
    const initialized = ref(false);
    /** 自动播放被浏览器策略拦截、已降级为静音（展示"点按开启声音"提示） */
    const autoplayMuted = ref(false);
    /** 当前是否静音（初始静音，手势后放开） */
    const muted = ref(true);
    /** 当前位是否在缓冲 */
    const buffering = ref(false);
    /** 当前位是否在播放中 */
    const playing = ref(false);
    const paused = computed(() => !playing.value);

    const currentVideo = computed<VideoInfo | null>(() => videos.value[currentIndex.value] ?? null);
    const hasPrev = computed(() => currentIndex.value > 0);
    const hasNext = computed(() => currentIndex.value < videos.value.length - 1);

    // ---------- 播放器池 ----------
    const pool = new PlayerPool({
        autoplay: true,
        muted: true, // 先静音起播保成功率，手势后再放开声音
        loop: false,
        controls: false,
        preload: "auto",
        fit: "cover",
        ...options.playerOptions,
    });

    // ---------- 统计 ----------
    const stat = (type: VideoStatEvent["type"], video: VideoInfo, position = 0, duration = 0, extra?: Record<string, unknown>) => {
        reporter.report({
            type,
            videoId: video.id,
            position,
            duration,
            extra,
            timestamp: Date.now(),
        });
    };

    /** 当前视频的播放进度（0~1），驱动进度条 */
    const progress = ref(0);
    /** 心跳/里程碑按视频 id 去重记录 */
    const reportedMilestones = new Map<string | number, Set<number>>();
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

    const stopHeartbeat = () => {
        if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
            heartbeatTimer = null;
        }
    };
    const startHeartbeat = (video: VideoInfo) => {
        stopHeartbeat();
        heartbeatTimer = setInterval(() => {
            const player = pool.get(currentIndex.value);
            if (!player || !player.isPlaying()) return;
            stat("heartbeat", video, player.currentTime(), player.duration());
        }, HEARTBEAT_INTERVAL);
    };

    // ---------- 内核事件 → 统计 / 进度 ----------
    pool.onCoreEvent = (video, event: PlayerCoreEvent, payload: PlayerCoreEventPayload) => {
        // 只关心「当前播放位」的事件（邻居实例也会吐 loadedmetadata 等）
        if (video.id !== currentVideo.value?.id) return;

        if (event === "timeupdate") {
            buffering.value = false;
            if (payload.duration > 0) {
                progress.value = payload.currentTime / payload.duration;

                // 进度里程碑（25/50/75%）+ 完播
                let marks = reportedMilestones.get(video.id);
                if (!marks) {
                    marks = new Set();
                    reportedMilestones.set(video.id, marks);
                }
                const ratio = progress.value;
                for (const m of PROGRESS_MILESTONES) {
                    if (ratio >= m && !marks.has(m)) {
                        marks.add(m);
                        stat("play_progress", video, payload.currentTime, payload.duration, {milestone: m});
                    }
                }
                if (ratio >= 0.95 && !marks.has(1)) {
                    marks.add(1);
                    stat("complete", video, payload.currentTime, payload.duration);
                }
            }
        } else if (event === "play") {
            playing.value = true;
            buffering.value = false;
            if (payload.currentTime < 0.2) {
                stat("play_start", video, payload.currentTime, payload.duration);
            } else {
                stat("resume", video, payload.currentTime, payload.duration);
            }
            startHeartbeat(video);
        } else if (event === "pause") {
            playing.value = false;
            stat("pause", video, payload.currentTime, payload.duration);
            stopHeartbeat();
        } else if (event === "waiting") {
            buffering.value = true;
        } else if (event === "loadedmetadata") {
            // 元数据回填：用媒体真实宽高修正横竖屏判断（后端没给或给错时兜底），
            // 尺寸变化会驱动 shorts 舞台自适应重算
            const vw = payload.videoWidth;
            const vh = payload.videoHeight;
            if (vw && vh && (video.width !== vw || video.height !== vh)) {
                videos.value = videos.value.map((v) =>
                    v.id === video.id ? {...v, width: vw, height: vh} : v,
                );
            }
        } else if (event === "ended") {
            playing.value = false;
            stopHeartbeat();
            // 自动连播下一条（抖音行为）
            if (hasNext.value) {
                goTo(currentIndex.value + 1);
            }
        } else if (event === "error") {
            stat("error", video, payload.currentTime, payload.duration, {error: String(payload.error)});
            // 播放错误直接打 error 级别，避免被浏览器默认过滤掉，方便排查（如 type 标错、跨域、403）
            // eslint-disable-next-line no-console
            console.error(
                `[video-kit] 播放失败 video=${video.id} url=${video.url}`,
                payload.error,
            );
        }
    };

    pool.onAutoplayDegraded = () => {
        autoplayMuted.value = true;
    };

    // ---------- 网络策略 ----------
    const applyNetworkStrategy = () => {
        pool.setPreloadStrategy(getPreloadStrategy(getNetworkInfo()));
    };
    applyNetworkStrategy();
    const unwatchNetwork = watchNetworkInfo(() => {
        applyNetworkStrategy();
        // 网络变化后按新策略重新调度邻居
        if (initialized.value) {
            pool.loadAround(currentIndex.value, videos.value, true);
        }
    });

    // ---------- 虚拟分页 ----------
    let page = 0;
    async function loadMore(): Promise<void> {
        if (loadingMore.value) return;
        loadingMore.value = true;
        try {
            const batch = await options.fetchPage(page);
            if (batch.length > 0) {
                videos.value = [...videos.value, ...batch];
                page += 1;
                if (!initialized.value) {
                    initialized.value = true;
                    pool.loadAround(currentIndex.value, videos.value, true);
                    if (currentVideo.value) {
                        stat("impression", currentVideo.value);
                    }
                }
            }
        } finally {
            loadingMore.value = false;
        }
    }

    /** 滑到接近尾部时提前取下一页，保证永远有「下一条」可滑 */
    async function maybePrefetchPage(): Promise<void> {
        if (!initialized.value || loadingMore.value) return;
        if (videos.value.length - currentIndex.value <= pageSize) {
            await loadMore();
        }
    }

    // ---------- 索引切换（滑动/键盘调用的唯一入口） ----------
    function goTo(index: number): void {
        if (index < 0 || index >= videos.value.length) return;
        const video = videos.value[index];
        if (!video) return;
        if (index === currentIndex.value) return;

        const prevVideo = currentVideo.value;
        // 暂停旧当前位
        pool.get(currentIndex.value)?.pause();

        currentIndex.value = index;
        progress.value = 0;
        autoplayMuted.value = false;
        playing.value = false;
        buffering.value = false;
        reportedMilestones.delete(video.id);

        pool.loadAround(index, videos.value, true);
        stat("impression", video);
        void maybePrefetchPage();

        // 旧当前位如果已经滑出 3 实例窗口，由 Pool 的槽位复用机制自然回收，
        // 这里无需手动清理（loadAround 会把腾出的槽位装载成新邻居）
        void prevVideo;
    }

    const goNext = () => goTo(currentIndex.value + 1);
    const goPrev = () => goTo(currentIndex.value - 1);

    // ---------- 交互动作 ----------
    function togglePlay(): void {
        const player = pool.get(currentIndex.value);
        if (!player) return;
        if (player.isPlaying()) {
            player.pause();
        } else {
            void player.play();
        }
    }

    /** 用户音量（0~1），3 实例同步（与 mute/unmute 同一套 ±1 槽位策略） */
    const volume = ref(1);
    /** 最近一次用户设置的非零音量：重新开声时恢复；从未设置过则默认最大 */
    let lastUserVolume = 1;

    /** 将音量/静音状态同步到 ±1 槽位（3 实例共享同一听感） */
    function applyVolumeAll(v: number, isMuted: boolean): void {
        for (const p of [currentIndex.value - 1, currentIndex.value, currentIndex.value + 1]) {
            const player = pool.get(p);
            if (!player) continue;
            player.setVolume(v);
            player.setMuted(isMuted);
        }
    }

    /** 用户手势后开启声音（解除自动播放降级），恢复上次设置的音量 */
    function unmute(): void {
        autoplayMuted.value = false;
        muted.value = false;
        volume.value = lastUserVolume > 0 ? lastUserVolume : 1;
        applyVolumeAll(volume.value, false);
    }

    function mute(): void {
        autoplayMuted.value = false;
        muted.value = true;
        // 关闭声音 = 音量真正归零（含状态，音量条同步落到 0）；
        // 之前的音量已记在 lastUserVolume，开声时恢复
        volume.value = 0;
        applyVolumeAll(0, true);
    }

    function toggleMute(): void {
        if (muted.value) {
            unmute();
        } else {
            mute();
        }
    }

    function setVolume(v: number): void {
        volume.value = Math.min(1, Math.max(0, v));
        if (volume.value > 0) {
            lastUserVolume = volume.value;
        }
        if (volume.value <= 0) {
            // 拖到 0 等同静音（图标同步为静音态）
            autoplayMuted.value = false;
            muted.value = true;
            applyVolumeAll(0, true);
            return;
        }
        // 设置非零音量视为想听声音，自动解除静音
        muted.value = false;
        applyVolumeAll(volume.value, false);
    }

    /** 分享埋点（真实分享逻辑由业务层通过 reporter 定制） */
    function shareVideo(video: VideoInfo): void {
        stat("share", video);
    }

    /** 页面暂停：隐藏时全部暂停，回前台恢复当前位 */
    function handlePageVisibility(visible: boolean): void {
        if (!initialized.value) return;
        if (visible) {
            void pool.get(currentIndex.value)?.play();
        } else {
            pool.pauseAll();
            stopHeartbeat();
        }
    }

    // ---------- 互动（点赞/评论由组件注入真实实现） ----------
    const likedMap: Ref<Record<string | number, boolean>> = ref({});
    const toggleLike = (video: VideoInfo): boolean => {
        const liked = !likedMap.value[video.id];
        likedMap.value = {...likedMap.value, [video.id]: liked};
        stat(liked ? "like" : "unlike", video);
        return liked;
    };
    const isLiked = (videoId: VideoInfo["id"]): boolean => !!likedMap.value[videoId];

    const openComments = (video: VideoInfo): void => {
        stat("open_comments", video);
    };

    // ---------- 槽位挂载（组件 onMounted 时调用 3 次） ----------
    function mountSlot(slot: number, container: HTMLElement): void {
        pool.mount(slot, container);
    }

    // ---------- 销毁 ----------
    function destroy(): void {
        unwatchNetwork();
        stopHeartbeat();
        pool.destroy();
    }

    return {
        // 状态
        videos,
        currentIndex,
        currentVideo,
        hasPrev,
        hasNext,
        loadingMore,
        initialized,
        progress,
        autoplayMuted,
        muted,
        volume,
        buffering,
        playing,
        paused,
        likedMap,
        // 动作
        loadMore,
        maybePrefetchPage,
        goTo,
        goNext,
        goPrev,
        togglePlay,
        unmute,
        mute,
        toggleMute,
        setVolume,
        toggleLike,
        isLiked,
        openComments,
        shareVideo,
        mountSlot,
        handlePageVisibility,
        destroy,
        // 播放器池（供组件读取 currentTime 等）
        pool,
    };
}

export type VideoFeedContext = ReturnType<typeof useVideoFeed>;
