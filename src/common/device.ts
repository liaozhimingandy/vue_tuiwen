/** 断点和你页面统一：767px 以下移动端 */
export const BREAKPOINT_MOBILE = 767;

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= BREAKPOINT_MOBILE;
}

// 监听窗口变化，对外提供响应式标记（Vue项目适用）
import { ref, onUnmounted } from 'vue';
export const isMobile = ref(false);

function updateDeviceStatus() {
  isMobile.value = isMobileDevice();
}

export function useDeviceWatcher() {
  updateDeviceStatus();
  window.addEventListener('resize', updateDeviceStatus);

  onUnmounted(() => {
    window.removeEventListener('resize', updateDeviceStatus);
  });
  return { isMobile };
}
