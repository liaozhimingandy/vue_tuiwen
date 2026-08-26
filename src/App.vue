<script setup lang="ts">
import {ref, onMounted} from 'vue';
import {useRouter} from "vue-router";

import 'tdesign-vue-next/es/style/index.css';

const is_loading = ref<boolean>(true);
const router = useRouter();

// 不需要加载数据的白名单页面
const whiteList = [
  '/login/',
  '/register/',
  '/reset-pwd',
  '/s/'
];

onMounted(async () => {
  try {
    // 1. 等待路由准备好
    await router.isReady();

    const path = router.currentRoute.value.fullPath;

    // 2. 如果是白名单页面，直接不加载
    if (whiteList.some(item => path.startsWith(item))) {
      return;
    }

    // 3. 非白名单 → 在这里加载你需要的全局数据
    // await getSystemConfig();
    // await getDictList();
    // await store.dispatch('user/getInfo')

  } catch (err) {
    console.error('初始化异常', err);
  } finally {
    // 无论如何，关闭加载
    is_loading.value = false;
  }
})
</script>

<template>

  <t-config-provider>
    <!-- 全屏加载容器 -->
    <div class="app-loading" v-if="is_loading" >
      <t-loading indicator loading preventScrollThrough text="页面加载中..." size="large" :delay="500"/>
    </div>
    <!-- 加载完成后显示内容 -->
   <router-view v-else/>
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
