<!--这是推文组件,用于展示一条推文（tdesign-vue-next 重构版）-->
<script setup lang="ts">
import {h, onMounted, ref, computed} from 'vue';
import {storeToRefs} from "pinia";
import {
  DeleteIcon,
  StopCircleIcon
} from 'tdesign-icons-vue-next';
import dayjs from 'dayjs';
import {MessagePlugin, DialogPlugin, type DropdownProps} from 'tdesign-vue-next';
import {HeartIcon, LinkIcon, LogoTwitterIcon, ChatDoubleIcon, ShareIcon, MoreIcon} from 'tdesign-icons-vue-next';
import relativeTime from 'dayjs/plugin/relativeTime';
import {ShareNetwork} from 'vue-social-sharing'
import type {IAccount, IComment, IPost} from "@/interface";
import {getClampPreviewHtml, getResourceUrl, logger, timestampFormat} from "@/common/utils.ts";
import instance from '../services/';
import appStore from "../stores";
import NineImageGrid from "@/components/NineImageGrid.vue";
import {apiUrls} from "@/services/api.ts";
import UserAvatar from "@/components/UserAvatar.vue";
import {Ticker} from '@tombcato/smart-ticker/vue';
import '@tombcato/smart-ticker/style.css';
import {copyLink, formatMessageToHtml, formatter} from "../common/utils.ts";
import {config} from "../common/config.ts";
import ImageGallery from "./ImageGallery/ImageGallery.vue";
import RichTextCollapse from "./RichTextCollapse.vue";

dayjs.extend(relativeTime);

const props = defineProps<{
  post: IPost;
}>();

const feedbackDialogRef = ref();
const account_id = appStore.useAccountStore.account.account_id;
const select_item = ref<string>('');
const like = ref();
const comments = ref<IComment[]>([]);
const submitting = ref<boolean>(false);
const comment_data = ref<string>('');
const user_map = ref<Record<string, IAccount>>({});
const {account_map} = storeToRefs(appStore.useCacheStore);
// 构造下拉菜单选项
const dropdownOptions = computed<DropdownProps['options']>(() => {
  const opts: DropdownProps['options'] = [];
  const isOwner = appStore.useAccountStore.account.account_id === props.post.account_id;

  if (isOwner) {
    opts.push({
      value: 0,
      content: '删除帖子',
      prefixIcon: () => h(DeleteIcon),
      onClick: () => handleDropdownClick('0')
    });
  } else {
    opts.push({
      value: 1,
      content: '举报反馈',
      prefixIcon: () => h(StopCircleIcon),
      onClick: () => handleDropdownClick('1')
    });
  }
  return opts;
});

const account = computed(() => {
  if (!account_map.value[props.post.account_id]) {
    appStore.useCacheStore.fetch_account(props.post.account_id);
  }
  return account_map.value[props.post.account_id] ?? {};
})
const follow = computed(() => {
  return account_map.value[props.post.account_id]?.follow ?? {};
})


const handleFollow = () => appStore.useCacheStore.toggleFollow(account_id, props.post.account_id);

const handleLike = (post_id: string) => {
  select_item.value = select_item.value === 'like' ? '' : 'like';
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
    comments.value = comments.value.sort((a, b) => new Date(b.create_at).getTime() - new Date(a.create_at).getTime());
  }).finally(() => submitting.value = false);
}

