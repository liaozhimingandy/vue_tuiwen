<script setup lang="ts">
import {h} from 'vue';
import {useRoute} from 'vue-router';
import {ArrowLeftOutlined} from "@ant-design/icons-vue";

const route = useRoute()
const username = route.params.username;

const go_back = () => {
  window.history.back();
}

</script>

<template>
  <a-button @click="go_back()" :icon="h(ArrowLeftOutlined)" type="text" style="width: 60px"></a-button>
  <h1>用户界面{{ username }}</h1>
  <a-row style="background-color: red">
    <h1>test</h1>
  </a-row>
</template>

<style scoped>

</style>