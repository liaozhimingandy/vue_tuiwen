<script setup lang="ts">
/**
 * 视频信息流页
 *
 * video-kit 的落地页：全屏抖音式上下滑信息流。
 * 数据源当前为 Mock（src/video-kit/services/mockVideos.ts），
 * 接后端时只需把 fetchVideoPage 换成真实接口。
 */
import VideoFeed from "@/video-kit/components/VideoFeed.vue";
import {fetchVideoPage} from "@/video-kit/services/mockVideos";
</script>

<template>
    <div class="video-feed-page">
        <VideoFeed :fetch-page="fetchVideoPage" :page-size="5" fit="cover"/>
    </div>
</template>

<style scoped>
.video-feed-page {
    position: fixed;
    inset: 0;
    background: #000;
    /* 盖住全局导航/底栏（如有） */
    z-index: 100;
}
</style>
