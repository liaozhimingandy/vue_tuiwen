<script setup lang="ts">
/**
 * 根组件
 * 负责全局主题/字体注入、首屏 loading 与路由出口渲染。
 * 注意：真正的"启动遮罩"在 index.html 里，这里的是 Vue 挂载后的二次加载态。
 *
 * 移动端在这里套一层 MobileShell（顶部标题 + 内容 + 底部 Tab），
 * 页面本身不需要知道自己是桌面还是移动端，也不用重复写导航结构。
 * 哪些页面要外壳由路由 meta 决定，见 common/mobile.ts。
 */
import {computed, onMounted, ref} from 'vue';
import {useRoute, useRouter} from 'vue-router';

import 'tdesign-vue-next/es/style/index.css';
import {logger} from '@/common/utils.ts';
import {useDeviceWatcher} from '@/common/device.ts';
import {resolveMobileView} from '@/common/mobile.ts';
import MobileShell from '@/layouts/MobileShell.vue';

/** 是否仍在初始化（初始化期间显示全屏 loading，不渲染路由） */
const is_loading = ref<boolean>(true);
const router = useRouter();
const route = useRoute();
const {isMobile} = useDeviceWatcher();

const mobileView = computed(() => resolveMobileView(route));
/** 是否走移动端外壳：桌面端、沉浸页（短视频/登录）都不套 */
const useMobileShell = computed(() => isMobile.value && mobileView.value.shell);

onMounted(async () => {
  try {
    // 1. 等待路由准备好
    await router.isReady();

    /**
     * 2. 公开页（meta.public）跳过全局数据加载
     *
     * 原先这里手写了一份路径前缀白名单，与 router 的路由表两处维护，
     * 一旦漂移就会出现"公开页也要等登录态"的问题（历史上 `/reset-pwd` 就从未命中过）。
     * 现在改为直接读当前匹配到的路由记录上的 meta.public，只有一处事实来源。
     */
    const isPublicRoute = router.currentRoute.value.matched.some((record) => record.meta?.public);
    if (isPublicRoute) return;

    // 3. 非公开页 → 在这里加载需要的全局数据
    // await getSystemConfig();
    // await getDictList();
  } catch (err) {
    logger.error('初始化异常', err);
  } finally {
    // 无论如何，关闭加载
    is_loading.value = false;
  }
});
</script>

<template>
  <t-config-provider
    :global-config="{
      font: {
        family:
          'Roboto, -apple-system-font, BlinkMacSystemFont, Microsoft YaHei, Microsoft YaHei UI, Helvetica Neue, PingFang SC, Hiragino Sans GB, Arial, sans-serif',
      },
    }"
  >
    <!-- 全屏加载容器 -->
    <div class="app-loading" v-if="is_loading">
      <t-loading indicator loading preventScrollThrough text="页面加载中..." size="large" :delay="500" />
    </div>
    <!-- 加载完成后显示内容 -->
    <!--
      移动端套一层外壳：顶部标题栏 + 内容 + 底部 Tab 栏。
      沉浸式页面（短视频、登录注册等）在路由 meta 上标记 mobileShell: false 即可跳过。
    -->
    <MobileShell v-else-if="useMobileShell">
      <router-view />
    </MobileShell>
    <router-view v-else />
  </t-config-provider>
</template>

<style scoped>
.app-loading {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
</style>
