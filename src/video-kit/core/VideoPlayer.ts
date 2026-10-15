import videojs from 'video.js';
import type Player from 'video.js/dist/types/player';
import type {VideoInfo, VideoPlayerOptions} from '@/video-kit/types';
import type {PlayerCoreEvent, PlayerCoreEventPayload, VideoPlayerInstance} from '@/video-kit/core/types';

/**
 * video.js 播放器包装
 *
 * 职责：
 * 1. 承接 video.js Player 的生命周期（创建 / 重置 / 销毁）
 * 2. 把「装载新视频」收敛为一个幂等操作（load 可被反复调用而无需关心内部状态）
 * 3. 自动播放降级：直接播被浏览器策略拦截时，静音重试并回调通知（展示"点击开启声音"）
 * 4. 统一转发内核事件给上层（统计 / 进度条）
 */
export class VideoPlayer implements VideoPlayerInstance {
  /** video.js 实例（懒创建） */
  private player: Player | null = null;

  /** 当前装载的视频 */
  private loadedVideo: VideoInfo | null = null;

  /** load 时是否要求自动播放 */
  private wantAutoplay = false;

  /** 本次装载是否已上报过 play_start（由外部通过事件去重，这里记录内部静音降级状态） */
  private autoplayDegraded = false;

  /** 挂载容器 */
  private readonly container: HTMLElement;

  private readonly options: Required<Pick<VideoPlayerOptions, 'controls' | 'loop' | 'muted' | 'playsInline'>> &
    VideoPlayerOptions;

  /** 内核事件回调 */
  onCoreEvent?: (event: PlayerCoreEvent, payload: PlayerCoreEventPayload) => void;

  /** 自动播放被拦截、已降级为静音播放时回调（上层提示用户点击开声） */
  onAutoplayDegraded?: () => void;

  constructor(container: HTMLElement, options: VideoPlayerOptions = {}) {
    this.container = container;
    this.options = {
      autoplay: options.autoplay ?? true,
      muted: options.muted ?? true,
      loop: options.loop ?? false,
      controls: options.controls ?? false,
      preload: options.preload ?? 'auto',
      fit: options.fit ?? 'cover',
      playsInline: options.playsInline ?? true,
    };
  }

  /** 惰性创建 video.js 实例：第一次 load 时才创建，避免空实例常驻 */
  private ensurePlayer(): Player {
    if (this.player) {
      return this.player;
    }
    // ⚠️ video.js 要求初始元素必须是 <video>/<audio>/<video-js>，
    // 传入 div 会被当作媒体元素 "tag"（Player.createEl 会给它加 vjs-tech 类、
    // setupSourceset 会在它上面 defineProperty('src')），
    // 原生 src setter 的 this 不是媒体元素 → TypeError: Illegal invocation
    const videoEl = document.createElement('video');
    // ⚠️ 必须带 video-js 类：video.js 初始化时会把 tag 的 class 原样拷贝到
    // 播放器外壳 div 上，外壳有了 .video-js，video-js.css 的布局规则
    // （.video-js .vjs-tech { position:absolute; width:100%; height:100% }）才能生效，
    // 否则 <video> 按原始分辨率渲染、溢出容器被裁切（表现为只看到画面左上角一块）
    videoEl.classList.add('video-js', 'vkit-video-el');
    this.container.appendChild(videoEl);

    this.player = videojs(videoEl, {
      controls: this.options.controls,
      loop: this.options.loop,
      muted: this.options.muted,
      preload: this.options.preload,
      // 移动端必须 inline，否则 iOS 会强制全屏接管
      playsinline: this.options.playsInline,
      // 抖音式 UI：隐藏原生控制条，禁用右键菜单式的原生交互
      controlBar: {playToggle: false, pictureInPictureToggle: false},
      bigPlayButton: false,
      userActions: {doubleClick: false},
      html5: {
        // HLS 由 video.js 8 内置的 @videojs/http-streaming（VHS）支持，无需额外插件
        vhs: {overrideNative: !videojs.browser.IS_SAFARI},
      },
    });
    this.bindCoreEvents();
    this.applyFit(this.options.fit ?? 'cover');
    return this.player;
  }

  private bindCoreEvents() {
    const p = this.player;
    if (!p) return;
    const payload = (error?: unknown): PlayerCoreEventPayload => ({
      currentTime: p.currentTime() || 0,
      duration: p.duration() || 0,
      // 真实媒体尺寸：后端没给宽高时，上层可用它回填并驱动横竖屏自适应
      videoWidth: p.videoWidth() || undefined,
      videoHeight: p.videoHeight() || undefined,
      error,
    });
    p.on('play', () => this.emit('play', payload()));
    p.on('pause', () => this.emit('pause', payload()));
    p.on('ended', () => this.emit('ended', payload()));
    p.on('timeupdate', () => this.emit('timeupdate', payload()));
    p.on('loadedmetadata', () => this.emit('loadedmetadata', payload()));
    p.on('waiting', () => this.emit('waiting', payload()));
    p.on('error', () => this.emit('error', payload(p.error())));
  }

