/**
 * 图片画廊布局引擎
 *
 * 职责：根据「图片数量」与「首图宽高比」计算 CSS Grid 的 columns / rows，
 *      以及每个槽位的 gridColumn / gridRow 跨度，输出 GalleryLayout。
 *
 * 算法思路：
 * - ≤ 1 张：返回 null，组件退化为单图流式布局（等宽自适应，不参与九宫格）。
 * - 2 张：两张均横图则上下堆叠（1×2）；否则左右并排（2×1）。
 * - 3 张：首图竖图则「左大右二」（2×2，左图跨两行）；否则「上大下二」（2×2，首图跨两列）。
 * - 4 张：统一 2×2 九宫格。
 * - 5 张：首图竖图则「左大右四」（3×2）；否则「上大下四」（4×2）。
 *
 * 宽高比阈值：ratio >= 1.2 视为横图，<= 0.8 视为竖图，中间视作近似方形不参与特殊布局。
 *
 * 被谁使用：ImageGallery.vue 的 `layout` computed 调用 getGalleryLayout。
 * 注意：本引擎为纯函数，不读取 DOM / 不依赖运行环境，可单测。
 */

import type {GalleryLayout, NormalizedImage} from './types';

/**
 * 横图判断
 */
function isLandscape(image: NormalizedImage) {
  return (image.ratio ?? 1) >= 1.2;
}

/**
 * 竖图判断
 */
function isPortrait(image: NormalizedImage) {
  return (image.ratio ?? 1) <= 0.8;
}

/* ========================================
 * 2 Images
 * ======================================== */

function layoutTwo(images: NormalizedImage[]): GalleryLayout {
  const [first, second] = images;

  /**
   * 两张横图
   *
   * 上下布局
   */
  if (isLandscape(first) && isLandscape(second)) {
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
    };
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
  };
}

/* ========================================
 * 3 Images
 * ======================================== */

function layoutThree(images: NormalizedImage[]): GalleryLayout {
  const [first] = images;

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
    };
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
  };
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
  };
}

/* ========================================
 * 5 Images
 * ======================================== */

function layoutFive(images: NormalizedImage[]): GalleryLayout {
  const [first] = images;

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
    };
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
  };
}

/* ========================================
 * Main
 * ======================================== */

/**
 * 计算画廊的 Grid 布局。
 *
 * @param images 标准化后的图片数组（长度即图片数量，决定采用哪种布局分支）
 * @returns GalleryLayout 布局结果；图片数 ≤ 1 时返回 null，表示退化为单图流式布局
 */
export function getGalleryLayout(images: NormalizedImage[]): GalleryLayout | null {
  const count = images.length;

  if (count <= 1) {
    return null;
  }

  if (count === 2) {
    return layoutTwo(images);
  }

  if (count === 3) {
    return layoutThree(images);
  }

  if (count === 4) {
    return layoutFour();
  }

  return layoutFive(images);
}
