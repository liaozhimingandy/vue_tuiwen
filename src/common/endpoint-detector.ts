/**
 * 多服务节点探测 + 自定义地址管理
 * 支持服务：api / file / socket
 * 优先级：用户自定义(api) > 自动探测缓存 > 配置fallback > 环境变量 > 默认地址
 * 空值防护：全程杜绝空字符串作为最终地址
 */
import { config } from "./config.ts";

const CUSTOM_URL_KEY = 'CUSTOM_API_BASE_URL';
const CACHE_KEY_PREFIX = 'tw_endpoint_';
const CACHE_MAX_AGE = 8 * 60 * 60 * 1000; // 缓存有效期8小时
const CONFIG_URL = config.ENDPOINT_URL;

// ========== 类型定义 ==========
interface HealthCheck {
  path: string;
  method: string;
  timeout: number;
}

interface Endpoint {
  id: string;
  url: string;
  priority: number;
  enabled: boolean;
  health_check?: Partial<HealthCheck>;
}

interface ServiceConfig {
  protocol: string;
  strategy: 'priority' | 'fastest';
  fallback_url?: string;
  health_check: HealthCheck;
  endpoints: Endpoint[];
}

interface EndpointConfig {
  schema_version: string;
  config_version: string;
  services: Record<string, ServiceConfig>;
}

// ========== 内部工具方法 ==========

/**
 * 各服务兜底地址
 */
function getFallbackUrl(serviceName: string): string {
  const fallbackMap: Record<string, string> = {
    api: import.meta.env.VITE_APP_API_BASE_URL || 'https://api.tuiwen.alsoapp.com',
    file: 'https://file.tuiwen.alsoapp.com',
    socket: 'wss://socket.tuiwen.alsoapp.com'
  };
  return fallbackMap[serviceName] || '';
}

/**
 * 健康检查：探测单个地址是否可用
 * 注意：WebSocket 服务也用 HTTP 接口探测，浏览器无法直接探测 ws 连接
 */
function checkHealth(url: string, timeout: number): Promise<boolean> {
  return new Promise((resolve) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    fetch(url, {
      method: 'GET',
      signal: controller.signal,
      mode: 'cors',
      cache: 'no-store'
    })
      .then(res => resolve(res.ok))
      .catch(() => resolve(false))
      .finally(() => clearTimeout(timer));
  });
}

