<!--这是推文组件,用于展示一条推文（tdesign-vue-next 重构版）-->
<script setup lang="ts">
import {h, onMounted, ref, computed} from 'vue';
// ========== TDesign 图标替换 antd icons ==========
import {
  ShareIcon,
  DeleteIcon,
  StopCircleIcon,
} from 'tdesign-icons-vue-next';
import dayjs from 'dayjs';
// TDesign 全局提示、弹窗确认
import {MessagePlugin, DialogPlugin} from 'tdesign-vue-next';
import relativeTime from 'dayjs/plugin/relativeTime';
import {ShareNetwork} from 'vue-social-sharing'

dayjs.extend(relativeTime);
import type {IAccount, IComment, IPost} from "@/interface";
import {formatMessageToHtml, getResourceUrl, timestampFormat} from "@/common/utils.ts";
import instance from '../services/';
import appStore from "../stores";
import NineImageGrid from "@/components/NineImageGrid.vue";
import TextCollapse from "@/components/TextCollapse.vue";
import {apiUrls} from "@/services/api.ts";
import {useCacheStore} from "@/stores/app.ts";
import {storeToRefs} from "pinia";
import FacePicker from "@/components/FacePicker.vue";

const props = defineProps<{
  post: IPost;
}>();

const cacheStore = useCacheStore();
const {account_map} = storeToRefs(cacheStore)
const account = computed(() => {
  return account_map.value[props.post.account_id] ?? {};
})
const follow = computed(() => {
  return account_map.value[props.post.account_id]?.follow ?? {};
})

const account_id = appStore.useAccountStore.account.account_id;
const select_item = ref<string>('');
const like = ref();
const comments = ref<IComment[]>([]);
const submitting = ref<boolean>(false);
const comment_data = ref<string>('');
const user_map = ref<Record<string, IAccount>>({});

const handleFollow = () => cacheStore.toggleFollow(account_id, props.post.account_id);

const handleLike = (post_id: string) => {
  if (!like?.value.is_liked) {
    let data = {
      obj_id: post_id,
      obj_type: 1,
      account_id: account_id
    }
    instance.post(apiUrls.post_likes(), {...data}).then(() => {
      MessagePlugin.success("点赞成功");
      like.value.count += 1;
      like.value.is_liked = !like.value.is_liked;
    });
  } else {
    instance.delete(apiUrls.delete_likes(props.post.post_id)).then(() => {
      MessagePlugin.success("取消点赞成功");
      like.value.count -= 1;
      like.value.is_liked = !like.value.is_liked;
    })
  }
};

const handleShare = () => {
}

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
  instance.post(apiUrls.post_comments(), {...data}).then((r: any) => {
    MessagePlugin.success("评论成功!");
    comment_data.value = '';
    let els = comments.value.concat(r.data);
    let map = new Map();
    els.forEach((el) => map.set(el.comment_id, el));
    comments.value = Array.from(map.values());
    comments.value = comments.value.sort((a, b) => new Date(b.gmt_created).getTime() - new Date(a.gmt_created).getTime());
  }).finally(() => submitting.value = false);
}

// 加载评论
const handleComment = async () => {
  select_item.value = select_item.value === 'c' ? '' : 'c';
  await instance.get(apiUrls.get_comments(props.post.post_id)).then(async (r: any) => {
    let items = comments.value.concat(r.data.items);
    let map = new Map();
    items.forEach((item) => map.set(item.comment_id, item));
    comments.value = Array.from(map.values());
    comments.value = comments.value.sort((a, b) => new Date(b.gmt_created).getTime() - new Date(a.gmt_created).getTime());

    const accountIds = Array.from(new Set(comments.value.map(a => a.account_id)));
    await Promise.all(accountIds.map(async id => {
      if (user_map.value[id]) return;
      instance.get(apiUrls.get_account(id)).then((r: IAccount) => user_map.value[id] = r.data);
    }))
  });
}

// 复制链接
const copyLink = async (url: string) => {
  try {
    await navigator.clipboard.writeText(url);
    MessagePlugin.success('链接已复制到剪贴板');
  } catch {
    const input = document.createElement('input');
    input.value = url;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    MessagePlugin.success('链接已复制（兼容模式）');
  }
};

