<script setup lang="ts">
import {ref, onMounted} from 'vue';
import zhCN from "ant-design-vue/es/locale/zh_CN";

const is_loading = ref<boolean>(true);

onMounted(() => {
  setTimeout(() => {
    is_loading.value = false;
  }, 300);
})
</script>

<template>
  <a-config-provider :locale="zhCN">
    <a-spin
        :spinning="is_loading"
        delay="300"
        tip="加载中..."
        size="large"
    >
    <router-view/>
    </a-spin>

  </a-config-provider>
</template>

<style scoped>
</style>
