<template>
  <div class="logo-preview-page">
    <h1>方案B</h1>
    <p class="sub">用两只眼睛，气泡变成一个有表情的"发声"符号</p>

    <!-- 配色方向 -->
    <section>
      <h2>配色方向</h2>
      <div class="row">
        <div class="color-card" v-for="(item, index) in colorList" :key="index">
          <div class="icon" :style="{ background: item.hex }">
            <div class="preview-svg">
              <LogoSvg :fill-bg="'#ffffff'" />
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
          <div class="app-icon ios" :style="{ background: PRIMARY_COLOR }">
            <div class="preview-svg">
              <LogoSvg :fill-bg="'#ffffff'" />
            </div>
          </div>
          <div class="frame-label">iOS 圆角方形</div>
          <t-button theme="primary" @click="downloadIosIcon">下载SVG</t-button>
        </div>
        <div class="frame-card">
          <div class="app-icon android" :style="{ background: PRIMARY_COLOR }">
            <div class="preview-svg">
              <LogoSvg :fill-bg="'#ffffff'" />
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
          :style="{ background: bg.bgColor, border: bg.border }"
        >
          <div class="preview-svg">
            <LogoSvg :fill-bg="bg.path1" />
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
import { MessagePlugin } from 'tdesign-vue-next'
import { logger } from '@/common/utils.ts'
import LogoSvg from "@/components/LogoSvg.vue";

// ===================== 常量定义 =====================
const BUBBLE_PATH = 'M50 15 C 25 15 10 32 10 52 C 10 68 22 80 38 84 L 34 96 L 52 84 C 74 82 90 66 90 50 C 90 30 74 15 50 15 Z'
const EYE1 = 'M 38 46 m -6 0 a 6 6 0 1 0 12 0 a 6 6 0 1 0 -12 0'
const EYE2 = 'M 62 46 m -6 0 a 6 6 0 1 0 12 0 a 6 6 0 1 0 -12 0'
const fullPreviewPath = `${BUBBLE_PATH} ${EYE1} ${EYE2}`

const PRIMARY_COLOR = '#2E7DFF';
const EXPORT_SIZE = 512;

// ===================== TS类型定义 =====================
interface ColorItem {
  name: string
  hex: string
  hexTip: string
}

interface SizeItem {
  px: number
  label: string
}

interface AdaptBgItem {
  index: number
  bgColor: string
  border: string
  path1: string
  path2: string
}

// ===================== SVG导出字符串生成函数（镂空版） =====================
/** 透明底图标：气泡品牌色 +【镂空眼睛】透出背景 */
function buildTransparentIconSvg(bubbleColor: string): string {
  const full = `${BUBBLE_PATH} ${EYE1} ${EYE2}`
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${EXPORT_SIZE}" height="${EXPORT_SIZE}">
      <path d="${full}" fill="${bubbleColor}" fill-rule="evenodd"/>
    </svg>
  `
}

/** iOS圆角背景图标 */
function buildIosAppIconSvg(bgColor: string): string {
  const full = `${BUBBLE_PATH} ${EYE1} ${EYE2}`
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${EXPORT_SIZE}" height="${EXPORT_SIZE}">
      <rect x="0" y="0" width="100" height="100" rx="22" fill="${bgColor}" />
      <path d="${full}" fill="#ffffff" fill-rule="evenodd"/>
    </svg>
  `
}

/** Android圆形背景图标 */
function buildAndroidAppIconSvg(bgColor: string): string {
  const full = `${BUBBLE_PATH} ${EYE1} ${EYE2}`
  return `
     <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${EXPORT_SIZE}" height="${EXPORT_SIZE}">
      <circle cx="50" cy="50" r="50" fill="${bgColor}" />
      <path d="${full}" fill="#ffffff" fill-rule="evenodd"/>
    </svg>
  `
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
]

const sizeList: SizeItem[] = [
  { px: 64, label: '64px（应用商店）' },
  { px: 40, label: '40px（导航栏）' },
  { px: 24, label: '24px（状态栏）' },
  { px: 16, label: '16px（favicon）' },
]

const bgAdaptList: AdaptBgItem[] = [
  { index: 1, bgColor: '#ffffff', border: '1px solid #eee', path1: '#2E7DFF', path2: '#fff' },
  { index: 2, bgColor: '#1A1A1A', border: 'none', path1: '#fff', path2: '#1A1A1A' },
  { index: 3, bgColor: '#f0f0f0', border: 'none', path1: '#666', path2: '#f0f0f0' },
  { index: 4, bgColor: '#2E7DFF', border: 'none', path1: '#fff', path2: '#2E7DFF' },
  { index: 5, bgColor: '#E5E6EB', border: 'none', path1: '#C9CDD4', path2: '#E5E6EB' },
]

// ===================== 底层下载工具函数 =====================
/** 创建a标签触发下载 */
function triggerDownload(objectUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
  }, 100)
}

/** 下载SVG文件 */
function downloadSvg(svgStr: string, filename: string) {
  const blob = new Blob([svgStr], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  triggerDownload(url, `${filename}.svg`)
  URL.revokeObjectURL(url)
  MessagePlugin.success('SVG下载成功')
}

/** SVG转PNG下载 */
async function downloadPng(svgStr: string, filename: string) {
  const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)
  let img: HTMLImageElement | null = null
  try {
    img = new Image()
    await Promise.race([
      new Promise<void>((resolve, reject) => {
        img!.onload = () => resolve()
        img!.onerror = reject
        img!.src = url
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('加载超时')), 8000)),
    ])

    const canvas = document.createElement('canvas')
    canvas.width = EXPORT_SIZE
    canvas.height = EXPORT_SIZE
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, EXPORT_SIZE, EXPORT_SIZE)

    canvas.toBlob((blob) => {
      if (!blob) {
        MessagePlugin.error('PNG生成失败')
        return
      }
      const pngUrl = URL.createObjectURL(blob)
      triggerDownload(pngUrl, `${filename}.png`)
      URL.revokeObjectURL(pngUrl)
      MessagePlugin.success('PNG下载成功')
    }, 'image/png')
  } catch (e) {
    MessagePlugin.error('图片加载失败')
  } finally {
    URL.revokeObjectURL(url)
    img = null
  }
}

// ===================== 业务下载事件 =====================
/** 配色卡片下载图标 */
async function downloadLogo(index: number) {
  const colorItem = colorList[index]
  const svgCode = buildTransparentIconSvg(colorItem.hex)
  downloadSvg(svgCode, `logo_${colorItem.name}_透明底`)
}

/** 深浅底色适配卡片下载 */
async function downloadAdaptLogo(index: number) {
  const item = bgAdaptList[index]
  logger.info(item)
  const svgCode = buildTransparentIconSvg(item.path1)
  downloadSvg(svgCode, `logo_adapt_${item.index}`)
}

/** iOS图标下载 */
async function downloadIosIcon() {
  const svgCode = buildIosAppIconSvg(PRIMARY_COLOR)
  // downloadPng(svgCode, 'ios图标_带背景')
   downloadSvg(svgCode, 'logo')
}

/** Android图标下载 */
async function downloadAndroidIcon() {
  const svgCode = buildAndroidAppIconSvg(PRIMARY_COLOR)
  downloadSvg(svgCode, 'logo')
}
</script>

<style scoped>
.logo-preview-page {
  margin: 0;
  font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
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
  border-left: 4px solid #2E7DFF;
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
  background: #2E7DFF;
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
