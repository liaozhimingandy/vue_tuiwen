import {
  onBeforeUnmount,
  onMounted,
  ref,
  type Ref,
} from 'vue'

/**
 * 获取元素真实宽高
 */
export function useGalleryResize(
  target: Ref<HTMLElement | null>,
) {
  const width = ref(0)

  const height = ref(0)

  let observer:
    | ResizeObserver
    | undefined

  function updateSize(
    element: HTMLElement,
  ) {
    width.value =
      Math.floor(element.clientWidth)

    height.value =
      Math.floor(element.clientHeight)
  }

  onMounted(() => {
    const element = target.value

    if (!element) {
      return
    }

    updateSize(element)

    if (
      typeof ResizeObserver ===
      'undefined'
    ) {
      return
    }

    observer =
      new ResizeObserver(entries => {
        const entry = entries[0]

        if (!entry) {
          return
        }

        width.value =
          Math.floor(
            entry.contentRect.width,
          )

        height.value =
          Math.floor(
            entry.contentRect.height,
          )
      })

    observer.observe(element)
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
  })

  return {
    width,
    height,
  }
}
