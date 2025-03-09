<!--这是推文组件,用于展示一条推文-->
<script setup lang="ts">
import {h, onBeforeMount, ref} from 'vue';
import {HeartOutlined, ShareAltOutlined, MessageOutlined} from "@ant-design/icons-vue";
import dayjs from 'dayjs';
import {message} from "ant-design-vue";
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
import type {IAccount, IComment, IPost} from "../interface";
import {timestampFormat} from "@/common/utils.ts";
import PictureList from "./PictureList.vue";
import instance from '../services/';
import appStore from "../stores";

const props = defineProps<{
  post: IPost;
}>();

const handleFollow = () => {
  if (!follow.value?.is_following) {
    // 处理加关注逻辑
    let data = {
      follower_id: account_id,
      followee_id: props.post.account_id
    };
    instance.post('/follows/', JSON.stringify(data)).then(() => {
      message.success('关注成功');
      follow.value.is_following = !follow.value.is_following;
    });
  } else {
    //   取消点赞
    instance.delete(`/follows/${account_id}/${props.post.account_id}/`).then(() => {
      message.success('取消关注成功');
      follow.value.is_following = !follow.value.is_following;
    });

  }
};

const handleLike = (post_id: string) => {
  if (!like?.value.is_liked) {
    // 处理点赞逻辑
    let data = {
      obj_id: post_id,
      obj_type: 1,
      account_id: localStorage.getItem('account_id')
    }

    instance.post("/likes/", JSON.stringify(data)).then(() => {
      message.success("点赞成功");
      like.value.count += 1;
      like.value.is_liked = !like.value.is_liked;
    });
  } else {
    instance.delete(`/likes/${props.post.post_id}/`).then(() => {
      message.success("取消点赞成功");
      like.value.count -= 1;
      like.value.is_liked = !like.value.is_liked;
    })
  }
};

const handleShare = () => {
  // 处理分享逻辑
  console.log('分享');
};

const comments = ref<IComment[]>([]);
const submitting = ref<boolean>(false);
const comment_data = ref<string>('');
const account_id = localStorage.getItem('account_id');
const select_item = ref<string>('');
const account = ref<IAccount>();
const follow = ref();
const like = ref();

onBeforeMount(() => {
  // 查询帖子对应的帐户信息
  instance.get(`/accounts/${props.post.account_id}/`).then((r: any) => {
    account.value = r.data as IAccount;
  });
  // 查询帐户粉丝情况
  instance.get(`/follows/${props.post.account_id}/count/`).then((r: any) => follow.value = r.data);
  // 查询点赞数
  instance.get(`/likes/${props.post.post_id}/count/`).then((r: any) => like.value = r.data);
})
// 提交评论
const handleSubmit = () => {
  if (!comment_data.value) {
    return;
  }
  submitting.value = true;
  let data = {
    content: comment_data.value,
    obj_id: props.post.post_id,
    obj_type: 1,
    account_id: localStorage.getItem('account_id')
  }
  // 提交成功后清空输入框
  instance.post("/comments/", JSON.stringify(data)).then((r: any) => {
    message.success("评论成功!");
    comment_data.value = '';
    let els = comments.value.concat(r.data);
    let map = new Map();
    els.forEach((el) => map.set(el.comment_id, el));
    comments.value = Array.from(map.values());
    comments.value = comments.value.sort((a, b) => new Date(b.gmt_created).getTime() - new Date(a.gmt_created).getTime());
  }).finally(() => submitting.value = false);
}

// 当点击评论按钮时
const handleComment = () => {
  select_item.value = select_item.value === 'c' ? '' : 'c';
  // 加载评论
  instance.get(`/comments/1/${props.post.post_id}/`).then((r: any) => {
    let els = comments.value.concat(r.data);
    let map = new Map();
    els.forEach((el) => map.set(el.comment_id, el));
    comments.value = Array.from(map.values());
    comments.value = comments.value.sort((a, b) => new Date(b.gmt_created).getTime() - new Date(a.gmt_created).getTime());

  });
}

