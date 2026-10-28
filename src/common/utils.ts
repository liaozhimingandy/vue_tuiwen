/**
 * 通用工具函数集合
 *
 * 包含：时间格式化、日志封装、富文本处理、资源地址拼接、剪贴板等纯函数，
 * 不依赖任何组件实例，可在任意位置引入。
 */
import {config} from './config.ts';
import {CUSTOM_FACE_MAP, CUSTOM_FACE_REG} from './emoji.ts';

/**
 * 数字补零：不足两位时前面补 0
 * @param num 待处理数字（或数字字符串）
 */
const zeroize = (num: string) => {
  return (String(num).length === 1 ? '0' : '') + num;
};

/**
 * 将时间字符串格式化为站内展示用的相对时间
 *
 * 规则：1 分钟内 → "刚刚"；1 小时内 → "N分钟前"；
 * 当天 → "今天HH:mm"；前一天 → "昨天HH:mm"；
 * 同年 → "MM月DD日 HH:mm"；跨年 → "YYYY年MM月DD日 HH:mm"
 *
 * @param datetime 后端返回的时间字符串
 */
export const timestampFormat = (datetime: string) => {
  if (!datetime) return '';
  const time = new Date(datetime).getTime();
  // 非法时间串（后端字段缺失 / 格式异常）会得到 Invalid Date，
  // 继续参与计算会渲染成 "NaN年NaN月NaN日 NaN:NaN"，这里直接兜底为空
  if (Number.isNaN(time)) return '';

  const timestamp = Math.floor(time / 1000);
  const curTimestamp = Math.floor(Date.now() / 1000); // 当前时间戳
  const timestampDiff = curTimestamp - timestamp; // 参数时间戳与当前时间戳相差秒数
  const curDate = new Date(curTimestamp * 1000); // 当前时间日期对象
  const tmDate = new Date(timestamp * 1000); // 参数时间戳转换成的日期对象
  const Y = tmDate.getFullYear();
  const m = tmDate.getMonth() + 1;
  const d = tmDate.getDate();
  const H = tmDate.getHours();
  const i = tmDate.getMinutes();

  if (timestampDiff < 60) {
    // 一分钟以内
    return '刚刚';
  } else if (timestampDiff < 3600) {
    // 一小时前之内
    return Math.floor(timestampDiff / 60) + '分钟前';
  } else if (curDate.getFullYear() === Y && curDate.getMonth() + 1 === m && curDate.getDate() === d) {
    return '今天' + zeroize(String(H)) + ':' + zeroize(String(i));
  } else {
    /**
     * 「昨天」按**日历日期**判断，而不是「当前时间戳往前推 86400 秒」。
     * 后者会在这些场景算错：
     * - 夏令时切换当天（一天并不是 86400 秒）；
     * - 今天凌晨 00:30 看昨晚 23:59 的推文：减 86400 后落到前天，被误判为「前天」。
     */
    const yesterday = new Date(curDate.getFullYear(), curDate.getMonth(), curDate.getDate() - 1);
    if (yesterday.getFullYear() === Y && yesterday.getMonth() + 1 === m && yesterday.getDate() === d) {
      return '昨天' + zeroize(String(H)) + ':' + zeroize(String(i));
    } else if (curDate.getFullYear() === Y) {
      return zeroize(String(m)) + '月' + zeroize(String(d)) + '日 ' + zeroize(String(H)) + ':' + zeroize(String(i));
    } else {
      return (
        Y +
        '年' +
        zeroize(String(m)) +
        '月' +
        zeroize(String(d)) +
        '日 ' +
        zeroize(String(H)) +
        ':' +
        zeroize(String(i))
      );
    }
  }
};

/**
 * 从实体对象上取时间字段
 *
 * 后端已把创建时间统一为 `created_at`（帖子/评论/快照/通知都是列名 created_at），
 * 历史上出现过的 `create_at`（少个 d）与 `gmt_created`（老用户表命名）都已废弃。
 * 这里仍保留一条兜底链：接口缓存、离线数据里可能还残留旧字段，
 * 取不到时返回空字符串而不是让 `new Date(undefined)` 变成 NaN。
 *
 * @param item 任意带时间字段的对象
 * @returns 时间字符串；均缺失时返回空字符串
 */
export function getEntityTime(
  item?: {created_at?: string | null; create_at?: string | null; gmt_created?: string | null} | null,
): string {
  if (!item) return '';
  return item.created_at || item.create_at || item.gmt_created || '';
}

/**
 * 按创建时间倒序比较（最新在前）
 * 供 Array.prototype.sort 使用
 */
export function compareByTimeDesc<T extends {created_at?: string | null; create_at?: string | null}>(
  a: T,
  b: T,
): number {
  return new Date(getEntityTime(b)).getTime() - new Date(getEntityTime(a)).getTime();
}

/**
 * 日志封装：仅在调试模式下输出
 * 生产环境（config.isDebug === false）静默，避免污染控制台
 */
