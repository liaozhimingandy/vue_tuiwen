import type {VideoInfo} from '@/video-kit/types';

/**
 * 单个播放器实例对外暴露的能力
 *
 * 设计目标：所有实例行为一致，PlayerPool 只面向该接口编程，
 * 从而实现「播放器复用」——谁在当前位/上一位/下一位，接口不变。
 */
export interface VideoPlayerInstance {
  /** 播放。失败（如浏览器自动播放策略拦截）返回 false，由调用方决定降级（静音重试等） */
  play(): Promise<boolean>;

  /** 暂停 */
  pause(): void;

  /**
   * 装载视频（会重置播放进度）
   * @param video    视频信息
   * @param autoplay 装载后是否立即尝试播放
   */
  load(video: VideoInfo, autoplay?: boolean): void;

  /** 清空当前源（回到无源状态，保留实例） */
  reset(): void;

  /** 彻底销毁实例，释放 video.js 资源，之后不可再用 */
  destroy(): void;

  /** 设置静音状态 */
  setMuted(value: boolean): void;

  /** 设置音量（0~1） */
  setVolume(v: number): void;

  /** 当前实例是否已装载了指定视频 */
  isLoaded(videoId: VideoInfo['id']): boolean;

  /** 当前播放时间（秒），无实例时返回 0 */
  currentTime(): number;

  /** 视频总时长（秒），未知时返回 0 */
  duration(): number;
}

/**
 * 播放器内核事件（统一从 video.js 转发出来的最小集合）
 */
export type PlayerCoreEvent = 'play' | 'pause' | 'ended' | 'timeupdate' | 'loadedmetadata' | 'waiting' | 'error';

export interface PlayerCoreEventPayload {
  /** 当前时间（秒） */
  currentTime: number;
  /** 总时长（秒） */
  duration: number;
  /** 视频真实宽度（px，来自 loadedmetadata） */
  videoWidth?: number;
  /** 视频真实高度（px，来自 loadedmetadata） */
  videoHeight?: number;
  /** 原始错误对象（仅 error 事件） */
  error?: unknown;
}
