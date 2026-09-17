/**
 * useGalleryResize - 画廊容器尺寸监听组合式函数
 *
 * 职责：监听画廊根容器（galleryRef）的宽高变化，返回响应式的 width / height。
 *
 * 时序：
 * - onMounted 时先同步读取一次 clientWidth/Height，保证首屏即有尺寸（避免布局抖动）。
 * - 若浏览器支持 ResizeObserver，则挂上监听，后续尺寸变更（窗口缩放、内容增减、父容器重排）实时回填。
 *
 * 兼容处理：
 * - 不支持 ResizeObserver 的环境（如极老浏览器）仅保留 onMounted 的首次测量，不再动态更新。
 * - 组件卸载时断开 observer，避免内存泄漏。
 *
 * 返回值：{ width, height } 均为 ref<number>，clientWidth/Height 经 Math.floor 取整。
 *
 * @param target 指向画廊根容器的模板 ref
 */

import {onBeforeUnmount, onMounted, ref, type Ref} from 'vue';

/**
 * 获取元素真实宽高
 */
/**
 * 监听目标元素尺寸变化，返回响应式的宽高。详见文件顶部说明块。
 *
 * @param target 指向被测量元素的模板 ref
 * @returns { width, height } 均为 ref<number>，单位 px，已向下取整
 */
export function useGalleryResize(target: Ref<HTMLElement | null>) {
  const width = ref(0);

  const height = ref(0);

  let observer: ResizeObserver | undefined;

  function updateSize(element: HTMLElement) {
    width.value = Math.floor(element.clientWidth);

    height.value = Math.floor(element.clientHeight);
  }

  onMounted(() => {
    const element = target.value;

    if (!element) {
      return;
    }

    updateSize(element);

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    observer = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      width.value = Math.floor(entry.contentRect.width);

      height.value = Math.floor(entry.contentRect.height);
    });

    observer.observe(element);
  });

  onBeforeUnmount(() => {
    observer?.disconnect();
  });

  return {
    width,
    height,
  };
}
