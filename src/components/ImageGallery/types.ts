export interface ImageItem {
  /**
   * 原图地址
   */
  url: string
  /**
   * 缩略图地址
   *
   * Feed 展示推荐使用缩略图
   */
  thumbnail?: string
  /**
   * 图片原始宽度
   *
   * 强烈建议后端返回
   */
  width?: number
  /**
   * 图片原始高度
   */
  height?: number
}

/**
 * 兼容旧接口
 *
 * 允许：
 *
 * ['a.jpg', 'b.jpg']
 *
 * 或：
 *
 * [
 *   {
 *     url: 'a.jpg',
 *     width: 1920,
 *     height: 1080
 *   }
 * ]
 */
export type ImageSource =
  | string
  | ImageItem
/**
 * 标准化后的图片数据
 */
export interface NormalizedImage {
  index: number
  thumbnail: string
  original: string
  width?: number
  height?: number
  ratio?: number
}

/**
 * 布局槽位
 */
export interface LayoutSlot {
  index: number
  colStart: number
  colSpan: number
  rowStart: number
  rowSpan: number
}

/**
 * 布局结果
 */
export interface GalleryLayout {
  columns: number
  rows: number
  slots: LayoutSlot[]
}
