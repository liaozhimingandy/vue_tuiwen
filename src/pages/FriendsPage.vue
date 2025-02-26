<script setup lang="ts">

import {BugFilled} from "@ant-design/icons-vue";

</script>

<template>
<a-layout style="min-height: 100vh; text-align: center;">
    <a-layout-header ref="header" :style="{width: '100%',
      'background-color': 'white'}">
      <Header />
    </a-layout-header>
    <a-layout-content style="padding-top: 8px">

    </a-layout-content>
  </a-layout>
  <a-float-button-group>
    <a-float-button>
      <template #icon>
        <BugFilled/>
      </template>
      <template #tooltip>
        <div>给我们提出宝贵的意见或建议,我们非常关注你的建议</div>
        <b>liaozhimingandy@qq.com</b>
      </template>
    </a-float-button>
  </a-float-button-group>
</template>

<style scoped>

</style>