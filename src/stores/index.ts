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
 * 3. 未注册就访问会**抛出带指引的错误**，而不是返回 undefined
 *    （见下方 Proxy 说明）。
 */
import {useAccountStore, useDraftStore, usePostStore, useCacheStore} from './app.ts';

export interface IAppStore {
  usePostStore: ReturnType<typeof usePostStore>;
  useAccountStore: ReturnType<typeof useAccountStore>;
  useDraftStore: ReturnType<typeof useDraftStore>;
  useCacheStore: ReturnType<typeof useCacheStore>;
}

/** 注册表中受管的键（用于区分「业务 Store」与 Symbol/其他属性访问） */
const storeKeys = ['usePostStore', 'useAccountStore', 'useDraftStore', 'useCacheStore'] as const;

/** 全局 Store 容器（真实数据在 registerStore 中写入） */
const registry: Partial<IAppStore> = {};

/** registerStore 是否已经执行过 */
let registered = false;

/**
 * 对外导出的全局 Store 容器
 *
 * 用 Proxy 拦截「未注册就访问」的情况：
 * 直接返回 undefined 的话，错误会在很远的地方才爆出来
 * （如 `appStore.useAccountStore.token` → "Cannot read properties of undefined"），
 * 排查成本很高。这里提前抛错，并把「该做什么」写进错误信息里。
 *
 * 只拦截已知的业务 Store 键，Symbol / toString 等访问原样放行，
 * 避免影响调试工具或隐式类型转换。
 */
const appStore = new Proxy(registry, {
  get(target, prop, receiver) {
    if (typeof prop === 'string' && (storeKeys as readonly string[]).includes(prop) && !(prop in target)) {
      throw new Error(
        `[stores] 访问了尚未注册的 Store："${prop}"。` +
          `registerStore() 必须在 app.use(pinia) 之后、任何业务请求之前调用（见 main.ts:startVueApp）。`,
      );
    }
    return Reflect.get(target, prop, receiver);
  },
}) as IAppStore;

/**
 * 注册 app 状态库
 * 由 main.ts 在 pinia 安装完成后调用
 *
 * 幂等：重复调用不会重建 Store（重建会丢掉已有状态，且与组件里持有的实例脱钩）。
 */
export const registerStore = () => {
  if (registered) return;
  registered = true;
  registry.usePostStore = usePostStore();
  registry.useAccountStore = useAccountStore();
  registry.useDraftStore = useDraftStore();
  registry.useCacheStore = useCacheStore();
};

export default appStore;
