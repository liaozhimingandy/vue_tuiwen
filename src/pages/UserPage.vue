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
      <a-row justify="center">
        <a-col :span="12">
          <a-row
              style="height: 300px; background-image: url(http://127.0.0.1:8000/static/medias/images/234af2ff-a34c-4a11-a110-2627729de2b9.jpg)">
            <a-button @click="go_back()" :icon="h(ArrowLeftOutlined)" type="text" danger></a-button>
          </a-row>
          <a-row justify="space-between" align="bottom">
            <a-avatar
                src="http://127.0.0.1:8000/static/medias/images/234af2ff-a34c-4a11-a110-2627729de2b9.jpg"
                :size="80"></a-avatar>
            <a-space>
              <a-button>测试</a-button>
            </a-space>
          </a-row>
          <a-tabs>
            <a-tab-pane key="1" tab="基本信息">{{username}}</a-tab-pane>
            <a-tab-pane key="2" tab="帖子"></a-tab-pane>
          </a-tabs>

        </a-col>
      </a-row>
    </a-layout-content>
  </a-layout>
</template>

<style scoped>

</style>