</script>

<template>
  <a-card style="width: 100%; margin-bottom: 8px; border-radius: 8px; text-align: left">
    <!-- 第一段：用户信息 -->
    <div style="display: flex; align-items: center; margin-bottom: 16px;">
      <!-- 用户头像 -->
      <a-popover>
        <template #content>
          <a-space direction="vertical" style="width: 300px">
            <a-avatar :src="account?.avatar" :size="64"/>
            <a-typography-text style="margin: 0;">{{ account?.nick_name || post.account_id }}</a-typography-text>
            <a-typography-text style="margin: 0;">正在关注: {{ follow.followee_count }} | 粉丝数:
              {{ follow.follower_count }}
            </a-typography-text>
            <a-divider/>
            <a-flex justify="space-between">
              <a-button v-if="account_id !== post.account_id" type="primary"
                        @click="handleFollow" :danger="follow?.is_following">
                {{ follow?.is_following ? '取消关注' : '加关注' }}
              </a-button>
              <router-link :to="{ name: 'user', params: { username: post.account_id } }">
                <a-button type="text">个人资料</a-button>
              </router-link>
            </a-flex>
          </a-space>
        </template>
        <router-link :to="{ name: 'user', params: { username: post.account_id } }">
          <a-avatar :src="account?.avatar" size="large"/>
        </router-link>
      </a-popover>

      <!-- 用户信息 -->
      <div style="margin-left: 12px;">
        <a-typography-text style="margin: 0;"><b>{{ account?.nick_name || post.account_id }}</b></a-typography-text>
        <br/>
        <span style="color: #888;">发布于{{ timestampFormat(post.gmt_created) }}</span>
      </div>

      <!-- 加关注按钮 -->
      <a-button v-if="post.account_id !== account_id" type="primary"
                style="margin-left: auto;" @click="handleFollow" :danger="follow?.is_following">
        {{ follow?.is_following ? '取消关注' : '加关注' }}
      </a-button>
    </div>

    <!-- 第二段：博客内容 -->
    <div style="margin-bottom: 16px; background-color: #888888;">
      <a-space direction="vertical" :size="6">
        <!--          文本描述内容-->
        <p>
          {{ post.content.text }}<br/>
        </p>
        <!--          图片展示 -->
        <PictureList v-if="props.post.content.images.length>0" :images="post.content.images"/>
      </a-space>
    </div>

    <!-- 第三段：操作按钮 -->
    <div style="display: flex; justify-content: space-between;">
      <!-- 分享按钮 -->
      <a-button :icon="h(ShareAltOutlined)" type="text" @click="handleShare">分享</a-button>

      <!-- 评论按钮 -->
      <a-button :icon="h(MessageOutlined)" :type="select_item === 'c' ? 'primary' : 'text'" @click="handleComment">
        评论
      </a-button>

      <!-- 赞按钮 -->
      <a-button :icon="h(HeartOutlined)" type="text" @click="handleLike(post.post_id)">赞({{ like?.count }})</a-button>
    </div>
    <a-list
        v-if="select_item === 'c'"
        :data-source="comments"
        :header="`${comments.length} 条评论`"
        item-layout="horizontal"
    >
      <template #renderItem="{ item }">
        <a-list-item>
          <a-comment
              :author="item.account_id"
              :content="item.content"
              :datetime="timestampFormat(item.gmt_created)"
          />
        </a-list-item>
      </template>
      <!--      评论框-->
      <a-comment>
        <template #avatar>
          <a-avatar :src="appStore.useAccountStore.account?.avatar" alt="..."/>
        </template>
        <template #content>
          <a-form-item>
            <a-textarea v-model:value="comment_data" :rows="4"/>
          </a-form-item>
          <a-form-item>
            <a-button html-type="submit" :loading="submitting" type="primary" @click="handleSubmit">
              提交评论
            </a-button>
          </a-form-item>
        </template>
      </a-comment>
    </a-list>

  </a-card>
</template>

<style scoped>

</style>