// 加载评论
const handleComment = async () => {
  select_item.value = select_item.value === 'comment' ? '' : 'comment';
  await instance.get(apiUrls.get_comments(props.post.post_id)).then(async (r: any) => {
    let items = comments.value.concat(r.data.items);
    let map = new Map();
    items.forEach((item: any) => map.set(item.comment_id, item));
    comments.value = Array.from(map.values());
    comments.value = comments.value.sort((a, b) => new Date(b.create_at).getTime() - new Date(a.create_at).getTime());

    const accountIds = Array.from(new Set(comments.value.map(a => a.account_id)));
    await Promise.all(accountIds.map(async id => {
      if (user_map.value[id]) return;
      instance.get(apiUrls.get_account(id)).then((r: IAccount) => user_map.value[id] = r.data);
    }))
  });
}
// 下拉菜单点击事件
const handleDropdownClick = (value: string) => {
  switch (value) {
    case '0':
      // 删除帖子 confirm
      const diaglog = DialogPlugin.confirm({
        theme: "warning",
        header: '你确定要执行这个操作吗？',
        body: '删除此帖子后,不可恢复!',
        confirmBtn: '确定',
        cancelBtn: '取消',
        onConfirm: () => {
          instance.delete(apiUrls.delete_posts(props.post.post_id))
              .then(() => {
                MessagePlugin.success(`删除成功`);
                appStore.usePostStore.delete_post(props.post.post_id);
                diaglog.destroy();
              })
              .catch((e: any) => MessagePlugin.error(`删除失败${e}`))
        },
        onCancel: () => {
          logger.log('用户取消了');
        },
        onCloseBtnClick: () => {
          logger.log('用户取消了');
        },
      });
      break;
    case '1':
      feedbackDialogRef.value?.open();
      break;
    default:
      break
  }
};

onMounted(async () => {
  await appStore.useCacheStore.fetch_account(props.post.account_id);
  instance.get(apiUrls.get_likes(props.post.post_id)).then((r: any) => like.value = r.data);
})

// 帖子展开或收起
//const expanded = ref<boolean>(false);

//const html = getClampPreviewHtml(cleanHtml, config.CDN_BASE_URL)// `<div class="rich-content-wrapper">${getClampPreviewHtml(cleanHtml, config.CDN_BASE_URL)}</div>`;
</script>

<template>
  <t-watermark :watermark-content="{ text: post.right_status === 0 ? '仅你自己可见' : '' }"
               :y="120"
               :x="80"
               :width="120"
               :height="60"
  >
    <t-card size="small" style="text-align: left">
      <!-- 用户头部信息 -->
      <template #header>
        <div
            style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; width: 100%;">
          <t-space>
            <t-popup trigger="hover" show-arrow placement="bottom-left">
              <template #content>
                <t-space direction="vertical" style="width: 300px">
                  <UserAvatar :avatar="account?.avatar" :nickname="account?.nick_name"/>
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
                <UserAvatar :avatar="account?.avatar" :nickname="account?.nick_name"/>
              </router-link>
            </t-popup>
            <div>
              <t-typography-text style="margin: 0;"><b>{{ account?.nick_name || post.account_id }}</b>
              </t-typography-text>
              <br/>
              <span style="color: #888;">发布于{{ timestampFormat(post.create_at) }}</span>
            </div>
          </t-space>
          <t-space direction="horizontal">
            <t-button
                v-if="post.account_id !== account_id"
                theme="primary"
                @click="handleFollow"
                :danger="follow?.is_following"
            >
              {{ follow?.is_following ? '取消关注' : '加关注' }}
            </t-button>
            <t-dropdown :options="dropdownOptions">
              <t-button variant="text">
                <template #icon>
                  <more-icon/>
                </template>
              </t-button>
            </t-dropdown>
          </t-space>
        </div>
      </template>
      <!-- 推文正文内容 -->
      <div style="margin-bottom: 16px; background-color: white;">
        <t-space direction="vertical" :size="6" style="width: 100%;">
<!--                    <TextCollapse>-->
<!--                      <div v-html="getClampPreviewHtml(formatMessageToHtml(post.content.text), config.CDN_BASE_URL)"></div>-->
<!--                    </TextCollapse>-->
              <RichTextCollapse mode="auto" lines="2"
                                :content="getClampPreviewHtml(formatMessageToHtml(post.content.text), config.CDN_BASE_URL)" />
