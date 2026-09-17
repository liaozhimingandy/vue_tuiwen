/**
 * 全局运行时配置
 *
 * 该模块在应用启动最早期被引入（main.ts 中先于 Vue 实例），
 * 因此这里的取值一旦确定就不会再变化，属于"启动快照"。
 *
 * 地址读取优先级（与 common/endpoint-detector.ts 保持一致）：
 *   用户自定义(localStorage) > 自动探测缓存 > 环境变量 > 内置默认值
 */

/** API 地址最终兜底值 */
const DEFAULT_API_BASE_URL = 'https://api.tuiwen.alsoapp.com';

/** 静态资源 / CDN 地址最终兜底值 */
const DEFAULT_CDN_BASE_URL = 'https://api.tuiwen.alsoapp.com';

/** 邮箱后缀最终兜底值（逗号分隔字符串） */
const DEFAULT_MAIL_SUFFIX = '@qq.com,@163.com,@gmail.com';

/**
 * 把环境变量解析为真正的布尔值
 *
 * ⚠️ 重要：Vite 注入的 `import.meta.env.*` 值全部是**字符串**，
 * 所以 `"False"`、`"false"` 在 JS 里都是 truthy。
 * 若直接写 `import.meta.env.VITE_APP_IS_DEBUG || false`，
 * 生产环境（.env.production 中 VITE_APP_IS_DEBUG=False）会被误判为"调试模式"，
 * 导致调试日志、开发分支逻辑在生产包中依然生效。
 *
 * @param val 原始环境变量值
 * @param defaultValue 未配置时的默认值
 * @returns 解析后的布尔值（仅 "true"/"1"/"yes"/"on" 视为真）
 */
function parseEnvBoolean(val: unknown, defaultValue = false): boolean {
  if (val === undefined || val === null || String(val).trim() === '') {
    return defaultValue;
  }
  return ['true', '1', 'yes', 'on'].includes(String(val).trim().toLowerCase());
}

/**
 * 通用读取本地 JSON 存储工具
 * 存储结构固定：{ url: string; time: number }
 *
 * @param storageKey localStorage 的 key
 * @returns 解析成功返回 url 字符串，失败/不存在返回 null
 */
function getStorageUrlItem(storageKey: string): string | null {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return null;

  try {
    const data = JSON.parse(raw);
    if (data?.url && typeof data.url === 'string') {
      return data.url.trim();
    }
    return null;
  } catch (err) {
    console.warn(`[${storageKey}] JSON 解析异常`, err);
    return null;
  }
}

/**
 * 全局配置对象
 *
 * 说明：
 * - 每一项都保证最终结果**非空**，避免下游出现 `undefined.xxx` 崩溃；
 * - `isDebug` 已由字符串修正为真正的 boolean。
 */
export const config = {
  /** 本应用（前端站点）地址，用于生成分享链接 */
  APP_BASE_URL: import.meta.env.VITE_APP_BASE_URL_APP || 'https://tuiwen.alsoapp.com',

  /**
   * 当前生效的接口地址
   * 启动时读取一次，运行期切换节点由 endpoint-detector 维护缓存，
   * 需要动态取值请使用 `getApiBaseUrl()`。
   */
  API_BASE_URL:
    localStorage.getItem('CUSTOM_API_BASE_URL') ||
    getStorageUrlItem('tw_endpoint_api') ||
    import.meta.env.VITE_APP_API_BASE_URL ||
    DEFAULT_API_BASE_URL,

  /** 是否处于调试模式（决定 logger 是否输出） */
  isDebug: parseEnvBoolean(import.meta.env.VITE_APP_IS_DEBUG, false),

  /** 应用名称 */
  NAME: '推文',

  /** 主题色 */
  THEME_COLOR: '#027AFF',

  /** 页面背景色 */
  BG_COLOR: '#E9EBEE',

  /** 环境变量中配置的原始接口地址（不含用户自定义与探测缓存） */
  API_BASE_URL_ORI: import.meta.env.VITE_APP_API_BASE_URL || DEFAULT_API_BASE_URL,

  /** 远端节点清单文件地址 */
  ENDPOINT_URL: import.meta.env.VITE_APP_ENDPOINT_URL || 'https://www.alsoapp.com/static/tuiwen/endpoints.json',

  /** Cloudflare Turnstile 人机验证 site key（默认值为官方测试 key） */
  TURNSTILE_SITE_KEY: import.meta.env.VITE_APP_TURNSTILE_SITE_KEY || '1x00000000000000000000AA',

  /** 静态资源 / 图片 CDN 地址（保证非空） */
  CDN_BASE_URL: import.meta.env.VITE_CDN_BASE_URL || getStorageUrlItem('tw_endpoint_api') || DEFAULT_CDN_BASE_URL,

  /** 允许注册的邮箱后缀列表 */
  MAIL_SUFFIX: String(import.meta.env.VITE_MAIL_SUFFIX || DEFAULT_MAIL_SUFFIX).split(','),
};
