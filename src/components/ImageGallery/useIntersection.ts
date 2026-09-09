import {
  onBeforeUnmount,
  ref,
  watch,
  type Ref,
} from 'vue'

export interface UseIntersectionOptions {
  /**
   * 提前激活距离
   *
   * Feed 推荐：
   * 300px ~ 600px
   */
  rootMargin?: string
}

/**
 * 接近视口时激活
 */
export function useIntersection(
  target: Ref<HTMLElement | null>,
  options: UseIntersectionOptions = {},
) {
  const {
    rootMargin = '400px 0px',
  } = options

  const activated = ref(false)

  let observer:
    | IntersectionObserver
    | undefined

  function startObserve() {
    const element = target.value

    if (!element) {
      return
    }

    /**
     * 已经激活，不需要重复观察
     */
    if (activated.value) {
      return
    }

    /**
     * SSR / 老浏览器兜底
     */
    if (
      typeof IntersectionObserver ===
      'undefined'
    ) {
      activated.value = true
      return
    }

    observer?.disconnect()

    observer =
      new IntersectionObserver(
        entries => {
          const entry = entries[0]

          if (
            entry?.isIntersecting
          ) {
            activated.value = true

            observer?.disconnect()
            observer = undefined
          }
        },
        {
          root: null,
          rootMargin,
          threshold: 0,
        },
      )

    observer.observe(element)
  }

  watch(
    target,
    () => {
      startObserve()
    },
    {
      immediate: true,
    },
  )

  onBeforeUnmount(() => {
    observer?.disconnect()
    observer = undefined
  })

  return {
    activated,
  }
}