/** 加载远端节点配置文件 */
async function loadConfig(): Promise<EndpointConfig | null> {
  try {
    const res = await fetch(CONFIG_URL, { cache: 'no-store' });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/**
 * 读取指定服务的探测缓存
 * 空地址、过期地址直接返回 null
 */
function getCachedEndpoint(serviceName: string): { url: string; time: number } | null {
  try {
    const raw = localStorage.getItem(`${CACHE_KEY_PREFIX}${serviceName}`);
    if (!raw) return null;

    const data = JSON.parse(raw);
    if (!data?.url || typeof data.url !== 'string' || data.url.trim() === '') {
      return null;
    }
    if (Date.now() - data.time > CACHE_MAX_AGE) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

/**
 * 写入指定服务的探测缓存
 * 空地址坚决不写入
 */
function setCachedEndpoint(serviceName: string, url: string) {
  if (!url || url.trim() === '') return;
  localStorage.setItem(
    `${CACHE_KEY_PREFIX}${serviceName}`,
    JSON.stringify({ url, time: Date.now() })
  );
}

/**
 * 对单个服务执行节点探测
 */
async function detectService(
  serviceName: string,
  serviceConfig: ServiceConfig,
  force = false
): Promise<string> {
  // 非强制模式：先检查缓存
  if (!force) {
    const cached = getCachedEndpoint(serviceName);
    if (cached) {
      const healthPath = serviceConfig.health_check.path;
      const timeout = serviceConfig.health_check.timeout;

      // 注意：ws 地址探测时，把 wss 换成 https 来请求健康接口
      const probeUrl = cached.url.replace(/^wss?:\/\//, 'https://');
      const ok = await checkHealth(`${probeUrl}${healthPath}`, timeout);
      if (ok) return cached.url;
    }
  }

  // 初始化兜底值
  let selectedUrl = serviceConfig.fallback_url || getFallbackUrl(serviceName);

  // 无节点直接用兜底
  if (!serviceConfig.endpoints?.length) {
    setCachedEndpoint(serviceName, selectedUrl);
    return selectedUrl;
  }

  // 按优先级筛选节点
  const candidates = serviceConfig.endpoints
    .filter(item => item.enabled && item.url && item.url.trim() !== '')
    .sort((a, b) => a.priority - b.priority);

  const defaultHealth = serviceConfig.health_check;

  // 逐个探测
  for (const ep of candidates) {
    const healthPath = ep.health_check?.path || defaultHealth.path;
    const timeout = ep.health_check?.timeout || defaultHealth.timeout;

    // WebSocket 节点用 https 探测健康接口
    const probeBaseUrl = ep.url.replace(/^wss?:\/\//, 'https://');
    const ok = await checkHealth(`${probeBaseUrl}${healthPath}`, timeout);

    if (ok) {
      selectedUrl = ep.url;
      break;
    }
  }

  setCachedEndpoint(serviceName, selectedUrl);
  return selectedUrl;
}

// ========== 对外核心方法 ==========

/**
 * 获取 API 服务地址（兼容你原有调用）
 */
export function getApiBaseUrl(): string {
  // 1. 优先用户自定义
  const customUrl = localStorage.getItem(CUSTOM_URL_KEY);
  if (customUrl && customUrl.trim() !== '') {
    return customUrl;
  }

  // 2. 缓存
  const cached = getCachedEndpoint('api');
  if (cached) return cached.url;

  // 3. 兜底
  return getFallbackUrl('api');
}

/**
 * 获取文件服务地址
 */
export function getFileBaseUrl(): string {
  const cached = getCachedEndpoint('file');
  if (cached) return cached.url;
  return getFallbackUrl('file');
}

/**
 * 获取 WebSocket 服务地址
 */
export function getSocketBaseUrl(): string {
  const cached = getCachedEndpoint('socket');
  if (cached) return cached.url;
  return getFallbackUrl('socket');
}

/**
 * 通用：获取任意服务地址
 */
export function getServiceUrl(serviceName: string): string {
  if (serviceName === 'api') return getApiBaseUrl();
  const cached = getCachedEndpoint(serviceName);
  if (cached) return cached.url;
  return getFallbackUrl(serviceName);
}

/**
 * 设置用户自定义 API 地址
 */
export function setCustomApiBaseUrl(url: string) {
  if (url && url.trim() !== '') {
    localStorage.setItem(CUSTOM_URL_KEY, url.trim());
  } else {
    localStorage.removeItem(CUSTOM_URL_KEY);
  }
}

/**
 * 初始化所有服务节点探测（应用启动时调用）
 * @param force 强制重新探测
 * @returns 所有服务地址对象 { api, file, socket }
 */
export async function initEndpoints(force = false): Promise<Record<string, string>> {
  const result: Record<string, string> = {};

  // 开发环境：直接返回代理/默认地址，跳过探测
  if (import.meta.env.DEV && !force) {
    return {
      api: '/api',
      file: '/file',
      socket: ''
    };
  }

  // api 服务：有自定义地址则跳过探测
  const customUrl = localStorage.getItem(CUSTOM_URL_KEY);
  if (customUrl && customUrl.trim() !== '' && !force) {
    result.api = customUrl;
  }

  // 加载配置
  const config = await loadConfig();
  if (!config?.services) {
    // 配置加载失败：全部走兜底
    for (const name of ['api', 'file', 'socket']) {
      if (!result[name]) {
        result[name] = getFallbackUrl(name);
      }
    }
    return result;
  }

  // 遍历所有服务，逐个探测
  for (const [serviceName, serviceConfig] of Object.entries(config.services)) {
    // api 已经用了自定义地址，跳过
    if (result[serviceName]) continue;
    result[serviceName] = await detectService(serviceName, serviceConfig, force);
  }

  // 补全配置里没有的服务，用兜底
  for (const name of ['api', 'file', 'socket']) {
    if (!result[name]) {
      result[name] = getFallbackUrl(name);
    }
  }

  return result;
}




/**
 * 运行时触发重新探测（节点故障时调用）
 * @returns 是否切换了新地址
 */
// 新增：运行时探测锁，防止频繁重复触发
let isRuntimeDetecting = false;
let lastDetectTime = 0;
const RUNTIME_DETECT_COOLDOWN = 60 * 1000; // 运行时重测冷却：60秒
export async function runtimeRedetectApi(): Promise<boolean> {
  // 冷却期内不重复探测
  if (isRuntimeDetecting || Date.now() - lastDetectTime < RUNTIME_DETECT_COOLDOWN) {
    return false;
  }

  // 用户自定义地址：默认不自动切换，尊重用户手动设置
  const customUrl = localStorage.getItem(CUSTOM_URL_KEY);
  if (customUrl && customUrl.trim() !== '') {
    // 如果希望自定义地址也自动降级，注释掉下面的 return 即可
    return false;
  }

  isRuntimeDetecting = true;
  try {
    const oldUrl = getApiBaseUrl();
    // 强制重新探测 api 服务
    const config = await loadConfig();
    if (!config?.services?.api) {
      return false;
    }

    const newUrl = await detectService('api', config.services.api, true);
    lastDetectTime = Date.now();
    return newUrl !== oldUrl;
  } catch {
    return false;
  } finally {
    isRuntimeDetecting = false;
  }
}