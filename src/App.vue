<script setup lang="ts">
import {ref} from 'vue';
import zhCN from "ant-design-vue/lib/locale/zh_CN"; // 导入中文语言包

import dayjs from "dayjs";
import "dayjs/locale/zh-cn";

dayjs.locale("zh-cn");
const locale = ref(zhCN);
</script>

<template>
  <a-config-provider :locale="locale">
      <router-view/>
  </a-config-provider>
</template>

<style scoped>
</style>
