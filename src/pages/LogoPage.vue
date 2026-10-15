<!--
  文件：LogoPage.vue
  用途：Logo 方案预览与下载页
        - 方案A：品牌图标（iconfont 原生标记，圆形高光镂空）
        - 方案B：气泡 + 两只眼睛的「发声」符号
  路由：/logo/
  数据来源：纯前端，SVG 路径常量统一取自 `common/logo-paths.ts`
  主要交互：
    1. 配色方向卡片：同色并排预览两套方案，分别下载 SVG
    2. iOS / Android 应用图标预览与下载（SVG / PNG 均可）
    3. 小尺寸可读性测试
    4. 深浅底色单色版适配下载
  实现要点：
    - 导出用「独立 SVG 字符串」而非直接序列化组件 DOM，避免把 Vue 的 data-v 属性、
      组件私有属性一起写进文件；
    - 方案A 的镂空依赖 <mask>，导出时必须把 mask 一并写入，否则高光点会丢失。
-->
<template>
  <div class="logo-preview-page">
    <h1>Logo 方案预览</h1>
    <p class="sub">方案A：品牌图标 · 方案B：气泡「发声」符号</p>

    <!-- 配色方向：同色并排对比两套方案 -->
    <section>
      <h2>配色方向（左：方案A / 右：方案B）</h2>
      <div class="row">
        <div class="color-card" v-for="(item, index) in colorList" :key="item.hex">
          <div class="preview-pair">
            <div class="icon" :style="{background: item.hex}">
              <div class="preview-svg">
                <LogoSvg2 fill-bg="#ffffff" />
              </div>
            </div>
            <div class="icon" :style="{background: item.hex}">
              <div class="preview-svg">
                <LogoSvg fill-bg="#ffffff" />
              </div>
            </div>
          </div>
          <div class="cname">{{ item.name }}</div>
          <div class="hex">{{ item.hexTip }}</div>
          <div class="btn-row">
            <t-button theme="primary" size="small" @click="downloadBrandLogo(index)">下载方案A</t-button>
            <t-button theme="primary" size="small" variant="outline" @click="downloadLogo(index)">下载方案B</t-button>
          </div>
        </div>
      </div>
    </section>

    <!-- App图标预览 iOS/Android -->
    <section>
      <h2>App 图标实际效果（iOS 圆角方 / Android 圆形）</h2>
      <div class="row">
        <div class="frame-card">
          <div class="app-icon ios" :style="{background: PRIMARY_COLOR}">
            <div class="preview-svg">
              <LogoSvg2 fill-bg="#ffffff" />
            </div>
          </div>
          <div class="frame-label">方案A · iOS 圆角方形</div>
          <div class="btn-row">
            <t-button theme="primary" @click="downloadBrandIosIcon('svg')">SVG</t-button>
            <t-button theme="primary" variant="outline" @click="downloadBrandIosIcon('png')">PNG</t-button>
          </div>
        </div>
        <div class="frame-card">
          <div class="app-icon android" :style="{background: PRIMARY_COLOR}">
            <div class="preview-svg">
              <LogoSvg2 fill-bg="#ffffff" />
            </div>
          </div>
          <div class="frame-label">方案A · Android 圆形</div>
          <div class="btn-row">
            <t-button theme="primary" @click="downloadBrandAndroidIcon('svg')">SVG</t-button>
            <t-button theme="primary" variant="outline" @click="downloadBrandAndroidIcon('png')">PNG</t-button>
          </div>
        </div>
      </div>
      <div class="row" style="margin-top: 20px">
        <div class="frame-card">
          <div class="app-icon ios" :style="{background: PRIMARY_COLOR}">
            <div class="preview-svg">
              <LogoSvg fill-bg="#ffffff" />
            </div>
          </div>
          <div class="frame-label">方案B · iOS 圆角方形</div>
          <div class="btn-row">
            <t-button theme="primary" @click="downloadIosIcon('svg')">SVG</t-button>
            <t-button theme="primary" variant="outline" @click="downloadIosIcon('png')">PNG</t-button>
          </div>
        </div>
        <div class="frame-card">
          <div class="app-icon android" :style="{background: PRIMARY_COLOR}">
            <div class="preview-svg">
              <LogoSvg fill-bg="#ffffff" />
            </div>
          </div>
          <div class="frame-label">方案B · Android 圆形</div>
          <div class="btn-row">
            <t-button theme="primary" @click="downloadAndroidIcon('svg')">SVG</t-button>
            <t-button theme="primary" variant="outline" @click="downloadAndroidIcon('png')">PNG</t-button>
          </div>
        </div>
      </div>
    </section>

    <!-- 小尺寸可读性测试 -->
    <section>
      <h2>小尺寸可读性测试（上：方案A / 下：方案B）</h2>
      <div class="size-test">
        <div class="size-item" v-for="s in sizeList" :key="s.px">
          <div class="size-svg" :style="{width: `${s.px}px`, height: `${s.px}px`, background: PRIMARY_COLOR}">
            <LogoSvg2 fill-bg="#ffffff" />
          </div>
          <div class="size-svg" :style="{width: `${s.px}px`, height: `${s.px}px`, background: PRIMARY_COLOR}">
            <LogoSvg fill-bg="#ffffff" />
          </div>
          <div class="lbl">{{ s.label }}</div>
        </div>
      </div>
    </section>

    <!-- 深浅底色适配 -->
    <section>
      <h2>深浅底 / 单色版适配（左：方案A / 右：方案B）</h2>
      <div class="row">
        <div
          class="bg-card"
          v-for="(bg, index) in bgAdaptList"
          :key="bg.index"
          :style="{background: bg.bgColor, border: bg.border}"
        >
          <div class="preview-pair">
            <div class="preview-svg">
              <LogoSvg2 :fill-bg="bg.path1" />
            </div>
            <div class="preview-svg">
              <LogoSvg :fill-bg="bg.path1" />
            </div>
          </div>
          <div>
            <t-button theme="primary" size="small" @click="downloadBrandAdaptLogo(index)">方案A</t-button>
            <t-button theme="primary" size="small" variant="outline" @click="downloadAdaptLogo(index)">方案B</t-button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import {MessagePlugin} from 'tdesign-vue-next';