export const logger = {
  info: (...args: any[]) => {
    if (config.isDebug) {
      console.info(...args);
    }
  },
  log: (...args: any[]) => {
    if (config.isDebug) {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    if (config.isDebug) {
      console.error(...args);
    }
  },
  warn: (...args: any[]) => {
    if (config.isDebug) {
      console.warn(...args);
    }
  },
};

/**
 * 移除富文本首尾多余的空段落：<p><br></p> / <p></p>
 *
 * @param html 原始富文本
 * @returns 去除首尾空段后的富文本
 */
export const trimEmptyParagraph = (html: string) => {
  if (!html) return '';
  // 循环清除头部空段落
  const emptyP = /^(<p>\s*(<br\s*\/?>)?\s*<\/p>)+/gi;
  // 循环清除尾部空段落
  const emptyPTail = /(<p>\s*(<br\s*\/?>)?\s*<\/p>)+$/gi;

  let result = html.replace(emptyP, '');
  result = result.replace(emptyPTail, '');
  return result;
};

/**
 * 渲染正文 HTML
 * 原生 emoji 自动保留，仅把 [face:xxx] 替换为图片
 *
 * @param rawText 原始正文
 * @returns 替换表情后的 HTML 片段
 */
export function formatMessageToHtml(rawText: string): string {
  return rawText.replace(CUSTOM_FACE_REG, (match, code) => {
    const faceInfo = CUSTOM_FACE_MAP[code];
    // 找不到对应表情，原样返回文本，防止恶意构造文本报错
    if (!faceInfo) return match;
    return `<img src="${faceInfo.src}" style="width:26px;height:26px;vertical-align:middle;margin:0 2px;" />`;
  });
}

/**
 * 拼接图片完整地址
 *
 * @param path 后端返回路径：支持相对路径 /xxx.jpg 或者已经是完整 https 链接
 * @returns 可直接用于 img.src 的完整 url
 */
export function getResourceUrl(path?: string): string {
  if (!path) return '';
  // 如果已经是完整 http/https 链接，直接返回（兼容 OSS 全链接场景）
  if (/^https?:\/\//.test(path)) {
    return path;
  }
  // 防止重复拼接 //
  const base = config.CDN_BASE_URL.endsWith('/') ? config.CDN_BASE_URL.slice(0, -1) : config.CDN_BASE_URL;
  const relPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${relPath}`;
}

/**
 * 随机生成树洞匿名昵称
 * 当用户别名输入为空/全空格时调用
 *
 * @returns 形如 "晚风旅人1024" 的随机昵称
 */
export function generateRandomAlias(): string {
  const prefix = [
    '晚风',
    '星河',
    '雾里',
    '月下',
    '深海',
    '孤岛',
    '拾光',
    '星落',
    '云边',
    '野渡',
    '浅梦',
    '寒屿',
    '枕月',
    '观雾',
    '寻风',
    '青梧',
    '南柯',
    '渡川',
    '孤舟',
    '晚叙',
    '眠星',
    '暮野',
    '山隐',
  ];
  const suffix = [
    '旅人',
    '过客',
    '信使',
    '拾梦者',
    '摆渡人',
    '守望者',
    '流浪客',
    '寄信人',
    '追光者',
    '渡客',
    '闲人',
    '访客',
    '听风人',
    '观月客',
    '寻路人',
    '夜游者',
  ];
  // 随机 4 位数字后缀，降低重名概率
  const randomNum = Math.floor(Math.random() * 9000 + 1000);

  const r1 = prefix[Math.floor(Math.random() * prefix.length)];
  const r2 = suffix[Math.floor(Math.random() * suffix.length)];

  return `${r1}${r2}${randomNum}`;
}

/** 大数字紧凑格式化（如 12000 → 1.2万），用于点赞/浏览数展示 */
export const formatter = new Intl.NumberFormat('zh-CN', {notation: 'compact', compactDisplay: 'long'});

/**
 * 将 html 中 img 标签的 /static 开头相对 src 替换为 CDN 绝对地址
 * ✅只处理 /static 相对路径；http/https 已经是完整域名的链接直接跳过不改动
 *
 * @param html 原始富文本
 * @param cdnPrefix CDN 域名，不要末尾斜杠，示例：https://cdn.yourdomain
 * @returns 处理后 html
 */
export function rewriteImgCdnPrefix(html: string, cdnPrefix: string): string {
  if (!html) return '';
  // 负向预查 (?!https?:)：排除已经 http / https 开头的 src
  return html.replace(/(<img[^>]+src=(["']))(?!https?:)(\/static[^"']*)\2/gi, `$1${cdnPrefix}$3$2`);
}

/**
 * 生成预览阶段 html，用于 RichLineClamp 截断
 * 无论帖子是纯文本 / 富文本，统一走这个函数
 * 展开时直接使用原始 post.content.text，不做处理
 *
 * @param rawHtml 原始富文本
 * @param cdnPrefix CDN 域名，默认取全局配置（避免误用占位域名）
 * @returns 适合截断预览的 html
 */
export const getClampPreviewHtml = (rawHtml: string, cdnPrefix: string = config.CDN_BASE_URL): string => {
  if (!rawHtml) return '';
  let html = rawHtml;
  // 合并连续空段落 <p><br></p>
  html = html.replace(/(<p>\s*<br\s*\/?>\s*<\/p>){2,}/gi, '<br>');
  // 把 <p> 块级标签降级成 <br>，消除 p 标签自带 margin 上下间距
  html = html.replace(/<\/p>\s*<p>/gi, '<br>');
  html = html.replace(/<p>/gi, '');
  html = html.replace(/<\/p>/gi, '');

  // 匹配 src="/static/xxx"，把 /static 前面拼接 cdn 前缀
  html = rewriteImgCdnPrefix(html, cdnPrefix);
  return html;
};

/**
 * 复制文本到剪贴板
 * 优先使用 Clipboard API，失败时降级到 execCommand 兼容模式
 *
 * @param url 待复制文本
 * @param MessagePlugin TDesign 消息组件（由调用方注入，避免此处硬依赖）
 */
export const copyLink = async (url: string, MessagePlugin: any) => {
  try {
    await navigator.clipboard.writeText(url);
    await MessagePlugin.success('链接已复制到剪贴板');
  } catch {
    // 兼容模式：非 HTTPS 或旧浏览器不支持 Clipboard API
    const input = document.createElement('input');
    input.value = url;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    await MessagePlugin.success('链接已复制（兼容模式）');
  }
};
