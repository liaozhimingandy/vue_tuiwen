import type {
  GalleryLayout,
  NormalizedImage,
} from './types'

/**
 * 横图判断
 */
function isLandscape(
  image: NormalizedImage,
) {
  return (
    (image.ratio ?? 1) >= 1.2
  )
}

/**
 * 竖图判断
 */
function isPortrait(
  image: NormalizedImage,
) {
  return (
    (image.ratio ?? 1) <= 0.8
  )
}

/* ========================================
 * 2 Images
 * ======================================== */

function layoutTwo(
  images: NormalizedImage[],
): GalleryLayout {
  const [first, second] = images

  /**
   * 两张横图
   *
   * 上下布局
   */
  if (
    isLandscape(first) &&
    isLandscape(second)
  ) {
    return {
      columns: 1,
      rows: 2,

      slots: [
        {
          index: 0,

          colStart: 1,
          colSpan: 1,

          rowStart: 1,
          rowSpan: 1,
        },

        {
          index: 1,

          colStart: 1,
          colSpan: 1,

          rowStart: 2,
          rowSpan: 1,
        },
      ],
    }
  }

  /**
   * 默认左右布局
   */
  return {
    columns: 2,
    rows: 1,

    slots: [
      {
        index: 0,

        colStart: 1,
        colSpan: 1,

        rowStart: 1,
        rowSpan: 1,
      },

      {
        index: 1,

        colStart: 2,
        colSpan: 1,

        rowStart: 1,
        rowSpan: 1,
      },
    ],
  }
}

/* ========================================
 * 3 Images
 * ======================================== */

function layoutThree(
  images: NormalizedImage[],
): GalleryLayout {
  const [first] = images

  /**
   * 第一张竖图
   *
   * 左大右二
   */
  if (isPortrait(first)) {
    return {
      columns: 2,
      rows: 2,
      slots: [
        {
          index: 0,
          colStart: 1,
          colSpan: 1,
          rowStart: 1,
          rowSpan: 2,
        },

        {
          index: 1,
          colStart: 2,
          colSpan: 1,
          rowStart: 1,
          rowSpan: 1,
        },
        {
          index: 2,
          colStart: 2,
          colSpan: 1,
          rowStart: 2,
          rowSpan: 1,
        },
      ],
    }
  }

  /**
   * 默认
   *
   * 上大下二
   */
  return {
    columns: 2,
    rows: 2,
    slots: [
      {
        index: 0,
        colStart: 1,
        colSpan: 2,
        rowStart: 1,
        rowSpan: 1,
      },

      {
        index: 1,
        colStart: 1,
        colSpan: 1,
        rowStart: 2,
        rowSpan: 1,
      },

      {
        index: 2,
        colStart: 2,
        colSpan: 1,
        rowStart: 2,
        rowSpan: 1,
      },
    ],
  }
}

/* ========================================
 * 4 Images
 * ======================================== */

function layoutFour(): GalleryLayout {
  return {
    columns: 2,
    rows: 2,

    slots: [
      {
        index: 0,
        colStart: 1,
        colSpan: 1,
        rowStart: 1,
        rowSpan: 1,
      },

      {
        index: 1,
        colStart: 2,
        colSpan: 1,
        rowStart: 1,
        rowSpan: 1,
      },

      {
        index: 2,
        colStart: 1,
        colSpan: 1,
        rowStart: 2,
        rowSpan: 1,
      },

      {
        index: 3,
        colStart: 2,
        colSpan: 1,
        rowStart: 2,
        rowSpan: 1,
      },
    ],
  }
}

/* ========================================
 * 5 Images
 * ======================================== */

function layoutFive(
  images: NormalizedImage[],
): GalleryLayout {
  const [first] = images

  /**
   * 第一张竖图
   *
   * 左边大图
   * 右边 4 张
   */
  if (isPortrait(first)) {
    return {
      columns: 3,
      rows: 2,
      slots: [
        {
          index: 0,
          colStart: 1,
          colSpan: 1,
          rowStart: 1,
          rowSpan: 2,
        },

        {
          index: 1,
          colStart: 2,
          colSpan: 1,
          rowStart: 1,
          rowSpan: 1,
        },

        {
          index: 2,
          colStart: 3,
          colSpan: 1,
          rowStart: 1,
          rowSpan: 1,
        },

        {
          index: 3,
          colStart: 2,
          colSpan: 1,
          rowStart: 2,
          rowSpan: 1,
        },

        {
          index: 4,
          colStart: 3,
          colSpan: 1,
          rowStart: 2,
          rowSpan: 1,
        },
      ],
    }
  }

  /**
   * 默认
   *
   * 上大图
   * 下四图
   */
  return {
    columns: 4,
    rows: 2,
    slots: [
      {
        index: 0,
        colStart: 1,
        colSpan: 4,
        rowStart: 1,
        rowSpan: 1,
      },
      {
        index: 1,
        colStart: 1,
        colSpan: 1,
        rowStart: 2,
        rowSpan: 1,
      },

      {
        index: 2,
        colStart: 2,
        colSpan: 1,
        rowStart: 2,
        rowSpan: 1,
      },

      {
        index: 3,
        colStart: 3,
        colSpan: 1,
        rowStart: 2,
        rowSpan: 1,
      },

      {
        index: 4,
        colStart: 4,
        colSpan: 1,
        rowStart: 2,
        rowSpan: 1,
      },
    ],
  }
}

/* ========================================
 * Main
 * ======================================== */

export function getGalleryLayout(
  images: NormalizedImage[],
): GalleryLayout | null {
  const count = images.length

  if (count <= 1) {
    return null
  }

  if (count === 2) {
    return layoutTwo(images)
  }

  if (count === 3) {
    return layoutThree(images)
  }

  if (count === 4) {
    return layoutFour()
  }

  return layoutFive(images)
}
