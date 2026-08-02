import {useAccountStore, useDraftStore, usePostStore} from "./app.ts";

export interface IAppStore {
    usePostStore: ReturnType <typeof usePostStore>;
    useAccountStore: ReturnType <typeof useAccountStore>
    useDraftStore: ReturnType <typeof useDraftStore>
}

const appStore: IAppStore = {} as IAppStore;

/**
 * 注册app状态库
 */
export const registerStore = () => {
    appStore.usePostStore = usePostStore();
    appStore.useAccountStore = useAccountStore();
    appStore.useDraftStore = useDraftStore();
}

export default appStore;