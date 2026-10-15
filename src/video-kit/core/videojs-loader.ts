/**
 * video.js 动态加载器
 *
 * 背景：video.js 打包后约 700KB（gzip ~200KB），而它只在短视频这一条业务线上用到。
 * 静态 import 会把它并进短视频路由 chunk —— 用户点进 /shorts/ 必须先下完这 700KB
 * 才能看到任何界面，首屏直接被播放器内核绑架。
 *
 * 改成动态 import 后的时序：
 *   1. 短视频浮层（封面、标题、互动栏、手势层）先渲染，用户立刻看到内容；
 *   2. 播放器内核与样式在后台并行下载；
 *   3. 下载完成后 PlayerPool.onModuleReady() 补装「内核未就绪期间被推迟」的 load 请求。
 *
 * 对上层是透明的：VideoPlayer 仍按同步方式调用 load()，内核没到时请求被暂存，
 * 到了之后自动补装，调用方不需要关心异步。
 */

/** video.js 的默认导出（videojs 函数本身，带 .browser 等静态属性） */
type VideoJsStatic = (typeof import('video.js'))['default'];

/** 已加载好的模块（同步访问入口，未就绪为 null） */
let cached: VideoJsStatic | null = null;

/** 正在进行的加载（并发调用复用同一个 Promise，避免重复下载） */
let inflight: Promise<VideoJsStatic> | null = null;

/** 同步取已加载的 video.js；未就绪返回 null（调用方需自行暂存意图） */
export function getVideoJs(): VideoJsStatic | null {
  return cached;
}

/** video.js 是否已就绪 */
export function isVideoJsReady(): boolean {
  return cached !== null;
}

/**
 * 动态加载 video.js 及其样式（幂等）
 *
 * ⚠️ 失败时必须清掉 inflight：否则一次网络失败会把 rejected Promise 永久缓存下来，
 * 「重试」拿到的还是同一个失败结果，重试入口形同虚设。
 */
export function loadVideoJs(): Promise<VideoJsStatic> {
  if (cached) return Promise.resolve(cached);
  if (inflight) return inflight;

  inflight = (async () => {
    // 内核与样式并行拉取：缺了 video-js.css，.video-js 的尺寸规则不生效，
    // <video> 会按原始分辨率溢出容器（表现为只看到画面左上角一块）
    const [mod] = await Promise.all([import('video.js'), import('video.js/dist/video-js.css')]);
    const vjs = mod.default;
    cached = vjs;
    return vjs;
  })();

  // 这一路 catch 只负责「失败后允许重试」，真正的错误仍会透传给调用方
  inflight.catch(() => {
    inflight = null;
  });

  return inflight;
}
