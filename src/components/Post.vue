<!--这是推文组件,用于展示一条推文-->
<script setup lang="ts">
import {h, onBeforeMount, ref} from 'vue';
import {
  HeartOutlined,
  ShareAltOutlined,
  MessageOutlined,
  LinkOutlined,
  WeiboOutlined,
  EllipsisOutlined,
  DeleteOutlined,
  StopOutlined
} from "@ant-design/icons-vue";
import dayjs from 'dayjs';
import {type MenuProps, message} from "ant-design-vue";
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
import type {IAccount, IComment, IPost} from "../interface";
import {timestampFormat} from "@/common/utils.ts";
import instance from '../services/';
import appStore from "../stores";
import ImageGrid from "@/components/ImageGrid.vue";
import TextCollapse from "@/components/TextCollapse.vue";
import {apiUrls, update_self_account} from "@/services/api.ts";

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
    instance.post(apiUrls.post_follow(), JSON.stringify(data)).then(() => {
      message.success('关注成功');
      follow.value.is_following = !follow.value.is_following;
    });
  } else {
    //   取消点赞
    instance.delete(apiUrls.delete_follow(account_id, props.post.account_id)).then(() => {
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
      account_id: account_id
    }

    instance.post(apiUrls.post_likes(), {...data}).then(() => {
      message.success("点赞成功");
      like.value.count += 1;
      like.value.is_liked = !like.value.is_liked;
    });
  } else {
    instance.delete(apiUrls.delete_likes(props.post.post_id)).then(() => {
      message.success("取消点赞成功");
      like.value.count -= 1;
      like.value.is_liked = !like.value.is_liked;
    })
  }
};


const handleShare = () => {
}

const comments = ref<IComment[]>([]);
const submitting = ref<boolean>(false);
const comment_data = ref<string>('');
const account_id = appStore.useAccountStore.account.account_id;
const select_item = ref<string>('');
const account = ref<IAccount>();
const follow = ref();
const like = ref();

onBeforeMount(() => {
  // 查询帖子对应的帐户信息
  instance.get(apiUrls.get_account(props.post.account_id)).then((r: any) => {
    account.value = r.data as IAccount;
  });
  // 查询帐户粉丝情况
  instance.get(apiUrls.get_account_follow(props.post.account_id)).then((r: any) => follow.value = r.data);
  // 查询点赞数
  instance.get(apiUrls.get_likes(props.post.post_id)).then((r: any) => like.value = r.data);
})

