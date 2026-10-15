<script setup lang="ts">
/**
 * 视频信息流页
 *
 * video-kit 的落地页：全屏抖音式上下滑信息流。
 * 数据源当前为 Mock（src/video-kit/services/mockVideos.ts），
 * 接后端时只需把 fetchVideoPage 换成真实接口。
 *
 * ⚠️ 本页是 position:fixed 的全屏浮层（z-index:100），会盖住全局导航，
 * 因此必须自带出口（返回按钮 + Esc），否则用户只能靠浏览器后退键离开。
 */
import {onBeforeUnmount, onMounted} from 'vue';
import {useRouter} from 'vue-router';
import VideoFeed from '@/video-kit/components/VideoFeed.vue';
import {useVideoDeepLink} from '@/video-kit/composables/useVideoDeepLink';
import {fetchVideoById, fetchVideoPage} from '@/video-kit/services/mockVideos';

const router = useRouter();

/**
 * 深链：`/videos/?v=<id>` 直接定位到指定视频（YouTube 同款）
 * 分享按钮生成的就是这个链接（见 VideoFeed 的 onShare）
 */
const {initialVideoId, syncToUrl} = useVideoDeepLink();

/** 退出全屏信息流（无历史记录时兜底回首页） */
function goBack() {
  if (window.history.length > 1) {
    router.back();
  } else {
    void router.push({name: 'home'});
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return;
  const el = e.target as HTMLElement | null;
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
  goBack();
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <div class="video-feed-page">
    <button class="back-btn" aria-label="返回" @click="goBack">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
      </svg>
    </button>
    <VideoFeed
      :fetch-page="fetchVideoPage"
      :resolve-video="fetchVideoById"
      :initial-video-id="initialVideoId"
      :page-size="5"
      fit="cover"
      @change="syncToUrl"
    />
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

/* 浮层自带出口：盖住了全局导航，没有它用户只能按浏览器后退 */
.back-btn {
  position: absolute;
  top: calc(12px + env(safe-area-inset-top));
  left: 12px;
  z-index: 110;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  cursor: pointer;
  backdrop-filter: blur(4px);
}

.back-btn svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}
</style>
