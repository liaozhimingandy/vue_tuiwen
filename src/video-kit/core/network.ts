/**
 * 网络策略
 *
 * 依据 Network Information API（navigator.connection）给出的网络状况，
 * 决定「预加载强度」：Wi-Fi/4g 预取下一个视频的完整首帧，弱网只预取元数据甚至不预取。
 * 同时尊重用户的省流偏好（saveData）。
 *
 * 兼容性：Network Information API 仅 Chromium 系浏览器支持；
 * 不支持的环境一律按「良好网络」处理（保守降级，不影响功能）。
 */

export type EffectiveNetworkType = 'slow-2g' | '2g' | '3g' | '4g';

export interface NetworkInfo {
  effectiveType: EffectiveNetworkType;
  /** 用户开启了省流模式 */
  saveData: boolean;
  /** 估算下行速率 Mbps（可能为 undefined） */
  downlink?: number;
  /** API 是否可用 */
  supported: boolean;
}

interface NetworkInformationPlus extends EventTarget {
  effectiveType?: EffectiveNetworkType;
  saveData?: boolean;
  downlink?: number;
}

/**
 * 读取当前网络信息（不可响应式，配合 watchNetworkInfo 使用）
 */
export function getNetworkInfo(): NetworkInfo {
  const conn = (navigator as Navigator & {connection?: NetworkInformationPlus}).connection;
  if (!conn) {
    return {effectiveType: '4g', saveData: false, supported: false};
  }
  return {
    effectiveType: conn.effectiveType ?? '4g',
    saveData: !!conn.saveData,
    downlink: conn.downlink,
    supported: true,
  };
}

/**
 * 预加载策略
 * - preload：喂给 video.js / <video> 的 preload 值
 * - prefetchWindow：往前预载数据的邻居数量（3 实例体系下最大 1：只预「下一位」）
 */
export interface PreloadStrategy {
  /** 下一位（待播放）实例的 preload */
  next: 'auto' | 'metadata' | 'none';
  /** 当前（正在播放）实例的 preload */
  current: 'auto' | 'metadata' | 'none';
  /** 是否预取下一位 */
  prefetchNext: boolean;
}

/** 网络评级 → 预加载策略 映射表 */
export function getPreloadStrategy(net: NetworkInfo): PreloadStrategy {
  // 省流模式：一切从简
  if (net.saveData) {
    return {next: 'none', current: 'metadata', prefetchNext: false};
  }
  switch (net.effectiveType) {
    case 'slow-2g':
      return {next: 'none', current: 'metadata', prefetchNext: false};
    case '2g':
      return {next: 'metadata', current: 'metadata', prefetchNext: false};
    case '3g':
      return {next: 'metadata', current: 'auto', prefetchNext: true};
    case '4g':
    default:
      return {next: 'auto', current: 'auto', prefetchNext: true};
  }
}

/**
 * 订阅网络变化（内部使用 change 事件）
 * @returns 取消订阅函数
 */
export function watchNetworkInfo(callback: (net: NetworkInfo) => void): () => void {
  const conn = (navigator as Navigator & {connection?: NetworkInformationPlus}).connection;
  if (!conn || typeof conn.addEventListener !== 'function') {
    return () => {};
  }
  const handler = () => callback(getNetworkInfo());
  conn.addEventListener('change', handler);
  return () => conn.removeEventListener('change', handler);
}
