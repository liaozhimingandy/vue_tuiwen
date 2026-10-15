/**
 * Axios 实例与全局拦截器
 *
 * 职责：
 * 1. 创建统一 axios 实例（baseURL / 超时 / Cookie）
 * 2. 请求拦截：按当前生效节点动态设置 baseURL、自动注入 Authorization、统计 loading
 * 3. 响应拦截：统一错误提示、401 静默刷新 token 并重放请求、
 *    连续失败自动切换服务节点
 *
 * 所有业务请求都应通过本实例（默认导出）发出。
 */
import axios from 'axios';
import {MessagePlugin} from 'tdesign-vue-next';
import router from '../router';
import {config} from '@/common/config.ts';
import appStore from '@/stores';
import {apiUrls} from './api.ts';
import type {IToken} from '../interface';
import {logger} from '../common/utils.ts';
import {getApiBaseUrl, runtimeRedetectApi} from '../common/endpoint-detector.ts';

/** 是否正在刷新 token（刷新锁，避免并发刷新） */
let isRefreshing = false;

/**
 * 刷新期间挂起的请求队列
 *
 * 关键点：队列中同时保存 resolve 与 reject，
 * 刷新成功则带着新 token 重放所有请求，刷新失败则统一 reject。
 * 早期只保存了 resolve 并额外挂一个 `_lastReject`，导致队列里
 * 除第一个以外的请求既不会成功也不会失败（Promise 永久悬挂 + 内存泄漏）。
 */
interface PendingRequest {
  resolve: (token: string) => void;
  reject: (reason?: unknown) => void;
}
let requestQueue: PendingRequest[] = [];

/** 连续失败计数，用于触发节点重测 */
let consecutiveFailCount = 0;
/** 连续失败达到该阈值时触发运行时重测 */
const FAIL_THRESHOLD = 3;

/**
 * 刷新 token 请求的 URL 特征串
 *
 * 这里从 apiUrls.update_token 派生而不是手写路径，避免两处维护漂移。
 * update_token(id) 返回 `/oauth/refresh-token/${id}/refresh_token/`，
 * 去掉空片段后取前两段即得稳定的 `oauth/refresh-token`。
 */
const REFRESH_URL_PREFIX = apiUrls.update_token('').split('/').filter(Boolean).slice(0, 2).join('/');

/**
 * 判断某个请求 URL 是否为刷新 token 请求
 * @param url 请求地址（相对路径或完整 URL）
 */
const isRefreshUrl = (url: unknown): boolean =>
  typeof url === 'string' && REFRESH_URL_PREFIX !== '' && url.includes(REFRESH_URL_PREFIX);

/**
 * 跳转登录页（带回跳参数）
 *
 * 已经是登录页时不再重复 push：重复导航同名路由 Vue Router 会抛
 * duplicated navigation 警告，且会丢掉已有的 query 参数。
 */
const redirectToLogin = () => {
  if (router.currentRoute.value.name === 'login') return;
  const currentPath = router.currentRoute.value.fullPath;
  router.push({name: 'login', query: {redirect: currentPath}});
};

//-------------------------1.创建axios实例-----------------------
const instance = axios.create({
  // ⚠️ 启动快照。运行期请以 getApiBaseUrl() 为准：
  // 请求拦截器里会逐次覆盖 baseURL，否则 runtimeRedetectApi() 切换节点后
  // 请求仍会打在旧地址上，"网络线路已自动切换"的提示就是假的。
  baseURL: config.API_BASE_URL, // 所有的请求地址前缀部分
  timeout: 10000, // 请求超时时间
  withCredentials: true, // 异步请求携带cookie
  headers: {
    'Content-Type': 'application/json;charset=UTF-8',
    accept: 'application/json',
  },
});

//-------------------------2.请求拦截-----------------------
instance.interceptors.request.use(
  // 注意：参数名不要用 config —— 会遮蔽从 common/config.ts 导入的全局配置对象
  (requestConfig) => {
    // 每次请求重新解析服务地址：让"运行时切换节点"真正作用于后续所有请求
    requestConfig.baseURL = getApiBaseUrl() || config.API_BASE_URL;

    const accountStore = appStore.useAccountStore;
    const token: IToken = accountStore.token;
    // 已登录则统一注入 Bearer token
    if (token.access_token) {
      requestConfig.headers['Authorization'] = `Bearer ${token.access_token}`;
    }
    //加载loading
    addLoading();
    return requestConfig;
  },
  (error: any) => {
    //请求发生错误，抛出异常
    cancelLoading();
    return Promise.reject(error);
  },
);

