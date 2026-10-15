/**
 * 统计上报
 *
 * 播放器内核只负责吐「原始事件」（播放/暂停/进度…），
 * 这里把它们加工成「业务埋点事件」并通过 StatsReporter 上报。
 * 默认实现是 ConsoleStatsReporter（打印到控制台），
 * 接入真实埋点系统时，实现一个 StatsReporter 换进去即可，核心链路零改动。
 */

export type VideoEventType =
  | 'impression' // 曝光：视频成为当前播放位
  | 'play_start' // 首次起播（每次 load 后只算一次）
  | 'play_progress' // 播放进度里程碑（25/50/75%）
  | 'complete' // 播放完成（>95%）
  | 'pause'
  | 'resume'
  | 'heartbeat' // 播放心跳（每 5s）
  | 'error'
  | 'like'
  | 'unlike'
  | 'open_comments'
  | 'share';

export interface VideoStatEvent {
  type: VideoEventType;
  /** 视频 id */
  videoId: string | number;
  /** 事件发生时的播放位置（秒） */
  position: number;
  /** 视频总时长（秒） */
  duration: number;
  /** 附加信息（里程碑百分比 / 错误信息等） */
  extra?: Record<string, unknown>;
  /** 事件时间戳 */
  timestamp: number;
}

export interface StatsReporter {
  report(event: VideoStatEvent): void;
}

/** 默认上报器：开发期打印控制台 */
export class ConsoleStatsReporter implements StatsReporter {
  report(event: VideoStatEvent) {
    // eslint-disable-next-line no-console
    console.debug(
      `[video-kit] ${event.type} video=${event.videoId} pos=${event.position.toFixed(1)}/${event.duration.toFixed(1)}s`,
      event.extra ?? '',
    );
  }
}

/** 进度里程碑 */
export const PROGRESS_MILESTONES = [0.25, 0.5, 0.75] as const;

/** 心跳间隔（毫秒） */
export const HEARTBEAT_INTERVAL = 5000;
