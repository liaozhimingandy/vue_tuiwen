<script setup lang="ts">
import {useRoute} from "vue-router";
import {onMounted, ref} from "vue";
import type {IPost, IAccount} from "@/interface";
import instance from "@/services"
import {apiUrls} from "@/services/api.ts";
import {timestampFormat} from "@/common/utils.ts";
import ImageGrid from "@/components/ImageGrid.vue";

const route = useRoute();
const post_id = route.params.post_id;
const post = ref<IPost>(null);
const account = ref<IAccount>(null);

onMounted(async () => {
  let r = await instance.get(apiUrls.get_post(post_id));
  post.value = r.data as IPost;

  //拉取用户信息
  r = await instance.get(apiUrls.get_account(post.value.account_id));
  account.value = r.data as IAccount;
})
</script>

<template>
  <a-empty v-if="!post">
  </a-empty>
  <a-layout>
    <a-layout-header class="custom-header">
      <a-space>
        <a-avatar :src="account?.avatar" :size="64"></a-avatar>
        <a-typography-title :level="4">{{ account?.nick_name }}</a-typography-title>
        <a-typography-text>发布于{{ timestampFormat(post?.gmt_created) }}</a-typography-text>
      </a-space>
    </a-layout-header>
    <a-layout-content>
      <a-col :xs="{ span: 22, offset: 1 }" :md="{ span: 20, offset: 2 }" style="background-color: #fff">
        <div v-html="post?.content?.text" v-if="post?.post_type==2" class="rich-wrap"/>
        <a-typography-text v-if="post?.post_type==1">
          {{ post?.content?.text }}
        </a-typography-text>
        <ImageGrid v-if="post?.post_type==1" :image-list="post.content.images" :single-max-width="160"
                   :two-col-max-width="200"
                   :three-col-max-width="360"/>
      </a-col>
    </a-layout-content>
    <a-layout-footer style="text-align: center">
       © {{ new Date().getFullYear() }} - {{account?.nick_name}}
    </a-layout-footer>
  </a-layout>
</template>

<style scoped>
.custom-header {
  background: #f5f5f5; /* 你想要的颜色 */
  color: #333; /* 文字颜色 */
  line-height: 64px; /* 保持垂直居中 */
}

/* 限制富文本内 图片、表格、iframe、大区块全部自适应 */
/* 核心容器：防止整体溢出 */
.rich-wrap {
  width: 100%;
  overflow-x: hidden; /* 最后一道防线：如果有东西非要溢出去，直接切掉并显示滚动条（或者hidden隐藏） */
}

/* 1. 媒体资源与块级元素限制 */
.rich-wrap :deep(img),
.rich-wrap :deep(video),
.rich-wrap :deep(iframe),
.rich-wrap :deep(svg),
.rich-wrap :deep(canvas) {
  max-width: 100% !important;
  height: auto !important;
  display: block; /* 消除图片底部的微小间隙 */
}

/* 2. 代码块与预格式化文本 */
.rich-wrap :deep(pre),
.rich-wrap :deep(code) {
  white-space: pre-wrap !important; /* 允许代码自动换行 */
  word-break: break-all !important;
  max-width: 100% !important;
  overflow-x: auto; /* 代码块太宽时，允许它自己出现滚动条，而不是撑破页面 */
}

/* 3. 表格特殊处理 */
.rich-wrap :deep(table) {
  table-layout: fixed !important;
  width: 100% !important;
  max-width: 100% !important;
  word-break: break-all !important;
}

/* 4. 通用文本换行 */
.rich-wrap :deep(p),
.rich-wrap :deep(span),
.rich-wrap :deep(li),
.rich-wrap :deep(a) {
  word-break: break-word; /* 优先在单词间换行，break-all 是最后手段 */
  word-wrap: break-word;
  max-width: 100%;
}

/* 5. 兜底：防止未知元素撑开 */
.rich-wrap :deep(*) {
  box-sizing: border-box !important;
}
</style>