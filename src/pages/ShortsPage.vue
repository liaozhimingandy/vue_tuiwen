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
 * 深链：`/shorts/?v=<id>` 直接定位到指定视频（YouTube 同款）
 * 分享出去的链接被打开时，信息流会从这一条开始，后续内容跟在它后面
 */
const {initialVideoId, syncToUrl} = useVideoDeepLink();

/**
 * 退出短视频浮层
 * 直接输网址进来的场景没有历史记录，router.back() 会留在原地，故兜底回首页
 */
function goBack() {
  if (window.history.length > 1) {
    router.back();
  } else {
    void router.push({name: 'home'});
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return;
  // 焦点在输入控件里时不接管（如评论框）
  const el = e.target as HTMLElement | null;
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
  goBack();
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <!-- Shorts 布局需要独占整个视口，不要套栅格容器（t-row/t-col 会挤压定位） -->
  <div class="spotlight-page">
    <button class="back-btn" aria-label="返回" @click="goBack">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
      </svg>
    </button>
    <VideoFeed
      variant="shorts"
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
.spotlight-page {
  position: fixed;
  inset: 0;
  background: white;
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

.back-btn:hover {
  background: rgba(0, 0, 0, 0.65);
}

.back-btn svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.video-feed {
  --vk-progress-color: #027aff; /* 进度条已播放部分的颜色 */
  --vk-progress-bg: rgba(255, 255, 255, 0.2); /* 进度条轨道底色 */
  --vk-bg: #0f0f0f; /* 页面背景色（shorts 模式默认 #0f0f0f） */
  --vk-volume-color: #027aff;
}
</style>
