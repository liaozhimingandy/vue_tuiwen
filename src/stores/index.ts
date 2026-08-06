import {useAccountStore, useDraftStore, usePostStore, useCacheStore} from "./app.ts";

export interface IAppStore {
    usePostStore: ReturnType <typeof usePostStore>;
    useAccountStore: ReturnType <typeof useAccountStore>
    useDraftStore: ReturnType <typeof useDraftStore>
    useCacheStore: ReturnType <typeof useCacheStore>
}

const appStore: IAppStore = {} as IAppStore;

/**
 * 注册app状态库
 */
export const registerStore = () => {
    appStore.usePostStore = usePostStore();
    appStore.useAccountStore = useAccountStore();
    appStore.useDraftStore = useDraftStore();
    appStore.useCacheStore = useCacheStore()
}

export default appStore;