/**
 * useIntersection - 进入视口预激活组合式函数
 *
 * 职责：用 IntersectionObserver 检测目标元素是否进入（或接近）视口，进入后将 activated 置为 true，
 *      用于触发图片懒加载（接近视口才请求真实图）。
 *
 * 时序：
 * - 通过 watch(target, { immediate: true }) 在 ref 挂载后（onMounted 之前）立即尝试开始观察；
 *   若此刻 target.value 尚为 null（模板未渲染），等到 ref 被赋值（DOM 就绪）时 watch 再次触发观察。
 * - 一旦 isIntersecting 命中，立即 disconnect 并置 activated=true（一次性激活，无需持续观察）。
 *
 * 兼容处理：
 * - SSR 或缺少 IntersectionObserver 的环境直接 activated=true（兜底为「始终加载」），保证功能可用。
 *
 * @param target 指向被观察元素的模板 ref
 * @param options.rootMargin 提前激活距离，默认 '400px 0px'（建议 Feed 场景 300~600px）
 * @returns activated：是否已接近视口（ref<boolean>）
 */

import {onBeforeUnmount, ref, watch, type Ref} from 'vue';

export interface UseIntersectionOptions {
  /**
   * 提前激活距离
   *
   * Feed 推荐：
   * 300px ~ 600px
   */
  rootMargin?: string;
}

/**
 * 接近视口时激活
 */
/**
 * 检测目标是否进入（或接近）视口，命中后将 activated 置 true。详见文件顶部说明块。
 *
 * @param target 指向被观察元素的模板 ref
 * @param options 配置项，目前仅 rootMargin（提前激活距离）
 * @returns { activated } ref<boolean>，表示是否已接近视口
 */
export function useIntersection(target: Ref<HTMLElement | null>, options: UseIntersectionOptions = {}) {
  const {rootMargin = '400px 0px'} = options;

  const activated = ref(false);

  let observer: IntersectionObserver | undefined;

  function startObserve() {
    const element = target.value;

    if (!element) {
      return;
    }

    /**
     * 已经激活，不需要重复观察
     */
    if (activated.value) {
      return;
    }

    /**
     * SSR / 老浏览器兜底
     */
    if (typeof IntersectionObserver === 'undefined') {
      activated.value = true;
      return;
    }

    observer?.disconnect();

    observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (entry?.isIntersecting) {
          activated.value = true;

          observer?.disconnect();
          observer = undefined;
        }
      },
      {
        root: null,
        rootMargin,
        threshold: 0,
      },
    );

    observer.observe(element);
  }

  watch(
    target,
    () => {
      startObserve();
    },
    {
      immediate: true,
    },
  );

  onBeforeUnmount(() => {
    observer?.disconnect();
    observer = undefined;
  });

  return {
    activated,
  };
}