import LogoSvg from '@/components/LogoSvg.vue';
import LogoSvg2 from '@/components/LogoSvg2.vue';
import {logger} from '@/common/utils.ts';
import {BRAND_PATH_1, BRAND_PATH_2, BRAND_TRANSFORM, BUBBLE_FULL_PATH} from '@/common/logo-paths.ts';

// ===================== 常量定义 =====================
/** 品牌主色（默认导出图标底色） */
const PRIMARY_COLOR = '#2E7DFF';
/** 导出图标尺寸（像素） */
const EXPORT_SIZE = 512;
/** 方案A 镂空高光点半径（100×100 视口单位），需与 LogoSvg2 默认值保持一致 */
const BRAND_HOLE_RADIUS = 4;

// ===================== TS类型定义 =====================
interface ColorItem {
  name: string;
  hex: string;
  hexTip: string;
}

interface SizeItem {
  px: number;
  label: string;
}

interface AdaptBgItem {
  index: number;
  bgColor: string;
  border: string;
  path1: string;
  path2: string;
}

/** 导出格式 */
type ExportFormat = 'svg' | 'png';

// ===================== SVG导出字符串生成 =====================
/**
 * 方案B：气泡 + 双眼睛
 *
 * @param bubbleColor 气泡填充色
 * @param bgColor 可选背景色（不传则导出透明底）
 * @param rounded 背景是否为 iOS 圆角矩形（false 时导出圆形）
 */
function buildBubbleIconSvg(bubbleColor: string, bgColor?: string, rounded = false): string {
  const bg = bgColor
    ? rounded
      ? `<rect x="0" y="0" width="100" height="100" rx="22" fill="${bgColor}" />`
      : `<circle cx="50" cy="50" r="50" fill="${bgColor}" />`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${EXPORT_SIZE}" height="${EXPORT_SIZE}">
${bg}
<path d="${BUBBLE_FULL_PATH}" fill="${bubbleColor}" fill-rule="evenodd"/>
</svg>`;
}

/**
 * 方案A：品牌图标
 *
 * 必须把 <mask> 一起导出——镂空高光点完全依赖 mask，
 * 漏掉它导出的就是一块实心色块。
 *
 * @param brandColor 图标填充色
 * @param bgColor 可选背景色（不传则导出透明底）
 * @param rounded 背景是否为 iOS 圆角矩形（false 时导出圆形）
 */
function buildBrandIconSvg(brandColor: string, bgColor?: string, rounded = false): string {
  const bg = bgColor
    ? rounded
      ? `<rect x="0" y="0" width="100" height="100" rx="22" fill="${bgColor}" />`
      : `<circle cx="50" cy="50" r="50" fill="${bgColor}" />`
    : '';
  // 导出文件是独立文档，mask id 不会与页面上的组件冲突，可用固定值
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${EXPORT_SIZE}" height="${EXPORT_SIZE}">
<defs>
<mask id="brandExportMask">
<rect x="0" y="0" width="100" height="100" fill="#ffffff"/>
<circle cx="80" cy="28" r="${BRAND_HOLE_RADIUS}" fill="#000000"/>
</mask>
</defs>
${bg}
<g mask="url(#brandExportMask)">
<g transform="${BRAND_TRANSFORM}">
<path d="${BRAND_PATH_1}" fill="${brandColor}"/>
<path d="${BRAND_PATH_2}" fill="${brandColor}"/>
</g>
</g>
</svg>`;
}

