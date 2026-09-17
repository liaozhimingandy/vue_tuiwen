/**
 * 设备 / 响应式断点工具
 *
 * 用途：在 JS 里判断当前是否移动端，用于控制"该渲染哪一套 DOM"。
 * 与 CSS 断点保持一致：<= 767px 视为移动端。
 */
import {ref} from 'vue';

/** 断点：和页面 CSS media query 统一，767px 及以下为移动端 */
export const BREAKPOINT_MOBILE = 767;

/** 当前是否移动端（模块级单例，全站共享同一份状态） */
export const isMobile = ref(false);

/**
 * 读取当前视口是否为移动端
 * 说明：这是**非响应式**的一次性读取，模板中直接调用它不会随窗口变化更新，
 * 需要响应式请使用 `useDeviceWatcher()` 返回的 isMobile。
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= BREAKPOINT_MOBILE;
}

/** 同步单例状态 */
function updateDeviceStatus() {
  isMobile.value = isMobileDevice();
}

/**
 * 全局只注册一次的 resize 监听
 * 早期实现是"每个调用方各自 addEventListener"，多组件使用时会重复触发；
 * 这里改为单例监听 + requestAnimationFrame 合并，降低高频 resize 的开销。
 */
let listenerBound = false;
let resizeRafId = 0;

function handleResize() {
  if (resizeRafId) return; // 同一帧内只处理一次
  resizeRafId = requestAnimationFrame(() => {
    resizeRafId = 0;
    updateDeviceStatus();
  });
}

function ensureGlobalListener() {
  if (listenerBound || typeof window === 'undefined') return;
  listenerBound = true;
  updateDeviceStatus();
  window.addEventListener('resize', handleResize, {passive: true});
}

/**
 * 组件内使用：返回全局共享的 isMobile，并确保监听已就绪
 *
 * 注意：监听器刻意做成"全局单例且不随组件卸载移除"，
 * 这样即使没有任何组件在观察，断点状态也始终是最新的，
 * 也避免了组件反复挂载/卸载导致监听器重复添加。
 *
 * @returns { isMobile } 响应式的移动端标记
 */
export function useDeviceWatcher() {
  ensureGlobalListener();
  return {isMobile};
}
