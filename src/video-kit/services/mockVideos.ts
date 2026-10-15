/**
 * Mock 视频数据源（演示用）
 *
 * 真实接入时：把 fetchVideoPage 换成后端接口（如 axios.get('/api/videos?page=')），
 * 返回结构保持 VideoInfo[] 即可，video-kit 其余部分零改动。
 *
 * ⚠️ type 字段务必正确：
 * - MP4  → 省略 type 或 "video/mp4"（省略时按扩展名自动推断）
 * - HLS  → "application/x-mpegURL"（.m3u8）
 * 把 MP4 标成 HLS 会导致 video.js 的 VHS 把二进制当 m3u8 清单解析，直接播放失败！
 *
 * 测试源均验证过可达（2026-09-29）：
 * - pixabay CDN（2560x1440 / 22s）
 * - 字节 xgplayer 文档 CDN（国内可达，MP4 + HLS）
 * - media.w3.org（Sintel 预告片）
 */
import type {VideoInfo} from '@/video-kit/types';

const PIXABAY = 'https://cdn.pixabay.com/video/2023/02/25/152174-802335605_medium.mp4';
const XG_360P = 'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-360p.mp4';
const XG_480P = 'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/mp4/xgplayer-demo-480p.mp4';
const XG_HLS = 'https://sf1-cdn-tos.huoshanstatic.com/obj/media-fe/xgplayer_doc_video/hls/xgplayer-demo.m3u8';
const SINTEL = 'https://media.w3.org/2010/05/sintel/trailer.mp4';

const DEFS: Omit<VideoInfo, 'id'>[] = [
  {
    // 用户提供：2560x1440 横屏 / 22s / 32MB
    url: PIXABAY,
    width: 2560,
    height: 1440,
    duration: 22,
    title: '航拍晨雾森林（横屏 2.5K 实拍）',
    description: '#实拍 #风景 #横屏自动适配',
    author: {id: 'u1', username: '风光摄影师', avatar: 'https://i.pravatar.cc/100?img=12'},
    stats: {views: 128400, likes: 23000, comments: 1820, shares: 640},
    createdAt: '2026-09-20T10:00:00Z',
  },
  {
    // 用户提供：2560x1440 横屏 / 22s / 32MB
    url: 'https://cdn.pixabay.com/video/2026/06/24/360429_medium.mp4',
    width: 1440,
    height: 2560,
    duration: 59,
    title: '航拍晨雾森林（横屏 2.5K 实拍）',
    description: '#实拍 #风景 #横屏自动适配',
    author: {id: 'u1', username: '风光摄影师', avatar: 'https://i.pravatar.cc/100?img=12'},
    stats: {views: 128400, likes: 23000, comments: 1820, shares: 640},
    createdAt: '2026-09-20T10:00:00Z',
  },
  {
    // 国内可达竖屏演示：源是横屏视频，这里用竖屏元数据演示「手机大小」布局（cover 裁切画面）
    url: XG_360P,
    width: 1280,
    height: 720,
    duration: 20,
    title: '竖屏演示：视频按手机屏幕大小居中',
    description: '#竖屏布局演示',
    author: {id: 'u2', username: '交互设计笔记', avatar: 'https://i.pravatar.cc/100?img=33'},
    stats: {views: 89200, likes: 15400, comments: 980, shares: 312},
  },
  {
    // HLS 演示：m3u8 必须标 application/x-mpegURL
    url: XG_HLS,
    sources: [{url: XG_HLS, type: 'application/x-mpegURL'}],
    width: 1280,
    height: 720,
    duration: 120,
    title: 'HLS 演示：m3u8 自适应流（video.js 内置 VHS）',
    description: '#HLS #流媒体',
    author: {id: 'u3', username: '流媒体研究所', avatar: 'https://i.pravatar.cc/100?img=45'},
    stats: {views: 432100, likes: 87600, comments: 5400, shares: 2100},
  },
  {
    url: SINTEL,
    width: 854,
    height: 480,
    duration: 52,
    title: '开源短片《Sintel》预告片',
    description: '#动画 #Blender',
    author: {id: 'u4', username: '动画考古队', avatar: 'https://i.pravatar.cc/100?img=57'},
    stats: {views: 998000, likes: 210000, comments: 12000, shares: 8800},
  },
  {
    url: XG_480P,
    width: 1280,
    height: 720,
    duration: 20,
    title: '横屏演示：自动切换为横屏铺开',
    description: '#横屏布局演示',
    author: {id: 'u5', username: '前端工程师', avatar: 'https://i.pravatar.cc/100?img=68'},
    stats: {views: 65000, likes: 9800, comments: 640, shares: 230},
  },
  {
    url: PIXABAY,
    width: 2560,
    height: 1440,
    duration: 22,
    title: '同一实拍源的另一个帖子',
    description: '#实拍 #信息流无限滑动',
    author: {id: 'u6', username: '旅行日志', avatar: 'https://i.pravatar.cc/100?img=15'},
    stats: {views: 320000, likes: 56000, comments: 3200, shares: 1500},
  },
];

/** 生成 poster（MP4 无自带封面时用占位图） */
function withPoster(def: Omit<VideoInfo, 'id'>, seed: string): Omit<VideoInfo, 'id'> {
  return {poster: `https://picsum.photos/seed/${seed}/720/1280`, ...def};
}

/**
 * 分页拉取视频列表（模拟网络延迟 300ms）
 * page 从 0 开始；内容按页循环复用 DEFS，保证无限下滑永远有数据
 *
 * id 规则：`page * DEFS.length + i`，跨页唯一且稳定 —— 这是深链（`?v=<id>`）
 * 能精确定位的前提。接真实接口时同样要求 id 全局唯一。
 */
export async function fetchVideoPage(page: number): Promise<VideoInfo[]> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return DEFS.map((def, i) => ({
    ...withPoster(def, `vk-${page}-${i}`),
    id: page * DEFS.length + i,
  }));
}

/**
 * 按 id 直接取单条视频（模拟网络延迟 200ms）
 *
 * 深链专用：用户带着 `?v=<id>` 直接进来时，这条视频可能根本不在首屏那页，
 * 靠翻页去找既不现实也慢（YouTube 同样是「先取到这条，再续上推荐流」）。
 *
 * 返回值：
 * - 找到 → VideoInfo
 * - 不存在 / id 非法 → null（上层据此提示「视频不存在或已被删除」）
 */
export async function fetchVideoById(id: string | number): Promise<VideoInfo | null> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  const n = Number(id);
  // ⚠️ 别用 Number.isInteger 之外的宽松判断："" 会被 Number() 转成 0，
  // 空参数会静默定位到第 0 条，看起来像"深链生效了"其实是错的
  if (!Number.isInteger(n) || n < 0) return null;
  const def = DEFS[n % DEFS.length];
  if (!def) return null;
  return {...withPoster(def, `vk-byid-${n}`), id: n};
}