// 提交评论
const handleSubmit = () => {
  if (!comment_data.value) {
    return;
  }
  submitting.value = true;
  let data = {
    content: comment_data.value.trim(),
    obj_id: props.post.post_id,
    obj_type: 1,
    account_id: account_id
  }
  // 提交成功后清空输入框
  instance.post(apiUrls.post_comments(), {...data}).then((r: any) => {
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
const handleComment = async () => {
  select_item.value = select_item.value === 'c' ? '' : 'c';
   // 1.加载评论
  await instance.get(apiUrls.get_comments(props.post.post_id)).then(async (r: any) => {
    let items = comments.value.concat(r.data.items);
    let map = new Map();
    items.forEach((item) => map.set(item.comment_id, item));
    comments.value = Array.from(map.values());
    comments.value = comments.value.sort((a, b) => new Date(b.gmt_created).getTime() - new Date(a.gmt_created).getTime());

    // 2. 提取所有不重复的 account_id
    const accountIds = Array.from(new Set(comments.value.map(a => a.account_id)));

    // 3. 批量获取用户信息
    await Promise.all(accountIds.map(async id => {
      if(user_map.value[id]) return;
      instance.get(apiUrls.get_account(id)).then((r: IAccount) => user_map.value[id] = r.data);
    }))
  });
}

// 组合式 API 中的复制函数
const copyLink = async (url: string) => {
  try {
    await navigator.clipboard.writeText(url);
    message.success('链接已复制到剪贴板'); // 使用 ant-design-vue 的 message
  } catch {
    // 降级方案（兼容 Safari 等旧浏览器）
    const input = document.createElement('input');
    input.value = url;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    message.success('链接已复制（兼容模式）');
  }
};

import {Modal} from 'ant-design-vue';

const handleClick: MenuProps['onClick'] = e => {
  switch (e.key) {
    case '0':
      //删除帖子
      Modal.confirm({
        title: '你确定要执行这个操作吗？',
        content: '删除此帖子后,不可恢复!',
        okText: '确定',
        cancelText: '取消',
        onOk() {
          instance.delete(apiUrls.delete_posts(props.post.post_id))
              .then(() => {
                message.success(`删除成功`);
                appStore.usePostStore.delete_post(props.post.post_id);
              })
              .catch((e: any) => message.error(`删除失败${e}`))
          // 这里写确认后要执行的逻辑
        },
        onCancel() {
          console.log('用户取消了');
        }
      });
      break;
    case '1':
      const to = 'a@qq.com';
      const subject = '建议反馈';
      const body = '你好，我有以下建议：';

      const href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

      // 关键：打开后立刻关闭空白页
      const tab = window.open(href, '_blank');
      break;
    default:
      break
  }
};


const user_map = ref<Record<string, IAccount>>({});
</script>

<template>
  <a-watermark :content="post.right_status === 0 ? '仅你自己可见' : ''"
               style="background-color: white; margin-bottom: 4px">
    <a-card style="text-align: left" size="small">
      <template #extra>
        <a-dropdown>
          <template #overlay>
            <a-menu @click="handleClick">
              <a-menu-item key="0" v-if="account_id === post.account_id">
                <DeleteOutlined/>
                删除此帖子
              </a-menu-item>
              <!--            <a-menu-divider v-if="account_id === post.account_id"/>-->
              <a-menu-item key="1" v-if="account_id !== post.account_id">
                <StopOutlined/>
                举报
              </a-menu-item>
            </a-menu>
          </template>
          <EllipsisOutlined/>
        </a-dropdown>
      </template>
      <!-- 第一段：用户信息 -->
      <template #title>
        <div style="display: flex; align-items: center; margin-bottom: 2px;">
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
                    <a-button type="primary">个人资料</a-button>
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
      </template>
      <!-- 第二段：博客内容 -->
      <div style="margin-bottom: 16px; background-color: white;">
        <a-space direction="vertical" :size="6" style="width: 100%;">
          <!--          文本描述内容-->

          <!--                <div v-html="post.content.text"  class="rich-text-content" ></div>-->
          <TextCollapse>
            <div v-html="post.content.text"></div>
          </TextCollapse>
          <!--        <Editor-->
          <!--            v-model="post.content.text"-->
          <!--            mode="readOnly"-->
          <!--        />-->

          <!--          图片展示 -->
          <ImageGrid :image-list="post.content.images" :single-max-width="160" :two-col-max-width="200"
                     :three-col-max-width="360"/>
        </a-space>
      </div>
      <template #actions>
        <!-- 第三段：操作按钮 -->
        <!-- 分享按钮 -->
        <a-popover title="分享给好友" trigger="click">
          <template #content>
             <a-qrcode :value="`${apiUrls.share_post_link(post?.post_id)}`" error-level="H"
                       :bordered="false" style="margin: 0 auto;"/>
            <a-space>
              <a-button type="primary" @click="copyLink(`${apiUrls.share_post_link(post?.post_id)}`)"
              >
                <template #icon>
                  <LinkOutlined/>
                </template>
                复制链接
              </a-button>
              <a-button type="primary">
                <template #icon>
                  <WeiboOutlined/>
                </template>
                <ShareNetwork
                    network="Weibo"
                    :url="`https://localhost/posts/${props.post.post_id}`"
                    :title="`来自${account?.nick_name}的分享`"
                    :description="$props.post.content.text"
                    quote="-"
                    hashtags="-"
                >
                  微博
                </ShareNetwork>
              </a-button>

            </a-space>
          </template>
          <a-button :icon="h(ShareAltOutlined)" type="text" @click="handleShare">分享</a-button>
        </a-popover>
        <!-- 评论按钮 -->
        <a-button :icon="h(MessageOutlined)" :type="select_item === 'c' ? 'primary' : 'text'" @click="handleComment">
          评论
        </a-button>
        <!-- 赞按钮 -->
        <a-button :icon="h(HeartOutlined)" type="text" @click="handleLike(post.post_id)">赞({{
            like?.count
          }})
        </a-button>
      </template>
    </a-card>
    <!--      评论框-->
    <a-comment v-if="select_item === 'c'" style="text-align: start">
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
    <a-list
        v-if="select_item === 'c'"
        :data-source="comments"
        :header="`${comments.length} 条评论`"
        item-layout="horizontal"
    >
      <template #renderItem="{ item }">
        <a-list-item style="text-align: start">
          <a-comment
              :author="user_map[item.account_id]?.nick_name"
              :avatar="user_map[item.account_id]?.avatar"
              :content="item.content"
              :datetime="timestampFormat(item.gmt_created)"
          />
        </a-list-item>
      </template>
    </a-list>
  </a-watermark>
</template>

<style scoped>

</style>