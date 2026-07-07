<script setup lang="ts">
import {ref, onMounted} from 'vue';
import zhCN from "ant-design-vue/lib/locale/zh_CN"; // 导入中文语言包

import dayjs from "dayjs";
import "dayjs/locale/zh-cn";

dayjs.locale("zh-cn");
const locale = ref(zhCN);

const is_loading = ref<boolean>(true);

onMounted(() => {
  setTimeout(() => {
    is_loading.value = false;
  }, 300);
})
</script>

<template>
  <a-config-provider :locale="locale">
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
