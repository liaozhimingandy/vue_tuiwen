<script setup lang="ts">
/**
 * 焦点页（视频信息流）
 *
 * YouTube Shorts 式布局：
 * - 视频居中，尺寸按横竖屏自适应（竖屏=手机大小，横屏自动横向铺开）
 * - 头像/点赞/评论等互动栏在视频外右侧
 * - 作者与标题在视频下方
 *
 * 数据源当前为 Mock（src/video-kit/services/mockVideos.ts），
 * 接后端时只需把 fetchVideoPage 换成真实接口。
 */
import VideoFeed from "@/video-kit/components/VideoFeed.vue";
import {fetchVideoPage} from "@/video-kit/services/mockVideos";
</script>

<template>
  <!-- Shorts 布局需要独占整个视口，不要套栅格容器（t-row/t-col 会挤压定位） -->
  <div class="spotlight-page">
    <VideoFeed variant="shorts" :fetch-page="fetchVideoPage" :page-size="5" fit="cover"/>
  </div>
</template>

<style scoped>
.spotlight-page {
  position: fixed;
  inset: 0;
  background: white;
  /* 盖住全局导航/底栏（如有） */
  z-index: 100;
}

.video-feed {
    --vk-progress-color: #027AFF;  /* 进度条已播放部分的颜色 */
    --vk-progress-bg: rgba(255, 255, 255, 0.2);  /* 进度条轨道底色 */
    --vk-bg: #0f0f0f;  /* 页面背景色（shorts 模式默认 #0f0f0f） */
    --vk-volume-color: #027AFF;
}
</style>
