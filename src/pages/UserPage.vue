<script setup lang="ts">
import {h} from 'vue';
import {useRoute} from 'vue-router';
import {ArrowLeftOutlined} from "@ant-design/icons-vue";
import Header from "../components/Header.vue";

const route = useRoute()
const username = route.params.username;

const go_back = () => {
  window.history.back();
}

</script>

<template>
  <a-layout style="min-height: 100vh; text-align: center;">
    <a-layout-header ref="headerRef" :style="{width: '100%',
      'background-color': 'white'}">
      <Header selected-keys="o"/>
    </a-layout-header>
    <a-layout-content style="padding-top: 8px">
      <a-button @click="go_back()" :icon="h(ArrowLeftOutlined)" type="text" style="width: 60px"></a-button>
      <h1>用户界面{{ username }}</h1>
    </a-layout-content>
  </a-layout>
</template>

<style scoped>

</style>