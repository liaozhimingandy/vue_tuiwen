<!--
  文件：LogoPage.vue
  用途：Logo 方案预览与下载页（方案 B：气泡 + 两只眼睛的「发声」符号）
  路由：Logo 相关入口（具体 path 以 router 配置为准）
  数据来源：纯前端，SVG 路径常量在本地定义；导出为 SVG / PNG（注：当前实现基于 SVG + Canvas，未使用 three.js）
  主要交互：
    1. 配色方向卡片：预览不同主色并下载透明底图标
    2. iOS / Android 应用图标预览与下载
    3. 小尺寸可读性测试、深浅底色单色版适配下载
-->
<template>
  <div class="logo-preview-page">
    <h1>方案B</h1>
    <p class="sub">用两只眼睛，气泡变成一个有表情的"发声"符号</p>

    <!-- 配色方向 -->
    <section>
      <h2>配色方向</h2>
      <div class="row">
        <div class="color-card" v-for="(item, index) in colorList" :key="index">
          <div class="icon" :style="{background: item.hex}">
            <div class="preview-svg">
              <LogoSvg :fill-bg="'#ffffff'"/>
            </div>
          </div>
          <div class="cname">{{ item.name }}</div>
          <div class="hex">{{ item.hexTip }}</div>
          <t-button theme="primary" size="small" @click="downloadLogo(index)">下载图标</t-button>
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
              <LogoSvg :fill-bg="'#ffffff'"/>
            </div>
          </div>
          <div class="frame-label">iOS 圆角方形</div>
          <t-button theme="primary" @click="downloadIosIcon">下载SVG</t-button>
        </div>
        <div class="frame-card">
          <div class="app-icon android" :style="{background: PRIMARY_COLOR}">
            <div class="preview-svg">
              <LogoSvg :fill-bg="'#ffffff'"/>
            </div>
          </div>
          <div class="frame-label">Android 圆形</div>
          <t-button theme="primary" @click="downloadAndroidIcon">下载SVG</t-button>
        </div>
      </div>
    </section>

    <!-- 小尺寸可读性测试 -->
    <section>
      <h2>小尺寸可读性测试</h2>
      <div class="size-test">
        <div class="size-item" v-for="s in sizeList" :key="s.px">
          <svg :width="s.px" :height="s.px" viewBox="0 0 100 100">
            <path :d="fullPreviewPath" fill="#fff" fill-rule="evenodd"/>
          </svg>
          <div class="lbl">{{ s.label }}</div>
        </div>
      </div>
    </section>

    <!-- 深浅底色适配 -->
    <section>
      <h2>深浅底 / 单色版适配</h2>
      <div class="row">
        <div
            class="bg-card"
            v-for="(bg, index) in bgAdaptList"
            :key="bg.index"
            :style="{background: bg.bgColor, border: bg.border}"
        >
          <div class="preview-svg">
            <LogoSvg :fill-bg="bg.path1"/>
          </div>
          <div>
            <t-button theme="primary" size="small" @click="downloadAdaptLogo(index)">下载图标</t-button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import {MessagePlugin} from 'tdesign-vue-next';
import {logger} from '@/common/utils.ts';
import LogoSvg from '@/components/LogoSvg.vue';
import LogoSvg2 from "@/components/LogoSvg2.vue";

// ===================== 常量定义 =====================
// 气泡轮廓的 SVG path（viewBox 0 0 100 100）
const BUBBLE_PATH =
    'M50 15 C 25 15 10 32 10 52 C 10 68 22 80 38 84 L 34 96 L 52 84 C 74 82 90 66 90 50 C 90 30 74 15 50 15 Z';
// 左眼（圆形，fill-rule=evenodd 时镂空成眼睛）
const EYE1 = 'M 38 46 m -6 0 a 6 6 0 1 0 12 0 a 6 6 0 1 0 -12 0';
// 右眼
const EYE2 = 'M 62 46 m -6 0 a 6 6 0 1 0 12 0 a 6 6 0 1 0 -12 0';
// 气泡 + 双眼拼成的完整路径
const fullPreviewPath = `${BUBBLE_PATH} ${EYE1} ${EYE2}`;

// 品牌主色（默认导出图标底色）
const PRIMARY_COLOR = '#2E7DFF';
// 导出图标尺寸（像素）
const EXPORT_SIZE = 512;

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