// ===================== 业务数据源 =====================
const colorList: ColorItem[] = [
  {
    name: '活力蓝（推荐）',
    hex: '#2E7DFF',
    hexTip: '#2E7DFF',
  },
  {
    name: '青绿',
    hex: '#00B876',
    hexTip: '#00B876（区别于微信标准绿，更清新）',
  },
  {
    name: '靛紫',
    hex: '#5B5FEF',
    hexTip: '#5B5FEF（更年轻、差异化更强）',
  },
  {
    name: '墨黑（高级感）',
    hex: '#1A1A1A',
    hexTip: '#1A1A1A',
  },
];

const sizeList: SizeItem[] = [
  {px: 64, label: '64px（应用商店）'},
  {px: 40, label: '40px（导航栏）'},
  {px: 24, label: '24px（状态栏）'},
  {px: 16, label: '16px（favicon）'},
];

const bgAdaptList: AdaptBgItem[] = [
  {index: 1, bgColor: '#ffffff', border: '1px solid #eee', path1: '#2E7DFF', path2: '#fff'},
  {index: 2, bgColor: '#1A1A1A', border: 'none', path1: '#fff', path2: '#1A1A1A'},
  {index: 3, bgColor: '#f0f0f0', border: 'none', path1: '#666', path2: '#f0f0f0'},
  {index: 4, bgColor: '#2E7DFF', border: 'none', path1: '#fff', path2: '#2E7DFF'},
  {index: 5, bgColor: '#E5E6EB', border: 'none', path1: '#C9CDD4', path2: '#E5E6EB'},
];

// ===================== 底层下载工具函数 =====================
/**
 * 创建 a 标签并模拟点击，触发浏览器下载
 *
 * objectURL 必须在下载真正开始之后再释放：
 * 早先的实现里 `click()` 后同步 `revokeObjectURL`，部分浏览器会拿到已失效的 URL
 * （表现为下载 0 字节文件或直接失败）。
 */
function triggerDownload(objectUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(objectUrl);
  }, 1000);
}

/** 下载 SVG 文件 */
function downloadSvg(svgStr: string, filename: string) {
  const blob = new Blob([svgStr], {type: 'image/svg+xml;charset=utf-8'});
  triggerDownload(URL.createObjectURL(blob), `${filename}.svg`);
  MessagePlugin.success('SVG下载成功');
}

/**
 * SVG 转 PNG 下载（512×512）
 * 用于 iOS / Android 应用图标——应用商店与打包链路通常不接受 SVG。
 */
async function downloadPng(svgStr: string, filename: string) {
  const svgBlob = new Blob([svgStr], {type: 'image/svg+xml;charset=utf-8'});
  const url = URL.createObjectURL(svgBlob);
  const img = new Image();
  try {
    // 竞态：图片加载成功 or 8s 超时，谁先到用谁（防止无效 SVG 长时间挂起）
    await Promise.race([
      new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('SVG 解析失败'));
        img.src = url;
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('加载超时')), 8000)),
    ]);

    const canvas = document.createElement('canvas');
    canvas.width = EXPORT_SIZE;
    canvas.height = EXPORT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('当前浏览器不支持 Canvas 2D');
    ctx.drawImage(img, 0, 0, EXPORT_SIZE, EXPORT_SIZE);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('PNG 生成失败');
    triggerDownload(URL.createObjectURL(blob), `${filename}.png`);
    MessagePlugin.success('PNG下载成功');
  } catch (e) {
    logger.error('PNG 导出失败', e);
    MessagePlugin.error(e instanceof Error ? e.message : '图片导出失败');
  } finally {
    // 断开图片与 blob URL 的引用，帮助 GC 回收
    img.src = '';
    URL.revokeObjectURL(url);
  }
}

