import type {VideoInfo, VideoPlayerOptions} from "@/video-kit/types";
import type {PlayerCoreEvent, PlayerCoreEventPayload} from "@/video-kit/core/types";
import {VideoPlayer} from "@/video-kit/core/VideoPlayer";
import type {PreloadStrategy} from "@/video-kit/core/network";

/**
 * 播放器池 —— 「3 实例复用」思想的核心实现
 *
 * 原理：
 *   固定创建 3 个播放器实例，与 feed 下标按 `slot = index % 3` 静态绑定：
 *
 *     feed:  ... v2  v3  v4  v5  v6 ...
 *     slot:      [2] [0] [1] [2] [0] ...
 *
 *   从 v4 滑到 v5 时，v5 用的还是当初装好 v5 的那个实例——
 *   「当前位」实例自然接棒，「下一位」实例早已预加载完毕，
 *   而腾出来的旧「上一位」实例（v2）被回收去装载 v6。
 *
 *   全程零创建、零销毁，滑动时不存在任何 DOM/解码器冷启动开销，
 *   这就是抖音式无限滑动在 Web 上丝滑的关键。
 */
export class PlayerPool {
    /** 固定 3 个槽位 */
    static readonly SIZE = 3;

    private players: (VideoPlayer | null)[] = [null, null, null];

    private containers: (HTMLElement | null)[] = [null, null, null];

    private preloadStrategy: PreloadStrategy = {
        next: "auto",
        current: "auto",
        prefetchNext: true,
    };

    /** 槽位级内核事件透传（附带 video 参数，便于上层归因） */
    onCoreEvent?: (video: VideoInfo, event: PlayerCoreEvent, payload: PlayerCoreEventPayload) => void;

    onAutoplayDegraded?: (video: VideoInfo) => void;

    constructor(private readonly options: VideoPlayerOptions = {}) {}

    /**
     * 绑定槽位 DOM 容器（3 个槽位对应 feed 中 prev/cur/next 三个固定 slide）
     * 容器就绪后立即创建实例，实例随组件创建/销毁，符合 Vue 生命周期
     */
    mount(slot: number, container: HTMLElement): void {
        if (slot < 0 || slot >= PlayerPool.SIZE) return;
        this.containers[slot] = container;
        if (!this.players[slot]) {
            const player = new VideoPlayer(container, this.options);
            player.onCoreEvent = (event, payload) => {
                if (player.video) {
                    this.onCoreEvent?.(player.video, event, payload);
                }
            };
            player.onAutoplayDegraded = () => {
                if (player.video) {
                    this.onAutoplayDegraded?.(player.video);
                }
            };
            this.players[slot] = player;
        }
    }

    /** feed 下标 → 槽位号 */
    slotOf(index: number): number {
        return ((index % PlayerPool.SIZE) + PlayerPool.SIZE) % PlayerPool.SIZE;
    }

    /** 取 feed 下标对应的播放器实例 */
    get(index: number): VideoPlayer | null {
        return this.players[this.slotOf(index)];
    }

    /** 更新网络策略（弱网时降低邻居实例的 preload） */
    setPreloadStrategy(strategy: PreloadStrategy): void {
        this.preloadStrategy = strategy;
    }

    /**
     * 装载「当前 + 邻居」共 3 个视频（3 实例体系一次最多管 3 个）
     *
     * @param currentIndex 当前 feed 下标
     * @param videos       视频列表
     * @param autoplay     当前位是否自动播放
     */
    loadAround(currentIndex: number, videos: VideoInfo[], autoplay = true): void {
        const strategy = this.preloadStrategy;

        const load = (index: number, role: "current" | "next" | "prev") => {
            const video = videos[index];
            if (!video) return;
            const player = this.get(index);
            if (!player) return;

            if (role === "current") {
                // 成为当前位后，preload 提到 auto，保证随时可续播
                player.setPreload("auto");
                if (!player.isLoaded(video.id)) {
                    player.load(video, autoplay);
                } else if (autoplay && !player.isPlaying()) {
                    // 复位/回滑时实例已装好，只需恢复播放
                    void player.play();
                }
                return;
            }

            // 邻居位：按网络策略决定是否预取、以何种强度预取
            const prefetchable = role === "next" ? strategy.prefetchNext : true;
            const preload = strategy.next;
            if (!prefetchable || preload === "none") {
                // 弱网：不预取下一位；上一位若已装载数据则保留（回滑可秒播）
                if (role === "next" && !player.isLoaded(video.id) && player.video) {
                    player.reset();
                }
                return;
            }
            if (!player.isLoaded(video.id)) {
                // 邻居静音装载且不自动播放，浏览器按 preload 值预拉数据
                player.setPreload(preload);
                player.load(video, false);
            }
        };

        load(currentIndex, "current");
        load(currentIndex + 1, "next");
        load(currentIndex - 1, "prev");
    }

    /** 暂停所有实例（页面隐藏 / 离开 feed 时调用） */
    pauseAll(): void {
        this.players.forEach((p) => p?.pause());
    }

    /** 销毁全部实例 */
    destroy(): void {
        this.players.forEach((p) => p?.destroy());
        this.players = [null, null, null];
    }
}