// ===================== SVG导出字符串生成函数（镂空版） =====================
/** 透明底图标：气泡品牌色 +【镂空眼睛】透出背景 */
function buildTransparentIconSvg(bubbleColor: string): string {
  const full = `${BUBBLE_PATH} ${EYE1} ${EYE2}`;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${EXPORT_SIZE}" height="${EXPORT_SIZE}">
      <path d="${full}" fill="${bubbleColor}" fill-rule="evenodd"/>
    </svg>
  `;
}

function buildTransparentIconSvgA(bubbleColor: string): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" t="1790067415011" class="icon" viewBox="0 0 1269 1024" version="1.1" p-id="8743" width="247.8515625" height="200">
<defs>
<mask id="eyeMask">
<rect x="0" y="0" width="1269" height="1024" :fill="${bubbleColor}"/>
<circle cx="988" cy="280" r="60" fill="black"/>
</mask>
</defs>
<g mask="url(#eyeMask)">
<path d="M751.424512 922.19392a712.66304 712.66304 0 0 1-417.28-98.46784 590.76608 590.76608 0 0 1-285.94176 153.00608c237.69088 51.6096 623.86176 86.65088 810.35264-69.71392 6.69696-5.69344 13.18912-11.79648 19.68128-17.92a280.82176 280.82176 0 0 1-126.81216 33.09568zM1121.047552 354.46784a433.23392 433.23392 0 0 1 136.27392-118.1696c-98.46784-5.69344-129.18784-34.44736-167.19872-64.18432-48.2304-38.01088-102.78912-80.93696-185.30304-78.76608-140.00128 2.94912-199.4752 87.81824-232.16128 151.63392-10.4448 19.68128-33.66912 78.76608-77.0048 170.72128a736.29696 736.29696 0 0 0 91.56608-12.00128 263.4752 263.4752 0 0 1 321.78176 313.87648c78.76608-154.58304 59.86304-290.44736 112.04608-363.1104zM387.699712 0a699.26912 699.26912 0 0 0-60.64128 381.05088 703.22176 703.22176 0 0 0 252.84608 35.4304c19.68128-39.38304 34.46784-74.21952 46.4896-101.21216A712.45824 712.45824 0 0 1 387.699712 0z" fill="#000000" p-id="8744"/>
<path d="M980.247552 557.30176a252.06784 252.06784 0 0 0-162.46784-139.24352c-98.44736-26.37824-128 17.14176-289.0752 12.61568a712.45824 712.45824 0 0 1-527.7696-256 699.47392 699.47392 0 0 0 671.5392 735.10912 512 512 0 0 0 139.59168-9.64608 248.91392 248.91392 0 0 0 168.18176-342.8352z" fill="#000000" p-id="8745"/>
</g>
</svg>
  `;
}

/** iOS圆角背景图标 */
function buildIosAppIconSvg(bgColor: string): string {
  const full = `${BUBBLE_PATH} ${EYE1} ${EYE2}`;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${EXPORT_SIZE}" height="${EXPORT_SIZE}">
      <rect x="0" y="0" width="100" height="100" rx="22" fill="${bgColor}" />
      <path d="${full}" fill="#ffffff" fill-rule="evenodd"/>
    </svg>
  `;
};

function buildIosAppIconSvgA(bgColor: string): string {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" t="1790067415011" class="icon" viewBox="0 0 1269 1024" version="1.1" p-id="8743" width="247.8515625" height="200">
<defs>
<mask id="eyeMask">
<rect x="0" y="0" width="1269" height="1024" :fill="${bgColor}"/>
<circle cx="988" cy="280" r="60" fill="black"/>
</mask>
</defs>
<g mask="url(#eyeMask)">
<path d="M751.424512 922.19392a712.66304 712.66304 0 0 1-417.28-98.46784 590.76608 590.76608 0 0 1-285.94176 153.00608c237.69088 51.6096 623.86176 86.65088 810.35264-69.71392 6.69696-5.69344 13.18912-11.79648 19.68128-17.92a280.82176 280.82176 0 0 1-126.81216 33.09568zM1121.047552 354.46784a433.23392 433.23392 0 0 1 136.27392-118.1696c-98.46784-5.69344-129.18784-34.44736-167.19872-64.18432-48.2304-38.01088-102.78912-80.93696-185.30304-78.76608-140.00128 2.94912-199.4752 87.81824-232.16128 151.63392-10.4448 19.68128-33.66912 78.76608-77.0048 170.72128a736.29696 736.29696 0 0 0 91.56608-12.00128 263.4752 263.4752 0 0 1 321.78176 313.87648c78.76608-154.58304 59.86304-290.44736 112.04608-363.1104zM387.699712 0a699.26912 699.26912 0 0 0-60.64128 381.05088 703.22176 703.22176 0 0 0 252.84608 35.4304c19.68128-39.38304 34.46784-74.21952 46.4896-101.21216A712.45824 712.45824 0 0 1 387.699712 0z" fill="#000000" p-id="8744"/>
<path d="M980.247552 557.30176a252.06784 252.06784 0 0 0-162.46784-139.24352c-98.44736-26.37824-128 17.14176-289.0752 12.61568a712.45824 712.45824 0 0 1-527.7696-256 699.47392 699.47392 0 0 0 671.5392 735.10912 512 512 0 0 0 139.59168-9.64608 248.91392 248.91392 0 0 0 168.18176-342.8352z" fill="#000000" p-id="8745"/>
</g>
</svg>
  `;
  ;
}

