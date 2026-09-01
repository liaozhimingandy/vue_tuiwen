<template>
  <div class="logo-preview-page">
    <h1>方案B</h1>
    <p class="sub">用两只眼睛，气泡变成一个有表情的"发声"符号</p>

    <!-- 配色方向 -->
    <section>
      <h2>配色方向</h2>
      <div class="row">
        <div class="color-card" v-for="(item,index) in colorList" :key="index">
          <div class="icon" :style="{background:item.hex}">
            <Logo :fillBg="'#fff'" :fill-eye="item.hex"/>
          </div>
          <div class="cname">{{item.name}}</div>
          <div class="hex">{{item.hexTip}}</div>
        </div>
      </div>
    </section>

    <!-- App图标预览 iOS/Android -->
    <section>
      <h2>App 图标实际效果（iOS 圆角方 / Android 圆形）</h2>
      <div class="row">
        <div class="frame-card">
          <div class="app-icon ios">
            <Logo fillBg="#fff" fill-eye="#2E7DFF"/>
          </div>
          <div class="frame-label">iOS 圆角方形</div>
        </div>
        <div class="frame-card">
          <div class="app-icon android">
            <Logo fillBg="#fff" fill-eye="#2E7DFF"/>
          </div>
          <div class="frame-label">Android 圆形</div>
        </div>
      </div>
    </section>

    <!-- 小尺寸可读性测试 -->
    <section>
      <h2>小尺寸可读性测试</h2>
      <div class="size-test">
        <div class="size-item" v-for="s in sizeList" :key="s.px">
          <svg :width="s.px" :height="s.px" viewBox="0 0 100 100">
            <path d="M50 15 C 25 15 10 32 10 52 C 10 68 22 80 38 84 L 34 96 L 52 84 C 74 82 90 66 90 50 C 90 30 74 15 50 15 Z" fill="#fff"></path>
            <circle cx="38" cy="46" r="6" fill="#2E7DFF"></circle>
            <circle cx="62" cy="46" r="6" fill="#2E7DFF"></circle>
          </svg>
          <div class="lbl">{{s.label}}</div>
        </div>
      </div>
    </section>

    <!-- 深浅底色适配 -->
    <section>
      <h2>深浅底 / 单色版适配</h2>
      <div class="row">
        <div class="bg-card" v-for="bg in bgAdaptList" :key="bg.index" :style="{background:bg.bgColor,border:bg.border}">
          <Logo :fillBg="bg.path1" :fill-eye="bg.path2"/>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import Logo from '@/components/Logo.vue'

const colorList = [
  {
    name:'活力蓝（推荐）',
    hex:'#2E7DFF',
    hexTip:'#2E7DFF'
  },
  {
    name:'青绿',
    hex:'#00B876',
    hexTip:'#00B876（区别于微信标准绿，更清新）'
  },
  {
    name:'靛紫',
    hex:'#5B5FEF',
    hexTip:'#5B5FEF（更年轻、差异化更强）'
  },
  {
    name:'墨黑（高级感）',
    hex:'#1A1A1A',
    hexTip:'#1A1A1A'
  }
]

const sizeList = [
  {px:64, label:'64px（应用商店）'},
  {px:40, label:'40px（导航栏）'},
  {px:24, label:'24px（状态栏）'},
  {px:16, label:'16px（favicon）'},
]

const bgAdaptList = [
  {index:1, bgColor:'#ffffff', border:'1px solid #eee', path1:'#2E7DFF', path2:'#fff'},
  {index:2, bgColor:'#1A1A1A', border:'none', path1:'#fff', path2:'#1A1A1A'},
  {index:3, bgColor:'#f0f0f0', border:'none', path1:'#666', path2:'#f0f0f0'},
  {index:4, bgColor:'#2E7DFF', border:'none', path1:'#fff', path2:'#2E7DFF'},
  {index:5, bgColor:'#E5E6EB', border:'none', path1:'#C9CDD4', path2:'#E5E6EB'},
]
</script>

<style scoped>
.logo-preview-page{
  margin:0;
  font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
  background:#f4f4f2;
  color:#222;
  padding:40px 20px 80px;
}
h1{
  text-align:center;
  font-size:24px;
  font-weight:600;
  margin-bottom:4px;
}
.sub{
  text-align:center;
  color:#777;
  margin-top:0;
  margin-bottom:36px;
  font-size:14px;
}
section{
  max-width:1080px;
  margin:0 auto 48px;
}
h2{
  font-size:16px;
  font-weight:600;
  margin-bottom:14px;
  padding-left:4px;
  border-left:4px solid #2E7DFF;
}
.row{
  display:flex;
  gap:20px;
  flex-wrap:wrap;
}
/*配色卡片*/
.color-card{
  background:#fff;
  border-radius:16px;
  padding:20px;
  box-shadow:0 1px 3px rgba(0,0,0,0.08);
  text-align:center;
  flex:1;
  min-width:180px;
}
.color-card .icon{
  width:88px;
  height:88px;
  border-radius:22px;
  display:flex;
  align-items:center;
  justify-content:center;
  margin:0 auto 12px;
}
.color-card .icon :deep(svg){
  width:52px;
  height:52px;
}
.cname{
  font-size:14px;
  font-weight:600;
}
.hex{
  font-size:12px;
  color:#999;
  margin-top:2px;
}
/*iOS Android预览卡片*/
.frame-card{
  background:#fff;
  border-radius:16px;
  padding:24px;
  box-shadow:0 1px 3px rgba(0,0,0,0.08);
  text-align:center;
  flex:1;
  min-width:200px;
}
.app-icon{
  width:96px;
  height:96px;
  display:flex;
  align-items:center;
  justify-content:center;
  margin:0 auto 12px;
}
.app-icon.ios{
  border-radius:22px;
  background:#2E7DFF;
}
.app-icon.android{
  border-radius:50%;
  background:#2E7DFF;
}
.app-icon :deep(svg){
  width:56px;
  height:56px;
}
.frame-label{
  font-size:13px;
  color:#888;
}
/*尺寸测试区域*/
.size-test{
  background:#fff;
  border-radius:16px;
  padding:24px;
  box-shadow:0 1px 3px rgba(0,0,0,0.08);
  display:flex;
  align-items:flex-end;
  justify-content:center;
  gap:36px;
  flex-wrap:wrap;
}
.size-item{
  text-align:center;
}
.size-item svg{
  display:block;
  background:#2E7DFF;
  border-radius:20%;
}
.lbl{
  font-size:12px;
  color:#999;
  margin-top:8px;
}
/*深浅底色卡片*/
.bg-card{
  border-radius:16px;
  padding:28px;
  display:flex;
  align-items:center;
  justify-content:center;
  flex:1;
  min-width:180px;
  min-height:100px;
}
.bg-card :deep(svg){
  width:56px;
  height:56px;
}
</style>
