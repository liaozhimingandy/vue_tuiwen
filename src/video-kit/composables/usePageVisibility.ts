import {onBeforeUnmount, onMounted} from "vue";

/**
 * 页面可见性监听
 *
 * 页面被切走（标签页隐藏 / App 切后台）时回调，
 * 用于「页面暂停」：隐藏时暂停播放，回到前台由调用方决定是否恢复。
 */
export function usePageVisibility(onChange: (visible: boolean) => void): void {
    const handler = () => onChange(document.visibilityState === "visible");

    onMounted(() => {
        document.addEventListener("visibilitychange", handler);
    });
    onBeforeUnmount(() => {
        document.removeEventListener("visibilitychange", handler);
    });
}
