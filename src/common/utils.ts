import {config} from "./config.ts";
import {CUSTOM_FACE_MAP, CUSTOM_FACE_REG} from "./emoji.ts";

const zeroize = (num: string) => {
    return (String(num).length == 1 ? '0' : '') + num;
};


export const timestampFormat = (datetime: string) => {
    // 时间显示格式
    let timestamp = parseInt((new Date(datetime).getTime() / 1000).toString());
    const curTimestamp = parseInt((new Date().getTime() / 1000).toString()); //当前时间戳
    const timestampDiff = curTimestamp - timestamp; // 参数时间戳与当前时间戳相差秒数
    const curDate = new Date(curTimestamp * 1000); // 当前时间日期对象
    const tmDate = new Date(timestamp * 1000); // 参数时间戳转换成的日期对象
    const Y = tmDate.getFullYear();
    const m = tmDate.getMonth() + 1;
    const d = tmDate.getDate();
    const H = tmDate.getHours();
    const i = tmDate.getMinutes();
    //const s = tmDate.getSeconds();
    if (timestampDiff < 60) { // 一分钟以内
        return "刚刚";
    } else if (timestampDiff < 3600) { // 一小时前之内
        return Math.floor(timestampDiff / 60) + "分钟前";
    } else if (curDate.getFullYear() == Y && curDate.getMonth() + 1 == m && curDate.getDate() == d) {
        return '今天' + zeroize(String(H)) + ':' + zeroize(String(i));
    } else {
        var newDate = new Date((curTimestamp - 86400) * 1000); // 参数中的时间戳加一天转换成的日期对象
        if (newDate.getFullYear() == Y && newDate.getMonth() + 1 == m && newDate.getDate() == d) {
            return '昨天' + zeroize(String(H)) + ':' + zeroize(String(i));
        } else if (curDate.getFullYear() == Y) {
            return zeroize(String(m)) + '月' + zeroize(String(d)) + '日 ' + zeroize(String(H)) + ':' + zeroize(String(i));
        } else {
            return Y + '年' + zeroize(String(m)) + '月' + zeroize(String(d)) + '日 ' + zeroize(String(H)) + ':' + zeroize(String(i));
        }
    }
}


// 只在开发环境打印日志
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
            console.error(...args);
        }
    }
};


/**
 * 移除富文本 首尾多余空段落：<p><br></p> / <p></p>
 */
export const trimEmptyParagraph = (html: string) => {
    if (!html) return "";
    // 循环清除头部空段落
    const emptyP = /^(<p>\s*(<br\s*\/?>)?\s*<\/p>)+/gi;
    // 循环清除尾部空段落
    const emptyPTail = /(<p>\s*(<br\s*\/?>)?\s*<\/p>)+$/gi;

    let result = html.replace(emptyP, "");
    result = result.replace(emptyPTail, "");
    return result;
}

/**
 * 渲染正文HTML
 * 原生emoji自动保留，仅把 [face:xxx] 替换为图片
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
 * @param path 后端返回路径：支持相对路径 /xxx.jpg 或者已经是完整https链接
 * @returns 可直接img.src使用的完整url
 */
export function getResourceUrl(path?: string): string {
  if (!path) return ''
  // 如果已经是完整 http/https 链接，直接返回（兼容OSS全链接场景）
  if (/^https?:\/\//.test(path)) {
    return path
  }
  // 防止重复拼接 //
  const base = config.CDN_BASE_URL.endsWith('/') ? config.CDN_BASE_URL.slice(0, -1) : config.CDN_BASE_URL
  const relPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${relPath}`
}

/**
 * 随机生成树洞匿名昵称
 * 当用户别名输入为空/全空格时调用
 */
export function generateRandomAlias(): string {
    const prefix = [
        "晚风", "星河", "雾里", "月下", "深海", "孤岛", "晚风", "拾光",
        "星落", "云边", "野渡", "浅梦", "寒屿", "枕月", "观雾", "寻风",
        "青梧", "南柯", "渡川", "孤舟", "晚叙", "眠星", "暮野", "山隐"
    ];
    const suffix = [
        "旅人", "过客", "信使", "拾梦者", "摆渡人", "守望者", "流浪客", "寄信人",
        "追光者", "渡客", "闲人", "访客", "听风人", "观月客", "寻路人", "夜游者"
    ];
    // 随机 4位数字后缀，降低重名概率
    const randomNum = Math.floor(Math.random() * 9000 + 1000);

    const r1 = prefix[Math.floor(Math.random() * prefix.length)];
    const r2 = suffix[Math.floor(Math.random() * suffix.length)];

    return `${r1}${r2}${randomNum}`;
}


export const formatter = new Intl.NumberFormat('zh-CN', {'notation':'compact','compactDisplay':'long'})

/**
 * 将html中img标签 /static 开头相对src替换为CDN绝对地址
 * ✅只处理 /static 相对路径；http/https已经是完整域名的链接直接跳过不改动
 * @param html 原始富文本
 * @param cdnPrefix CDN域名，不要末尾斜杠，示例：https://cdn.yourdomain
 * @returns 处理后html
 */
export function rewriteImgCdnPrefix(html: string, cdnPrefix: string): string {
  if (!html) return ''
  // 负向预查 (?!https?:)：排除已经 http / https 开头的src
  return html.replace(
    /(<img[^>]+src=(["']))(?!https?:)(\/static[^"']*)\2/gi,
    `$1${cdnPrefix}$3$2`
  )
}


/**
 * 生成预览阶段html，用于RichLineClamp截断
 * 无论帖子是纯文本 / 富文本，统一走这个函数
 * 展开时直接使用原始 post.content.text，不做处理
 */
export const getClampPreviewHtml = (rawHtml: string, cdnPrefix = "https://cdn.yourdomain"): string => {
  if (!rawHtml) return ''
  let html = rawHtml
  // 合并连续空段落 <p><br></p>
  html = html.replace(/(<p>\s*<br\s*\/?>\s*<\/p>){2,}/gi, '<br>')
  // 把<p>块级标签降级成 <br>，消除p标签自带margin上下间距
  html = html.replace(/<\/p>\s*<p>/gi, '<br>')
  html = html.replace(/<p>/gi, '')
  html = html.replace(/<\/p>/gi, '')

  // 匹配 src="/static/xxx"，把 /static 前面拼接cdn前缀
  html = rewriteImgCdnPrefix(html, cdnPrefix);
  return html;
}


// 复制链接
export const copyLink = async (url: string, MessagePlugin: any) => {
  try {
    await navigator.clipboard.writeText(url);
    await MessagePlugin.success('链接已复制到剪贴板');
  } catch {
    const input = document.createElement('input');
    input.value = url;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    await MessagePlugin.success('链接已复制（兼容模式）');
  }
};