// -------------------------3.响应拦截-----------------------
instance.interceptors.response.use(
  (res: any) => {
    // 取消加载 loading
    cancelLoading();
    // 请求成功：重置失败计数
    consecutiveFailCount = 0;
    return res;
  },
  async (error: any) => {
    // 取消加载 loading
    cancelLoading();

    const {response, code, config: requestConfig} = error || {};

    const status: number | undefined = response?.status;

    // 只对"可能是节点故障"的失败计数：网络/超时（没有 response）或服务端 5xx。
    // 4xx 属于业务或鉴权问题，换节点也解决不了，计数只会误触发重测。
    // ⚠️ 原先写作 `config?.url?.includes(apiUrls.update_token)`：
    // apiUrls.update_token 是**函数**，被 includes 转成整段源码字符串后必然匹配失败，
    // 等价于这个排除条件从未生效（刷新失败也会计入，进而触发无意义的节点重测）。
    const isRefresh = isRefreshUrl(requestConfig?.url);
    const isServerError = typeof status === 'number' && status >= 500;
    if (!isRefresh && (!response || isServerError)) {
      consecutiveFailCount++;
    }
    // 达到失败阈值：触发运行时自动重测
    if (consecutiveFailCount >= FAIL_THRESHOLD) {
      consecutiveFailCount = 0; // 先重置，避免死循环
      runtimeRedetectApi().then((changed) => {
        if (changed) {
          MessagePlugin.info('网络线路已自动切换');
        }
      });
    }

    // 方案：单个接口可传入 customOptions:{ hideError: true } 关闭全局弹窗
    const hideGlobalError = requestConfig?.customOptions?.hideError;
    if (hideGlobalError) return Promise.reject(error);

    // 1. 网络无响应 / 超时场景（没有response对象）
    if (!response) {
      // axios原生超时标识 ECONNABORTED
      if (code === 'ECONNABORTED') {
        await MessagePlugin.warning('请求超时，请稍后重试');
      } else {
        await MessagePlugin.error('网络连接失败，请检查网络');
      }
      return Promise.reject(error);
    }

    // 2. 后端返回状态码（status 已在上面解出）
    const detail: any = response.data?.detail || '';
    switch (status) {
      case 400:
        // 参数错误多为业务校验失败，由调用方自行提示，此处不弹窗
        break;
      case 401: {
        const accountStore = appStore.useAccountStore;
        const token: IToken = accountStore.token;
        // 没有刷新令牌：直接登录，return阻断后续刷新逻辑
        if (!token?.refresh_token) {
          redirectToLogin();
          return Promise.reject(error); // 终止promise链
        }
        // 如果正在刷新，把请求加入队列，等刷新结果统一处理
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            requestQueue.push({
              resolve: (newToken: string) => {
                // 生成新config，不要直接修改原config对象
                const newReqConfig = {...requestConfig};
                newReqConfig.headers = {...(requestConfig?.headers || {})};
                newReqConfig.headers.Authorization = `Bearer ${newToken}`;
                resolve(instance(newReqConfig));
              },
              reject,
            });
          });
        }
        isRefreshing = true;
        try {
          // --------------- 刷新 token 接口 ---------------
          // 拼接刷新接口地址（走运行时地址，兼容节点切换）
          const baseUrl = (getApiBaseUrl() || config.API_BASE_URL).replace(/\/$/, '');
          const accountId = accountStore.account?.account_id ?? '';
          const apiPath = apiUrls.update_token(accountId);
          logger.info('token is expired, change token use refresh token');
          // 注意：这里走裸 axios 而不是 instance，避免刷新失败再次进入 401 分支造成递归。
          // 但裸 axios 没有实例的默认配置，必须显式带上超时，
          // 否则请求挂住时 isRefreshing 永远为 true，队列里所有请求一起永久悬挂。
          const refreshRes = await axios.get(baseUrl + apiPath, {
            headers: {Authorization: `Bearer ${token.refresh_token}`},
            timeout: 10000,
          });
          const latestAccessToken = refreshRes.data.access_token;
          // 同步到本地数据
          accountStore.update_token('access_token', latestAccessToken);

          // 重放队列里的所有请求（先取出再清空，避免重放过程中新请求被丢弃）
          const queue = requestQueue;
          requestQueue = [];
          queue.forEach((item) => item.resolve(latestAccessToken));

          // ⭐重试当前失败请求，clone config，禁止直接修改原error.config
          const retryConfig = {...requestConfig};
          retryConfig.headers = {...(requestConfig?.headers || {})};
          retryConfig.headers.Authorization = `Bearer ${latestAccessToken}`;
          return instance(retryConfig);
        } catch (e) {
          // 1. 代表 refresh_token 过期/无效/被拉黑
          // 2. 清空队列、停止刷新
          // 3. 清空本地 token（必须）
          // 4. 跳转到登录页（带 redirect）
          logger.info('refresh token 刷新失败', e);
          // 队列中所有请求统一 reject，保证每个 Promise 都能结算
          const queue = requestQueue;
          requestQueue = [];
          queue.forEach((item) => item.reject(e));

          accountStore.logout();
          redirectToLogin();
          return Promise.reject(e);
        } finally {
          isRefreshing = false;
        }
      }
      case 403:
        await MessagePlugin.error('登录过期，权限不足，请重新登录');
        break;
      case 404:
        // 资源不存在多由页面自身兜底（如 404 页面），此处不额外弹窗
        break;
      case 408:
        await MessagePlugin.error('请求超时');
        break;
      case 500:
        await MessagePlugin.error('服务器错误');
        break;
      case 502:
      case 503:
        await MessagePlugin.error('服务暂时不可用，正在尝试切换线路');
        break;
      case 504:
        await MessagePlugin.error('网络超时');
        break;
      default:
        await MessagePlugin.error(detail || `请求失败[${status}]`);
    }

    return Promise.reject(error);
  },
);

// -------------------------4.全局请求计数-----------------------
/**
 * 全局并发请求计数器
 * 目前仅用于调试日志；如需接管全局 loading，在计数为 0/1 时挂载即可。
 */
let loadCount = 0;

/** 请求开始：计数 +1 */
const addLoading = () => {
  loadCount++;
  if (loadCount === 1) {
    logger.info('数据正在加载...');
  }
};

/** 请求结束：计数 -1（不会减到负数） */
const cancelLoading = () => {
  if (loadCount > 0) loadCount--;
  if (loadCount === 0) {
    logger.info('数据加载完成...');
  }
};

// 5.导出 axios 实例
export default instance;
