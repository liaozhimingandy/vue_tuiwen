/**
 * 图片画廊模块 - 类型定义
 *
 * 职责：
 * - ImageSource：定义画廊组件接受的最外层输入类型，兼容「字符串数组」与「对象数组」两种历史接口。
 * - NormalizedImage：组件内部标准化后的图片数据，补全缩略图/原图 URL 与宽高比 ratio。
 * - GalleryLayout / LayoutSlot：CSS Grid 布局结果，由 LayoutEngine 产出、组件模板消费。
 *
 * 被谁使用：
 * - ImageGallery.vue 直接消费 ImageSource / NormalizedImage / GalleryLayout。
 * - LayoutEngine.ts 产出 GalleryLayout 并消费 NormalizedImage。
 *
 * 注意：本文件只声明类型，不含任何运行时逻辑。
 */

export interface ImageItem {
  /**
   * 原图地址
   */
  url: string;
  /**
   * 缩略图地址
   *
   * Feed 展示推荐使用缩略图
   */
  thumbnail?: string;
  /**
   * 图片原始宽度
   *
   * 强烈建议后端返回
   */
  width?: number;
  /**
   * 图片原始高度
   */
  height?: number;
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
export type ImageSource = string | ImageItem;
/**
 * 标准化后的图片数据
 */
export interface NormalizedImage {
  /** 在展示列表中的下标（与模板 v-for 的 image.index 对应） */
  index: number;
  /** 缩略图完整 URL，用于 Feed 列表展示（已拼接域名） */
  thumbnail: string;
  /** 原图完整 URL，用于点击预览 */
  original: string;
  /** 图片原始宽度（优先取后端返回，缺失时由前端 load 事件补全） */
  width?: number;
  /** 图片原始高度 */
  height?: number;
  /** 宽高比 = width / height；缺失或高度为 0 时回退为 1（近似方形） */
  ratio?: number;
}

/**
 * 布局槽位
 */
export interface LayoutSlot {
  index: number;
  colStart: number;
  colSpan: number;
  rowStart: number;
  rowSpan: number;
}

/**
 * 布局结果
 */
export interface GalleryLayout {
  columns: number;
  rows: number;
  slots: LayoutSlot[];
}