/** Android圆形背景图标 */
function buildAndroidAppIconSvg(bgColor: string): string {
  const full = `${BUBBLE_PATH} ${EYE1} ${EYE2}`;
  return `
     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${EXPORT_SIZE}" height="${EXPORT_SIZE}">
      <circle cx="50" cy="50" r="50" fill="${bgColor}" />
      <path d="${full}" fill="#ffffff" fill-rule="evenodd"/>
    </svg>
  `;
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
/** 创建 a 标签并模拟点击，触发浏览器下载，随后移除节点 */
function triggerDownload(objectUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
  }, 100);
}

/** 下载SVG文件 */
function downloadSvg(svgStr: string, filename: string) {
  const blob = new Blob([svgStr], {type: 'image/svg+xml'});
  const url = URL.createObjectURL(blob);
  triggerDownload(url, `${filename}.svg`);
  URL.revokeObjectURL(url);
  MessagePlugin.success('SVG下载成功');
}

/** SVG转PNG下载 */
async function downloadPng(svgStr: string, filename: string) {
  const svgBlob = new Blob([svgStr], {type: 'image/svg+xml;charset=utf-8'});
  const url = URL.createObjectURL(svgBlob);
  let img: HTMLImageElement | null = null;
  try {
    img = new Image();
    // 竞态：图片加载成功 or 8s 超时，谁先到用谁（防止无效 SVG 长时间挂起）
    await Promise.race([
      new Promise<void>((resolve, reject) => {
        img!.onload = () => resolve();
        img!.onerror = reject;
        img!.src = url;
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('加载超时')), 8000)),
    ]);

    const canvas = document.createElement('canvas');
    canvas.width = EXPORT_SIZE;
    canvas.height = EXPORT_SIZE;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, EXPORT_SIZE, EXPORT_SIZE);

    canvas.toBlob((blob) => {
      if (!blob) {
        MessagePlugin.error('PNG生成失败');
        return;
      }
      const pngUrl = URL.createObjectURL(blob);
      triggerDownload(pngUrl, `${filename}.png`);
      URL.revokeObjectURL(pngUrl);
      MessagePlugin.success('PNG下载成功');
    }, 'image/png');
  } catch (e) {
    MessagePlugin.error('图片加载失败');
  } finally {
    URL.revokeObjectURL(url);
    img = null;
  }
}

// 该函数当前未接入任何按钮（iOS/Android 图标导出目前只提供 SVG），
// 属于"已实现、待启用"的预留能力。这里显式引用一次，既避免 noUnusedLocals 报错，
// 也表明是刻意保留而非遗漏；构建时会被当作无副作用代码摇掉，不影响产物。
void downloadPng;

// ===================== 业务下载事件 =====================
/** 配色卡片下载图标 */
async function downloadLogo(index: number) {
  const colorItem = colorList[index];
  const svgCode = buildTransparentIconSvg(colorItem.hex);
  downloadSvg(svgCode, `logo_${colorItem.name}_透明底`);
}

/** 深浅底色适配卡片下载 */
async function downloadAdaptLogo(index: number) {
  const item = bgAdaptList[index];
  logger.info(item);
  const svgCode = buildTransparentIconSvg(item.path1);
  downloadSvg(svgCode, `logo_adapt_${item.index}`);
}

/** iOS图标下载（当前仅导出 SVG；PNG 导出逻辑暂注释，待启用） */
async function downloadIosIcon() {
  const svgCode = buildIosAppIconSvg(PRIMARY_COLOR);
  // downloadPng(svgCode, 'ios图标_带背景')
  downloadSvg(svgCode, 'logo');
}

/** Android图标下载 */
async function downloadAndroidIcon() {
  const svgCode = buildAndroidAppIconSvg(PRIMARY_COLOR);
  downloadSvg(svgCode, 'logo');
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
  min-width: 180px;
}

.color-card .icon {
  width: 88px;
  height: 88px;
  border-radius: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
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

.cname {
  font-size: 14px;
  font-weight: 600;
}

.hex {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
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

.size-item svg {
  display: block;
  background: #2e7dff;
  border-radius: 20%;
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