<!--          <RichLineClamp v-model:expanded="expanded"-->
<!--                         :html="html"-->
<!--                         :max-lines="2"-->
<!--                         boundary="word">-->
<!--            <template #after="{clamped}">-->
<!--              <t-link v-if="clamped || expanded" theme="primary" @click="()=>expanded = !expanded">-->
<!--                {{ expanded ? "收起" : "展开" }}-->
<!--              </t-link>-->
<!--            </template>-->
<!--          </RichLineClamp>-->
<!--          <NineImageGrid-->
<!--              :image-list="props.post.content.images"-->
<!--              :single-max-width="160"-->
<!--              :two-col-max-width="200"-->
<!--              :three-col-max-width="360"-->
<!--          />-->
          <ImageGallery :image-list="props.post.content.images" />
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
                    <t-button theme="primary" @click="copyLink(`${apiUrls.share_post_link(post?.post_id)}`, MessagePlugin)">
                      <template #icon>
                        <link-icon/>
                      </template>
                      复制链接
                    </t-button>
                    <t-button theme="primary">
                      <template #icon>
                        <logo-twitter-icon/>
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
              <t-button variant="text" @click="select_item === 'share'? '' : 'share'">
                <template #icon>
                  <share-icon/>
                </template>
                分享
              </t-button>
            </t-popup>
          </t-col>
          <t-col flex="auto" style="display: inline-flex; justify-content: center">
            <t-button
                :variant="select_item === 'comment' ? 'base' : 'text'"
                @click="handleComment"
            >
              <template #icon>
                <chat-double-icon/>
              </template>
              评论
            </t-button>
          </t-col>
          <t-col flex="auto" style="with: auto">
            <t-button variant="text" style="width: auto;" @click="handleLike(post.post_id)">
              <template #icon>
                <heart-icon
                    :fill-color="like?.is_liked ? ['red','red'] : ['transparent','transparent']"
                    :stroke-color="like?.is_liked ? ['red','red'] : ['currentColor','currentColor']"
                    :stroke-width="2"
                />
              </template>
              <div style="display: inline-flex; align-items: center; gap: 4px;">
                <span>赞</span>
                <Ticker
                    v-if="like?.count > 0"
                    :value="like?.count"
                    :duration="800"
                    easing="linear"
                    direction="ANY"
                    prefix="("
                    suffix=")"
                    :number-format="formatter"
                />
              </div>
            </t-button>

          </t-col>
        </t-row>

        <!-- 评论输入区域 -->
        <t-divider v-if="select_item === 'comment'"></t-divider>
        <t-comment v-if="select_item === 'comment'"
                   :avatar="getResourceUrl(appStore.useAccountStore.account?.avatar)">
          <template #content>
            <div class="form-container">
              <t-textarea v-model="comment_data" placeholder="请输入内容"/>
              <t-button class="form-submit" @click="handleSubmit">回复</t-button>
            </div>
          </template>
        </t-comment>

        <!-- 评论列表 -->
        <t-list
            v-if="select_item === 'c'"
            :header="`${comments.length} 条评论`"
            :split="true"
        >
          <t-list-item v-for="(item, index) in comments" :key="index">
            <t-comment
                :author="user_map[item.account_id]?.nick_name"
                :avatar="getResourceUrl(user_map[item.account_id]?.avatar)"
                :content="item.content"
                :datetime="timestampFormat(item.gmt_created)"
            />
          </t-list-item>
        </t-list>
      </template>
    </t-card>
  </t-watermark>
  <FeedbackDialog ref="feedbackDialogRef"/>
</template>

<style scoped>
.form-container {
  display: flex;
  flex-direction: column;
  align-items: flex-end;

  .form-submit {
    margin-top: 8px;
  }
}

:deep(.rich-content-wrapper) {
  line-height: 1.7;
}

:deep(.rich-content-wrapper img) {
  max-width: 100%;
  height: auto;
  display: block;
  /* 限制超长竖图最大高度，不需要就删掉 */
  max-height: 600px;
}

:deep(.rich-content-wrapper p) {
  margin: 0.6em 0;
}
</style>
