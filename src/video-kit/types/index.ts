/**
 * 视频源
 */
export interface VideoSource {
  /**
   * 视频地址
   */
  url: string;
  /**
   * video.js 类型
   *
   * video/mp4
   *
   * application/x-mpegURL
   */
  type?: 'video/mp4' | 'application/x-mpegURL';

  /**
   * 清晰度
   *
   * 360
   * 720
   * 1080
   */
  quality?: number | string;

  /**
   * 文件大小
   */
  size?: number;
}

/**
 * 视频信息
 */
export interface VideoInfo {
  /**
   * 视频ID
   */
  id: string | number;

  /**
   * 默认播放地址
   *
   * 可以是:
   *
   * mp4
   *
   * m3u8
   */
  url: string;

  /**
   * 视频源列表
   *
   * 用于多码率
   */
  sources?: VideoSource[];
  /**
   * 封面
   */
  poster?: string;

  /**
   * 视频宽度
   *
   * 例如:
   *
   * 1080
   */
  width: number;

  /**
   * 视频高度
   *
   * 例如:
   *
   * 1920
   */
  height: number;

  /**
   * 视频时长
   *
   * 秒
   */
  duration?: number;

  /**
   * 视频标题
   */
  title?: string;

  /**
   * 视频描述
   */
  description?: string;
  /**
   * 作者信息
   */
  author?: VideoAuthor;
  /**
   * 互动数据
   */
  stats?: VideoStats;

  /**
   * 创建时间
   */
  createdAt?: string;
  /**
   * 扩展字段
   */
  extra?: Record<string, any>;
}

/**
 * 作者
 */
export interface VideoAuthor {
  id: string | number;
  username: string;
  avatar?: string;
}

/**
 * 视频统计
 */
export interface VideoStats {
  views: number;
  likes: number;
  comments: number;
  shares: number;
}

/**
 * 视频方向
 */
export type VideoOrientation = 'portrait' | 'landscape' | 'square';

/**
 * 播放器配置
 */
export interface VideoPlayerOptions {
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  preload?: 'auto' | 'metadata' | 'none';

  fit?: 'cover' | 'contain';

  /**
   * 移动端内联播放（iOS 必须开启，否则会强制接管全屏）
   */
  playsInline?: boolean;
}
