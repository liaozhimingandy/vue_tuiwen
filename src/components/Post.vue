<!--这是推文组件,用于展示一条推文-->
<script setup lang="ts">
import {h, ref} from 'vue';
import {HeartOutlined, ShareAltOutlined, MessageOutlined} from "@ant-design/icons-vue";

import type {IPost} from "../interface/types.ts";
import timestampFormat from "../common/utils.ts";
import PictureList from "./PictureList.vue";
import instance from '../services/';
import {message} from "ant-design-vue";

defineProps<{
  post: IPost;
}>();

const handleFollow = () => {
  // 处理加关注逻辑
  console.log('加关注');
};

const handleLike = (post_id: string) => {
  // 处理点赞逻辑
  let data = {
    "id": 0,
    "obj_id": post_id,
    "obj_type": 1,
    "account_id": localStorage.getItem('account_id')
  }

  instance.post("/likes/", data).then(() => {
    message.success("成功");
  })
};

const handleShare = () => {
  // 处理分享逻辑
  console.log('分享');
};

const handleComment = () => {
  // 处理评论逻辑
  console.log('评论');
};
</script>

<template>
    <a-card style="width: 100%; margin-bottom: 8px; border-radius: 8px; text-align: left">
      <!-- 第一段：用户信息 -->
      <div style="display: flex; align-items: center; margin-bottom: 16px;">
        <!-- 用户头像 -->
        <a-popover>
          <template #content>
            <a-space direction="vertical" style="width: 300px">
              <a-avatar src="https://xsgames.co/randomusers/avatar.php?g=male" :size="64"/>
              <a-typography-text style="margin: 0;">{{ post.account_id }}</a-typography-text>
              <a-divider/>
              <a-flex justify="space-between">
                <a-button type="primary" style="margin-right: 8px;">关注</a-button>
                <router-link :to="{ name: 'user', params: { username: post.account_id } }">
                  <a-button href="" type="text">个人资料</a-button>
                </router-link>
              </a-flex>
            </a-space>
          </template>
          <router-link :to="{ name: 'user', params: { username: post.account_id } }">
            <a-avatar src="https://xsgames.co/randomusers/avatar.php?g=male" size="large"/>
          </router-link>
        </a-popover>

        <!-- 用户信息 -->
        <div style="margin-left: 12px;">
          <a-typography-text style="margin: 0;">{{ post.account_id }}</a-typography-text>
          <br/>
          <span style="color: #888;">发布于{{ timestampFormat(post.gmt_created) }}</span>
        </div>

        <!-- 加关注按钮 -->
        <a-button type="primary" style="margin-left: auto;" @click="handleFollow">加关注</a-button>
      </div>

      <!-- 第二段：博客内容 -->
      <div style="margin-bottom: 16px;">
        <a-space direction="vertical" :size="6">
<!--          文本描述内容-->
          <p>
            {{ post.content.text }}<br/>
          </p>
          <!--          图片展示 -->
          <PictureList v-if="post.content.images.length>0" :images="post.content.images"/>
        </a-space>
      </div>

      <!-- 第三段：操作按钮 -->
      <div style="display: flex; justify-content: space-between;">
        <!-- 分享按钮 -->
        <a-button :icon="h(ShareAltOutlined)" type="text" @click="handleShare">分享</a-button>

        <!-- 评论按钮 -->
        <a-button :icon="h(MessageOutlined)" type="text" @click="handleComment">评论</a-button>

        <!-- 赞按钮 -->
        <a-button :icon="h(HeartOutlined)" type="text" @click="handleLike(post.post_id)">赞</a-button>
      </div>
    </a-card>
</template>

<style scoped>

</style>