/**
 * Store 全局注册表
 *
 * 目的：让非组件环境（路由守卫、axios 拦截器等）也能便捷地拿到各个 Store 实例，
 * 用法形如 `appStore.useAccountStore.token`。
 *
 * ⚠️ 注意：
 * 1. `registerStore()` 必须在 `app.use(pinia)` 之后调用，
 *    因为 `useXxxStore()` 依赖"当前激活的 pinia 实例"；
 * 2. 这种方式会在启动时一次性创建所有 Store（无法按需懒加载），
 *    如果后续 Store 数量变多，建议改为在需要处直接调用 `useXxxStore()`。
 */
import {useAccountStore, useDraftStore, usePostStore, useCacheStore} from './app.ts';

export interface IAppStore {
  usePostStore: ReturnType<typeof usePostStore>;
  useAccountStore: ReturnType<typeof useAccountStore>;
  useDraftStore: ReturnType<typeof useDraftStore>;
  useCacheStore: ReturnType<typeof useCacheStore>;
}

/** 全局 Store 容器（在 registerStore 之前访问到的都是 undefined） */
const appStore: IAppStore = {} as IAppStore;

/**
 * 注册 app 状态库
 * 由 main.ts 在 pinia 安装完成后调用
 */
export const registerStore = () => {
  appStore.usePostStore = usePostStore();
  appStore.useAccountStore = useAccountStore();
  appStore.useDraftStore = useDraftStore();
  appStore.useCacheStore = useCacheStore();
};

export default appStore;