/** 按导出格式分发到 SVG / PNG 下载 */
async function exportIcon(svgStr: string, filename: string, format: ExportFormat) {
  if (format === 'png') {
    await downloadPng(svgStr, filename);
  } else {
    downloadSvg(svgStr, filename);
  }
}

// ===================== 业务下载事件 =====================
/** 配色卡片 · 方案B */
function downloadLogo(index: number) {
  const colorItem = colorList[index];
  downloadSvg(buildBubbleIconSvg(colorItem.hex), `logoB_${colorItem.name}_透明底`);
}

/** 配色卡片 · 方案A */
function downloadBrandLogo(index: number) {
  const colorItem = colorList[index];
  downloadSvg(buildBrandIconSvg(colorItem.hex), `logoA_${colorItem.name}_透明底`);
}

/** 深浅底色适配 · 方案B */
function downloadAdaptLogo(index: number) {
  const item = bgAdaptList[index];
  logger.info('下载方案B 单色版', item);
  downloadSvg(buildBubbleIconSvg(item.path1), `logoB_adapt_${item.index}`);
}

/** 深浅底色适配 · 方案A */
function downloadBrandAdaptLogo(index: number) {
  const item = bgAdaptList[index];
  logger.info('下载方案A 单色版', item);
  downloadSvg(buildBrandIconSvg(item.path1), `logoA_adapt_${item.index}`);
}

/** iOS 应用图标 · 方案B */
async function downloadIosIcon(format: ExportFormat) {
  await exportIcon(buildBubbleIconSvg('#ffffff', PRIMARY_COLOR, true), 'logoB_ios_1024', format);
}

/** Android 应用图标 · 方案B */
async function downloadAndroidIcon(format: ExportFormat) {
  await exportIcon(buildBubbleIconSvg('#ffffff', PRIMARY_COLOR, false), 'logoB_android', format);
}

/** iOS 应用图标 · 方案A */
async function downloadBrandIosIcon(format: ExportFormat) {
  await exportIcon(buildBrandIconSvg('#ffffff', PRIMARY_COLOR, true), 'logoA_ios_1024', format);
}

/** Android 应用图标 · 方案A */
async function downloadBrandAndroidIcon(format: ExportFormat) {
  await exportIcon(buildBrandIconSvg('#ffffff', PRIMARY_COLOR, false), 'logoA_android', format);
}
</script>

<style scoped>
.logo-preview-page {
  margin: 0;
  font-family: -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: #f4f4f2;
  color: #222;
  padding: 40px 20px 80px;
}

h1 {
  text-align: center;
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 4px;
}

.sub {
  text-align: center;
  color: #777;
  margin-top: 0;
  margin-bottom: 36px;
  font-size: 14px;
}

section {
  max-width: 1080px;
  margin: 0 auto 48px;
}

h2 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 14px;
  padding-left: 4px;
  border-left: 4px solid #2e7dff;
}

.row {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.color-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  text-align: center;
  flex: 1;
  min-width: 210px;
}

/* 同色并排预览：方案A 在左、方案B 在右 */
.preview-pair {
  display: flex;
  gap: 12px;
  justify-content: center;
  align-items: center;
}

.color-card .icon {
  width: 78px;
  height: 78px;
  border-radius: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
}

/* 并排时取消单独居中，交给 .preview-pair 统一排布 */
.preview-pair .icon {
  margin-bottom: 0;
}

.preview-svg {
  width: 52px;
  height: 52px;
}

:deep(.preview-svg svg) {
  width: 100%;
  height: 100%;
  display: block;
}

.btn-row {
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
}

.cname {
  font-size: 14px;
  font-weight: 600;
  margin-top: 12px;
}

.hex {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
  margin-bottom: 12px;
}

.frame-card {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  text-align: center;
  flex: 1;
  min-width: 200px;
}

.app-icon {
  width: 96px;
  height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
}

.app-icon.ios {
  border-radius: 22px;
}

.app-icon.android {
  border-radius: 50%;
}

.frame-label {
  font-size: 13px;
  color: #888;
  margin-bottom: 12px;
}

.size-test {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 36px;
  flex-wrap: wrap;
}

.size-item {
  text-align: center;
}

.size-item + .size-item {
  /* 视觉分组：每档之间留白更明显 */
  margin-left: 4px;
}

.size-svg {
  margin: 0 auto 6px;
  border-radius: 20%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.size-svg svg {
  width: 100%;
  height: 100%;
  display: block;
}

.lbl {
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}

.bg-card {
  border-radius: 16px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-width: 180px;
  min-height: 100px;
}
</style>