// 下拉菜单点击事件
const handleDropdownClick = (value: string) => {
  switch (value) {
    case '0':
      // 删除帖子 confirm
      DialogPlugin.confirm({
        header: '你确定要执行这个操作吗？',
        body: '删除此帖子后,不可恢复!',
        confirmBtn: '确定',
        cancelBtn: '取消',
        onConfirm: () => {
          instance.delete(apiUrls.delete_posts(props.post.post_id))
              .then(() => {
                MessagePlugin.success(`删除成功`);
                appStore.usePostStore.delete_post(props.post.post_id);
              })
              .catch((e: any) => MessagePlugin.error(`删除失败${e}`))
        },
        onClose: () => {
          console.log('用户取消了');
        }
      });
      break;
    case '1':
      const to = 'a@qq.com';
      const subject = '建议反馈';
      const body = '你好，我有以下建议：';
      const href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      const tab = window.open(href, '_blank');
      break;
    default:
      break
  }
};

const onSelectFace = () => {
}

onMounted(async () => {
  await appStore.useCacheStore.fetch_account(props.post.account_id);
  instance.get(apiUrls.get_likes(props.post.post_id)).then((r: any) => like.value = r.data);
})

// 构造下拉菜单选项
const dropdownOptions = computed(() => {
  const opts: Array<{ value: string; content: any; icon?: any }> = [];
  if (account_id === post.account_id) {
    opts.push({
      value: '0',
      content: '删除此帖子',
      icon: h(DeleteIcon)
    })
  }
  if (account_id !== post.account_id) {
    opts.push({
      value: '1',
      content: '举报',
      icon: h(StopCircleIcon)
    })
  }
  return opts;
})
</script>

