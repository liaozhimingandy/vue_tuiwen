/**
 * 通用读取本地JSON存储工具
 * 存储结构固定：{ url: string; time: number }
 * @param storageKey localStorage 的 key
 * @returns 解析成功返回url字符串，失败/不存在返回 null
 */
function getStorageUrlItem(storageKey: string): string | null {
  const raw = localStorage.getItem(storageKey)
  if (!raw) return null

  try {
    const data = JSON.parse(raw)
    if (data?.url && typeof data.url === 'string') {
      return data.url.trim()
    }
    return null
  } catch (err) {
    console.warn(`[${storageKey}] JSON解析异常`, err)
    return null
  }
}

export const config = {
    APP_BASE_URL:  import.meta.env.VITE_APP_BASE_URL_APP || "https://tuiwen.alsoapp.com", //本app的URL
    API_BASE_URL: localStorage.getItem('CUSTOM_API_BASE_URL') || getStorageUrlItem('tw_endpoint_api') || import.meta.env.VITE_APP_API_BASE_URL || "https://api.tuiwen.alsoapp.com", // 请求地址
    isDebug: import.meta.env.VITE_APP_IS_DEBUG  || false ,// 是否为开发环境
    NAME: "推文",
    THEME_COLOR: "#027AFF",
    BG_COLOR: "#E9EBEE",
    API_BASE_URL_ORI: import.meta.env.VITE_APP_API_BASE_URL ||  "https://api.tuiwen.alsoapp.com",
    ENDPOINT_URL: import.meta.env.VITE_APP_ENDPOINT_URL || "https://www.alsoapp.com/static/tuiwen/endpoints.json",
    TURNSTILE_SITE_KEY: import.meta.env.VITE_APP_TURNSTILE_SITE_KEY || '1x00000000000000000000AA',
    CDN_BASE_URL: getStorageUrlItem('tw_endpoint_api') || import.meta.env.VITE_CDN_BASE_URL,
    EMAIL_SUFFIX: import.meta.env.VITE_EMAIL_SUFFIX.split(',') || '@qq.com,@163.com,@gmail.com'.split(',')

};