<script setup lang="ts">
import {ref, computed} from 'vue';

const props = defineProps({
  images: {
    type: Array,
    required: true,
  },
});

const isModalVisible = ref(false);
const currentIndex = ref(0);

const currentImage = computed(() => props.images[currentIndex.value]);

const handleCancel = () => {
  isModalVisible.value = false;
};

const prevImage = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--;
  }
};

const nextImage = () => {
  if (currentIndex.value < props.images.length - 1) {
    currentIndex.value++;
  }
};

const openModal = (index: number) => {
  currentIndex.value = index;
  isModalVisible.value = true;
};
// 使用 defineExpose 暴露方法
defineExpose({
  openModal,
});
</script>

<template>
  <a-modal
      v-model:visible="isModalVisible"
      :footer="null"
      @cancel="handleCancel"
      width="80%"
  >
    <a-row>
      <a-col :span="12">
        <a-image
            :src="currentImage"
            :style="{ width: '100%', height: 'auto' }"
            :preview="false"
        />
      </a-col>
      <a-col :span="12">
        <!-- 在此添加评论等相关信息 -->
        <p>评论区</p>
      </a-col>
    </a-row>
    <a-row justify="space-between" style="margin-top: 10px;">
      <a-col>
        <a-button @click="prevImage" :disabled="currentIndex === 0">上一张</a-button>
      </a-col>
      <a-col>
        <a-button @click="nextImage" :disabled="currentIndex === images.length - 1">下一张</a-button>
      </a-col>
    </a-row>
  </a-modal>
</template>

<style scoped>

</style>