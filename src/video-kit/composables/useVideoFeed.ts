import {computed, ref, shallowRef, type Ref} from 'vue';
import type {VideoInfo, VideoPlayerOptions} from '@/video-kit/types';
import type {PlayerCoreEvent, PlayerCoreEventPayload} from '@/video-kit/core/types';
import {PlayerPool} from '@/video-kit/core/PlayerPool';
import {isVideoJsReady, loadVideoJs} from '@/video-kit/core/videojs-loader';
import {
  HEARTBEAT_INTERVAL,
  PROGRESS_MILESTONES,
  ConsoleStatsReporter,
  type StatsReporter,
  type VideoStatEvent,
} from '@/video-kit/core/stats';
import {getNetworkInfo, getPreloadStrategy, watchNetworkInfo} from '@/video-kit/core/network';

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
  /**
   * 按 id 直接取单条视频（深链 `?v=<id>` 用）
   *
   * 不传也能工作：此时只在已拉取的页里找，找不到就提示并从第一条开始。
   * 传了才能像 YouTube 那样「直接进来就定位到那一条」。
   */
  resolveVideo?: (id: string | number) => Promise<VideoInfo | null>;
  /** 深链目标视频 id（来自路由 query，空值表示普通进入） */
  initialVideoId?: string | number;
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
  /** 分页已到底（fetchPage 返回空数组）——用于展示"已经看完了" */
  const ended = ref(false);
  /** 最近一次分页失败的原因（空表示无错误） */
  const loadError = ref('');
  /** 当前位播放失败的原因（空表示正常）——用于展示"播放失败，点击重试" */
  const playError = ref('');
  /** 播放器内核（video.js 异步 chunk）是否已就绪 */
  const playerReady = ref(isVideoJsReady());
  /** 内核加载失败的原因（空表示正常） */
  const playerError = ref('');
  /** 深链目标没找到（视频不存在/已被删除），已退回第一条播放 */
  const initialMissing = ref(false);
  /** 当前播放倍速（长按倍速时切换，切换视频后要重新应用到新实例） */
  const playbackRate = ref(1);
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
    preload: 'auto',
    fit: 'cover',
    ...options.playerOptions,
  });

  // ---------- 播放器内核（video.js 异步 chunk） ----------
  let corePromise: Promise<void> | null = null;

  /**
   * 启动播放器内核下载（幂等，失败可重试）
   *
   * 与分页请求并行发起：video.js 是 700KB 的异步 chunk，
   * 串行等待等于白等一个往返，界面却已经可以先把封面/互动栏渲染出来。
   */
  function ensurePlayerCore(): Promise<void> {
    if (playerReady.value) return Promise.resolve();
    if (corePromise) return corePromise;

    corePromise = loadVideoJs()
      .then(() => {
        // 内核就绪：补装「未就绪期间被推迟」的装载请求
        pool.onModuleReady();
        playerReady.value = true;
        playerError.value = '';
        playError.value = '';
      })
      .catch((err) => {
        // ⚠️ 一定要清掉句柄，否则重试拿到的还是同一个已 rejected 的 Promise
        corePromise = null;
        playerError.value = err instanceof Error ? err.message : '播放器加载失败';
        // 内核都下不来，播放必然失败：直接把错误暴露到当前位的重试入口
        playError.value = '播放器加载失败，点击重试';
        // eslint-disable-next-line no-console
        console.error('[video-kit] 播放器内核加载失败', err);
      });

    return corePromise;
  }

  // 立刻开始下载内核（与首屏分页请求并行），不等挂载、不等数据
  void ensurePlayerCore();

  // ---------- 统计 ----------
  const stat = (
    type: VideoStatEvent['type'],
    video: VideoInfo,
    position = 0,
    duration = 0,
    extra?: Record<string, unknown>,
  ) => {
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
      stat('heartbeat', video, player.currentTime(), player.duration());
    }, HEARTBEAT_INTERVAL);
  };

  // ---------- 内核事件 → 统计 / 进度 ----------
  pool.onCoreEvent = (video, event: PlayerCoreEvent, payload: PlayerCoreEventPayload) => {
    // 只关心「当前播放位」的事件（邻居实例也会吐 loadedmetadata 等）
    if (video.id !== currentVideo.value?.id) return;

    if (event === 'timeupdate') {
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
            stat('play_progress', video, payload.currentTime, payload.duration, {milestone: m});
          }
        }
        if (ratio >= 0.95 && !marks.has(1)) {
          marks.add(1);
          stat('complete', video, payload.currentTime, payload.duration);
        }
      }
    } else if (event === 'play') {
      playing.value = true;
      buffering.value = false;
      if (payload.currentTime < 0.2) {
        stat('play_start', video, payload.currentTime, payload.duration);
      } else {
        stat('resume', video, payload.currentTime, payload.duration);
      }
      startHeartbeat(video);
    } else if (event === 'pause') {
      playing.value = false;
      stat('pause', video, payload.currentTime, payload.duration);
      stopHeartbeat();
    } else if (event === 'waiting') {
      buffering.value = true;
    } else if (event === 'loadedmetadata') {
      // 元数据回填：用媒体真实宽高修正横竖屏判断（后端没给或给错时兜底），
      // 尺寸变化会驱动 shorts 舞台自适应重算
      const vw = payload.videoWidth;
      const vh = payload.videoHeight;
      if (vw && vh && (video.width !== vw || video.height !== vh)) {
        videos.value = videos.value.map((v) => (v.id === video.id ? {...v, width: vw, height: vh} : v));
      }
    } else if (event === 'ended') {
      playing.value = false;
      stopHeartbeat();
      // 自动连播下一条（抖音行为）
      if (hasNext.value) {
        goTo(currentIndex.value + 1);
      }
    } else if (event === 'error') {
      stat('error', video, payload.currentTime, payload.duration, {error: String(payload.error)});
      // 播放错误直接打 error 级别，避免被浏览器默认过滤掉，方便排查（如 type 标错、跨域、403）
      // eslint-disable-next-line no-console
      console.error(`[video-kit] 播放失败 video=${video.id} url=${video.url}`, payload.error);
      // 暴露到 UI：否则用户只能看到一个转圈或直接划走，没有任何重试入口
      playError.value = payload.error ? String(payload.error) : '播放失败';
      playing.value = false;
      buffering.value = false;
      stopHeartbeat();
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

  /**
   * 已装载过的视频 id
   *
   * 分页去重用：深链定位会把目标视频插到队首，而它本来可能就在后面的某一页里，
   * 不去重的话用户下滑会看到同一条出现两次。后端分页偶发重叠时同样靠它兜住。
   */
  const knownIds = new Set<string>();

  /** 追加一批视频（自动跳过已存在的 id），返回实际新增条数 */
  function appendVideos(batch: VideoInfo[]): number {
    const fresh = batch.filter((v) => !knownIds.has(String(v.id)));
    if (fresh.length === 0) return 0;
    fresh.forEach((v) => knownIds.add(String(v.id)));
    videos.value = [...videos.value, ...fresh];
    return fresh.length;
  }

  /** 把深链目标插到队首（成为第 0 条，后续分页跟在它后面） */
  function prependVideo(video: VideoInfo): void {
    if (knownIds.has(String(video.id))) return;
    knownIds.add(String(video.id));
    videos.value = [video, ...videos.value];
  }

  /**
   * 深链目标（只消费一次）
   *
   * ⚠️ 消费后必须置空：否则后续每次分页都会去「重新定位」，
   * 用户滑到第 10 条时会被硬拽回目标视频。
   */
  let initialTarget: string | number | null =
    options.initialVideoId === undefined || options.initialVideoId === '' ? null : options.initialVideoId;

  /**
   * 定位深链目标（YouTube `?v=<id>` 同款）
   *
   * ⚠️ 必须在首屏 pool.loadAround() **之前**完成：
   * 否则会先装载并播放第 0 条、再 goTo 跳过去 —— 白白解码一次视频，
   * 用户还会看到第一条的画面闪一下。
   */
  async function applyInitialTarget(seedPromise: Promise<VideoInfo | null> | null): Promise<void> {
    if (initialTarget === null) return;
    const target = String(initialTarget);
    initialTarget = null;

    // 1) 已经加载的页里就有，直接定位（省一次请求）
    const idx = videos.value.findIndex((v) => String(v.id) === target);
    if (idx >= 0) {
      currentIndex.value = idx;
      return;
    }

    // 2) 按 id 直接取（YouTube 也是这个思路：先拿到这条，再把推荐流续在后面）
    const seed = seedPromise ? await seedPromise : null;
    if (seed) {
      prependVideo(seed);
      currentIndex.value = 0;
      return;
    }

    // 3) 取不到：提示后从第一条开始，不要让用户卡在空白页
    initialMissing.value = true;
  }

  async function loadMore(): Promise<void> {
    // 已到底 / 正在加载 / 上次失败尚未重试：都不再发请求
    if (loadingMore.value || ended.value || loadError.value) return;
    loadingMore.value = true;
    loadError.value = '';
    // 内核与分页请求并行：分页在跑的同时 chunk 也在下；
    // 若上次内核下载失败（句柄已清空），这里顺带重试一次
    void ensurePlayerCore();

    // 深链目标与首屏分页并行解析：串行会多等一个往返才出画面
    // ⚠️ 这里必须就地 catch：若目标就在首屏页里，applyInitialTarget 会在第 1 步返回，
    // 这个 Promise 就没人 await —— 一旦 reject 就是 unhandled rejection
    const seedPromise =
      initialTarget !== null && options.resolveVideo ? options.resolveVideo(initialTarget).catch(() => null) : null;

    try {
      const batch = (await options.fetchPage(page)) ?? [];
      const isFirstPage = !initialized.value;
      appendVideos(batch);
      if (batch.length === 0) {
        // 接口返回空数组 = 没有更多内容
        ended.value = true;
      } else {
        // ⚠️ 整页都是重复项时**不能**判定「到底了」：那只能说明这一页已装载过，
        // 下一页很可能还有新内容。只有接口真返回空数组才算没有更多。
        page += 1;
      }
      // 只有首屏需要主动调度播放并记曝光；后续分页由 goTo / 预取逻辑驱动，
      // 在这里重复记一次 impression 会把同一条视频的曝光数算多遍
      if (isFirstPage) {
        await applyInitialTarget(seedPromise);
        pool.loadAround(currentIndex.value, videos.value, true);
        if (currentVideo.value) {
          stat('impression', currentVideo.value);
        }
      }
      // ⚠️ 首屏必须在「首次请求成功」后就置位，而不只在拿到数据时：
      // 否则接口返回空数组（确实没有内容）时 initialized 永远为 false，
      // 首屏遮罩会一直转圈，用户既看不到"暂无内容"也走不到重试。
      initialized.value = true;
    } catch (err) {
      // ⚠️ 原先没有 catch：loadMore 是 async，调用方写作 `void feed.loadMore()`，
      // 失败会变成 unhandled rejection，且界面上完全没有反馈（只在控制台可见）。
      loadError.value = err instanceof Error ? err.message : '加载失败';
      // eslint-disable-next-line no-console
      console.error('[video-kit] 分页加载失败', err);
    } finally {
      loadingMore.value = false;
    }
  }

  /** 分页失败后手动重试（先清错误态，否则 loadMore 会被自己的守卫挡住） */
  function retryLoadMore(): void {
    loadError.value = '';
    void loadMore();
  }

  /** 滑到接近尾部时提前取下一页，保证永远有「下一条」可滑 */
  async function maybePrefetchPage(): Promise<void> {
    if (!initialized.value || loadingMore.value || ended.value || loadError.value) return;
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
    playError.value = '';
    reportedMilestones.delete(video.id);

    pool.loadAround(index, videos.value, true);
    // 倍速是「播放器实例」的属性而非 feed 的属性：槽位里装的是新视频/新实例，
    // 切换后必须重新下发，否则长按 2x 滑到下一条就偷偷回到 1x
    pool.get(index)?.setPlaybackRate(playbackRate.value);
    stat('impression', video);
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
    stat('share', video);
  }

  /**
   * 暂停当前位并记录「是否要续播」
   *
   * ⚠️ 原先 handlePageVisibility(true) 无条件 play()：
   * 用户手动暂停后切后台再回来，视频会自己播起来，等于覆盖了用户的操作。
   * 这里以「暂停前的真实播放状态」为准决定是否续播。
   */
  let resumeWanted = false;

  /** 暂停全部（标签页隐藏 / keep-alive 失活） */
  function suspend(): void {
    if (!initialized.value) return;
    resumeWanted = pool.get(currentIndex.value)?.isPlaying() ?? false;
    pool.pauseAll();
    stopHeartbeat();
  }

  /** 恢复（回到前台 / keep-alive 激活），仅在暂停前确实在播时才续播 */
  function resume(): void {
    if (!initialized.value) return;
    if (resumeWanted) {
      void pool.get(currentIndex.value)?.play();
    }
  }

  /** 页面可见性变化：隐藏→暂停，回前台→按需续播 */
  function handlePageVisibility(visible: boolean): void {
    if (visible) {
      resume();
    } else {
      suspend();
    }
  }

  /** 播放失败后重试：重新装载当前视频 */
  function retryPlay(): void {
    playError.value = '';
    buffering.value = false;
    // 内核还没就绪（chunk 没下完或上次下载失败）：先重试内核，
    // 成功后走一次 loadAround 兜底——此时若槽位还没有装载意图，reload() 是空操作
    if (!playerReady.value) {
      void ensurePlayerCore().then(() => pool.loadAround(currentIndex.value, videos.value, true));
      return;
    }
    pool.get(currentIndex.value)?.reload();
  }

  /** 设置倍速（长按倍速等），同时下发到当前实例 */
  function setPlaybackRate(rate: number): void {
    playbackRate.value = Math.min(3, Math.max(0.5, rate));
    pool.get(currentIndex.value)?.setPlaybackRate(playbackRate.value);
  }

  // ---------- 互动（点赞/评论由组件注入真实实现） ----------
  const likedMap: Ref<Record<string | number, boolean>> = ref({});
  const toggleLike = (video: VideoInfo): boolean => {
    const liked = !likedMap.value[video.id];
    likedMap.value = {...likedMap.value, [video.id]: liked};
    stat(liked ? 'like' : 'unlike', video);
    return liked;
  };
  const isLiked = (videoId: VideoInfo['id']): boolean => !!likedMap.value[videoId];

  const openComments = (video: VideoInfo): void => {
    stat('open_comments', video);
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
    ended,
    loadError,
    playError,
    playerReady,
    playerError,
    initialMissing,
    playbackRate,
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
    retryLoadMore,
    retryPlay,
    maybePrefetchPage,
    goTo,
    goNext,
    goPrev,
    togglePlay,
    suspend,
    resume,
    unmute,
    mute,
    toggleMute,
    setVolume,
    setPlaybackRate,
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
