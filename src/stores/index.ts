import {useAccountStore, usePostStore} from "./app.ts";

export interface IAppStore {
    usePostStore: ReturnType <typeof usePostStore>;
    useAccountStore: ReturnType <typeof useAccountStore>
}

const appStore: IAppStore = {} as IAppStore;

/**
 * 注册app状态库
 */
export const registerStore = () => {
    appStore.usePostStore = usePostStore();
    appStore.useAccountStore = useAccountStore();
}

export default appStore;