<template>
  <t-watermark :watermark-content="{ text: post.right_status === 0 ? '仅你自己可见' : '' }"
  >
    <t-card size="small" style="text-align: left">
      <!-- 卡片右上角下拉更多 -->
      <template #actions>
        <t-dropdown
            :options="dropdownOptions"
            @click="handleDropdownClick"
            trigger="click"
        >
          <t-button variant="text">
            <template #icon>
              <t-icon name="more"/>
            </template>
          </t-button>
        </t-dropdown>
      </template>

      <!-- 用户头部信息 -->
      <template #header>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; width: 100%;">
          <t-space>
            <t-popup trigger="hover" show-arrow placement="bottom-left">
              <template #content>
                <t-space direction="vertical" style="width: 300px">
                  <t-avatar :image="getResourceUrl(account?.avatar)" size="large"/>
                  <t-typography-text style="margin: 0;">{{ account?.nick_name || post.account_id }}</t-typography-text>
                  <t-typography-text style="margin: 0;">正在关注: {{ follow.followee_count }} | 粉丝数:
                    {{ follow.follower_count }}
                  </t-typography-text>
                  <t-divider/>
                  <t-space justify="space-between" style="width:100%">
                    <t-button
                        v-if="account_id !== post.account_id"
                        theme="primary"
                        :danger="follow?.is_following"
                        @click="handleFollow"
                    >
                      {{ follow?.is_following ? '取消关注' : '加关注' }}
                    </t-button>
                    <router-link :to="{ name: 'user', params: { username: post.account_id } }">
                      <t-button theme="primary">个人资料</t-button>
                    </router-link>
                  </t-space>
                </t-space>
              </template>
              <router-link :to="{ name: 'user', params: { username: post.account_id } }">
                <t-avatar :image="getResourceUrl(account?.avatar)" size="large"/>
              </router-link>
            </t-popup>

            <div style="margin-left: 12px;">
              <t-typography-text style="margin: 0;"><b>{{ account?.nick_name || post.account_id }}</b>
              </t-typography-text>
              <br/>
              <span style="color: #888;">发布于{{ timestampFormat(post.gmt_created) }}</span>
            </div>
          </t-space>
          <t-button
              v-if="post.account_id !== account_id"
              theme="primary"
              @click="handleFollow"
              :danger="follow?.is_following"
          >
            {{ follow?.is_following ? '取消关注' : '加关注' }}
          </t-button>

        </div>
      </template>

      <!-- 推文正文内容 -->
      <div style="margin-bottom: 16px; background-color: white;">
        <t-space direction="vertical" :size="6" style="width: 100%;">
          <TextCollapse>
            <div v-html="formatMessageToHtml(post.content.text)"></div>
          </TextCollapse>
          <NineImageGrid
              :image-list="props.post.content.images"
              :single-max-width="160"
              :two-col-max-width="200"
              :three-col-max-width="360"
          />
        </t-space>
      </div>

      <!-- 底部操作栏：分享 / 评论 / 点赞 -->
      <template #footer>
        <t-row :align="'middle'" justify="center" style="gap: 24px">
          <t-col flex="auto" style="display: inline-flex; justify-content: center">
            <t-popup show-arrow>
              <template #content>
                <div style="text-align:center;padding:8px">
                  <t-qrcode
                      :value="`${apiUrls.share_post_link(post?.post_id)}`"
                      level="H"
                      type="svg"
                      style="margin: 0 auto;"
                  />
                  <t-space style="margin-top:12px">
                    <t-button theme="primary" @click="copyLink(`${apiUrls.share_post_link(post?.post_id)}`)">
                      <template #icon>
                        <t-icon name="link"/>
                      </template>
                      复制链接
                    </t-button>
                    <t-button theme="primary">
                      <template #icon>
                        <t-icon name="logo-twitter"/>
                      </template>
                      <ShareNetwork
                          network="Weibo"
                          :url="`${apiUrls.share_post_link(post?.post_id)}`"
                          :title="`来自${account?.nick_name}的分享`"
                          :description="post.content.text"
                          quote="-"
                          hashtags="-"
                      >
                        微博
                      </ShareNetwork>
                    </t-button>
                  </t-space>
                </div>
              </template>
              <t-button variant="text" @click="handleShare">
                <template #icon>
                  <t-icon name="share"/>
                </template>
                分享
              </t-button>
            </t-popup>
          </t-col>
          <t-col flex="auto" style="display: inline-flex; justify-content: center">
            <t-button
                :variant="select_item === 'c' ? 'base' : 'text'"
                @click="handleComment"
            >
              <template #icon>
                <t-icon name="chat-bubble"/>
              </template>
              评论
            </t-button>
          </t-col>
          <t-col flex="auto" style="display: inline-flex; justify-content: center">
            <t-button variant="text" @click="handleLike(post.post_id)">
              <template #icon>
                <t-icon name="heart"/>
              </template>
              赞({{ like?.count }})
            </t-button>
          </t-col>
        </t-row>
      </template>
    </t-card>

    <!-- 评论输入区域 -->
    <t-comment v-if="select_item === 'c'" style="text-align: start;background-color: white">
      <template #avatar>
        <t-avatar :src="appStore.useAccountStore.account?.avatar" alt="avatar"/>
      </template>
      <template #content>
        <t-textarea v-model="comment_data" :rows="4"/>
        <div style="display:flex;justify-content:space-between;margin-top:8px;align-items:center">
          <t-popup trigger="click" show-arrow>
            <template #content>
              <FacePicker @select="onSelectFace"/>
            </template>
            <t-tooltip content="表情包">
              <t-button variant="text" size="large"/>
              <template #icon>
                <t-icon name="smille"/>
              </template>
            </t-tooltip>
          </t-popup>
          <t-button theme="primary" :loading="submitting" @click="handleSubmit">
            提交评论
          </t-button>
        </div>
      </template>
    </t-comment>

    <!-- 评论列表 -->
    <t-list
        v-if="select_item === 'c'"
        :data="comments"
        :header="`${comments.length} 条评论`"
    >
      <t-list-item style="text-align: start" v-for="item in comments">
        <t-comment
            :author="user_map[item.account_id]?.nick_name"
            :avatar="user_map[item.account_id]?.avatar"
            :content="item.content"
            :datetime="timestampFormat(item.gmt_created)"
        />
      </t-list-item>
    </t-list>
  </t-watermark>
</template>

<style scoped>

</style>