  private emit(event: PlayerCoreEvent, payload: PlayerCoreEventPayload) {
    this.onCoreEvent?.(event, payload);
  }

  /** object-fit 作用在 video.js 的 tech 元素上 */
  private applyFit(fit: 'cover' | 'contain') {
    const el = this.container.querySelector('video');
    if (el) {
      el.style.objectFit = fit;
    }
  }

  load(video: VideoInfo, autoplay = true): void {
    const p = this.ensurePlayer();

    // 幂等：重复装载同一视频直接跳过（3 实例轮转时会频繁触发）
    if (this.loadedVideo?.id === video.id) {
      return;
    }

    this.loadedVideo = video;
    this.wantAutoplay = autoplay;
    this.autoplayDegraded = false;

    p.src({
      src: video.url,
      // 不传 type 时交给 video.js 猜测（m3u8/mp4 均可识别），显式传入更稳
      type: video.sources?.[0]?.type ?? this.guessType(video.url),
    });
    if (video.poster) {
      p.poster(video.poster);
    }
    // 邻居实例的 preload 由 PlayerPool 按网络策略调好，这里只在首次创建时生效
    this.applyFit(this.options.fit ?? 'cover');

    if (autoplay) {
      void this.play();
    }
  }

  /** 简单的扩展名推断，兜底 video.js 的类型探测 */
  private guessType(url: string): string {
    const clean = url.split('?')[0] ?? '';
    if (clean.endsWith('.m3u8')) return 'application/x-mpegURL';
    return 'video/mp4';
  }

  async play(): Promise<boolean> {
    const p = this.player;
    if (!p || !this.loadedVideo) return false;
    try {
      await p.play();
      return true;
    } catch (err) {
      // 自动播放策略拦截：静音后重试一次
      if (!p.muted()) {
        p.muted(true);
        this.autoplayDegraded = true;
        try {
          await p.play();
          this.onAutoplayDegraded?.();
          return true;
        } catch {
          return false;
        }
      }
      // AbortError（用户快速切换导致 load 打断 play）属正常现象，不算失败
      if (err instanceof DOMException && err.name === 'AbortError') {
        return true;
      }
      return false;
    }
  }

  pause(): void {
    this.player?.pause();
  }

  setMuted(value: boolean): void {
    this.player?.muted(value);
  }

  setVolume(v: number): void {
    this.player?.volume(Math.min(1, Math.max(0, v)));
  }

  isMuted(): boolean {
    return this.player?.muted() ?? true;
  }

  /** 当前装载的视频（供 Pool 查询轮转状态） */
  get video(): VideoInfo | null {
    return this.loadedVideo;
  }

  get isAutoplayDegraded(): boolean {
    return this.autoplayDegraded;
  }

  /** load 时是否要求过自动播放（Pool 旋转后恢复播放状态用） */
  get autoplayWanted(): boolean {
    return this.wantAutoplay;
  }

  isLoaded(videoId: VideoInfo['id']): boolean {
    return this.loadedVideo?.id === videoId;
  }

  currentTime(): number {
    return this.player?.currentTime() || 0;
  }

  duration(): number {
    return this.player?.duration() || 0;
  }

  /** 是否处于播放中 */
  isPlaying(): boolean {
    return !!this.player && !this.player.paused();
  }

  /** 定位到指定进度（秒） */
  seek(seconds: number): void {
    this.player?.currentTime(seconds);
  }

  /** 设置播放倍速（长按倍速等场景） */
  setPlaybackRate(rate: number): void {
    this.player?.playbackRate(rate);
  }

  /** 当前倍速 */
  getPlaybackRate(): number {
    return this.player?.playbackRate() ?? 1;
  }

  /**
   * 重新装载当前视频（播放失败后点「重试」用）
   *
   * 注意先把 loadedVideo 置空：load() 有「同一视频直接跳过」的幂等保护，
   * 不清掉的话重试会被当成重复装载而什么都不做。
   */
  reload(): void {
    const video = this.loadedVideo;
    if (!video) return;
    this.loadedVideo = null;
    this.load(video, this.wantAutoplay);
  }

  /** 动态调整 preload（网络策略变化 / 角色从 next 变为 current 时调用） */
  setPreload(value: 'auto' | 'metadata' | 'none'): void {
    this.player?.preload(value);
  }

  reset(): void {
    if (!this.player) return;
    this.player.pause();
    // player.reset() 清空源并复位 tech（src("") 会把源指向页面自身 URL，产生无谓请求）
    this.player.reset();
    this.loadedVideo = null;
    this.autoplayDegraded = false;
  }

  destroy(): void {
    if (!this.player) return;
    this.player.dispose();
    this.player = null;
    this.loadedVideo = null;
    // dispose 会连同 .video-js 包裹层与内部 <video> 一起移除，容器恢复空壳待复用
    this.container.innerHTML = '';
  }
}
