<!--这是推文组件,用于展示一条推文（tdesign-vue-next 重构版）-->
<script setup lang="ts">
import {h, onMounted, ref, computed, watch} from 'vue';
import {storeToRefs} from 'pinia';
import {DeleteIcon, StopCircleIcon} from 'tdesign-icons-vue-next';
import {MessagePlugin, DialogPlugin, type DropdownProps} from 'tdesign-vue-next';
import {HeartIcon, LinkIcon, ChatDoubleIcon, ShareIcon, MoreIcon} from 'tdesign-icons-vue-next';
// 说明：原先这里 `import {ShareNetwork} from 'vue-social-sharing'`，但该包（4.0.0-alpha4）
// 只导出 default（一个 Vue 插件），并没有具名导出 ShareNetwork，
// 所以取到的是 undefined，模板里的 <ShareNetwork> 无法解析、微博分享按钮实际不生效。
// 现已改为直接拼微博官方 share 链接（见 weiboShareUrl），同时省掉该依赖约 53KB。
import type {IAccount, IComment, IPost} from '@/interface';
// 同一模块只保留一条 import：历史上 common/utils.ts 被 `@/` 与相对路径各导入一次，
// 功能上没问题，但会让"这个依赖到底从哪来"变得难查。
import {
  compareByTimeDesc,
  copyLink,
  formatMessageToHtml,
  formatter,
  getClampPreviewHtml,
  getEntityTime,
  getResourceUrl,
  logger,
  timestampFormat,
} from '@/common/utils.ts';
import instance from '../services/';
import appStore from '../stores';
import {apiUrls} from '@/services/api.ts';
import UserAvatar from '@/components/UserAvatar.vue';
import {Ticker} from '@tombcato/smart-ticker/vue';
import '@tombcato/smart-ticker/style.css';
import {config} from '../common/config.ts';
import ImageGallery from './ImageGallery/ImageGallery.vue';
import RichTextCollapse from './RichTextCollapse.vue';
import {isSupportedSingleEmoji} from '../common/emoji.ts';
import SingleEmoji from './SingleEmoji.vue';

// 注：这里原先还有 `dayjs` + `dayjs/plugin/relativeTime` 的引入，
// 但全项目从未调用过 `.fromNow()`；时间展示统一走 `timestampFormat()`。
// 已移除这两条 import，dayjs 随之退出本组件的依赖链。

const props = defineProps<{
  post: IPost;
}>();

/** 点赞数据（{count, is_liked}），由 onMounted 异步拉取，请求返回前为 undefined */
interface ILikeState {
  count: number;
  is_liked: boolean;
}

const feedbackDialogRef = ref();
const account_id = appStore.useAccountStore.account.account_id;
const select_item = ref<string>('');
const like = ref<ILikeState>();
const comments = ref<IComment[]>([]);
/** 评论提交中（防止重复点击「回复」） */
const submitting = ref<boolean>(false);
/** 评论列表加载中（防止快速开合导致并发重复请求） */
const commentsLoading = ref<boolean>(false);
const comment_data = ref<string>('');
const user_map = ref<Record<string, IAccount>>({});
const {account_map} = storeToRefs(appStore.useCacheStore);
const isSingleEmoji = computed(() => {
  // 用 `content?.text` 而不是 `post?.content.text`：真正可能缺的是 content，
  // 可选链写在 post 上等于没保护（这也是原写法的问题）
  return isSupportedSingleEmoji(props.post?.content?.text ?? '');
});
// 构造下拉菜单选项
const dropdownOptions = computed<DropdownProps['options']>(() => {
  const opts: DropdownProps['options'] = [];
  const isOwner = appStore.useAccountStore.account.account_id === props.post.account_id;

  if (isOwner) {
    opts.push({
      value: 0,
      content: '删除帖子',
      prefixIcon: () => h(DeleteIcon),
      onClick: () => handleDropdownClick('0'),
    });
  } else {
    opts.push({
      value: 1,
      content: '举报反馈',
      prefixIcon: () => h(StopCircleIcon),
      onClick: () => handleDropdownClick('1'),
    });
  }
  return opts;
});

/** 推文作者资料（优先读缓存，未命中时由下方的 watch 触发加载） */
const account = computed(() => account_map.value[props.post.account_id] ?? ({} as IAccount));

/**
 * 按需加载作者资料
 *
 * 这里用 watch 而不是「在 computed 里顺手发请求」：
 * computed 应当是纯函数，在求值过程中触发副作用会让依赖收集与缓存行为难以预测
 * （历史上正是这种写法，配合缓存逻辑把 Promise 写进了 account_map）。
 */
watch(
  () => props.post.account_id,
  (id) => {
    if (!id) return;
    // 单条资料失败不该影响整条推文的渲染（头像/昵称会退化成占位）
    appStore.useCacheStore.fetch_account(id).catch((e: unknown) => logger.warn('作者资料加载失败', e));
  },
  {immediate: true},
);

/**
 * 微博分享链接
 *
 * 直接拼接微博官方 share 接口，替代 vue-social-sharing 组件。
 * 该组件此前因具名导出不存在而失效，且会为单个分享按钮引入约 53KB 依赖。
 *
 * @returns 可直接作为 <a href> 的微博分享地址；缺少 post_id 时返回空串
 */
const weiboShareUrl = computed(() => {
  const postId = props.post?.post_id;
  if (!postId) return '';

  const url = apiUrls.share_post_link(postId);
  const text = props.post?.content?.text ?? '';
  const params = new URLSearchParams({
    url,
    // 微博 share 接口只用 title 一个参数承载文案
    title: `来自${account.value.nick_name ?? ''}的分享 - ${text}`,
  });
  return `https://service.weibo.com/share/share.php?${params.toString()}`;
});
const follow = computed(() => {
  return account_map.value[props.post.account_id]?.follow ?? {};
});

const handleFollow = () => appStore.useCacheStore.toggleFollow(account_id, props.post.account_id);

/**
 * 点赞 / 取消点赞
 *
 * 关键点：
 * 1. `like` 由 onMounted 异步拉取，未返回前是 undefined。
 *    原写法 `like?.value.is_liked` 的可选链只保护了 `like`，
 *    真正的 `like.value` 并没有被保护，接口慢一点就会抛
 *    「Cannot read properties of undefined」。
 * 2. 采用乐观更新：先改 UI 再发请求，失败回滚，点击立刻有反馈。
 * 3. 不再顺带改写 `select_item`——那会让「赞一下」把已展开的评论面板关掉。
 */
const handleLike = async (post_id: string) => {
  const current = like.value;
  if (!current) return;

  const wasLiked = !!current.is_liked;
  const prevCount = current.count ?? 0;

  current.is_liked = !wasLiked;
  current.count = prevCount + (wasLiked ? -1 : 1);

  try {
    if (!wasLiked) {
      await instance.post(apiUrls.post_likes(), {
        obj_id: post_id,
        obj_type: 1,
        account_id: account_id,
      });
      await MessagePlugin.success('点赞成功');
    } else {
      await instance.delete(apiUrls.delete_likes(post_id));
      await MessagePlugin.success('取消点赞成功');
    }
  } catch (e) {
    // 回滚乐观更新，避免界面与后端状态不一致
    current.is_liked = wasLiked;
    current.count = prevCount;
    logger.error('点赞操作失败，已回滚', e);
  }
};

/** 提交评论 */
const handleSubmit = async () => {
  const content = comment_data.value.trim();
  if (!content || submitting.value) return;

  submitting.value = true;
  try {
    const r: any = await instance.post(apiUrls.post_comments(), {
      content: content,
      obj_id: props.post.post_id,
      obj_type: 1,
      account_id: account_id,
    });
    await MessagePlugin.success('评论成功!');
    comment_data.value = '';
    // 用 Map 按 comment_id 去重后再按时间倒序
    const map = new Map<string, IComment>();
    [...comments.value, r.data].forEach((el) => map.set(el.comment_id, el));
    comments.value = Array.from(map.values()).sort(compareByTimeDesc);
  } catch (e) {
    logger.error('评论提交失败', e);
  } finally {
    submitting.value = false;
  }
};

/**
 * 拉取评论作者资料（评论列表里需要展示昵称/头像）
 *
 * 原实现把 `instance.get(...).then(...)` 写在 map 回调里但没有 return，
 * 于是 async 回调立即 resolve，`await Promise.all(...)` 等在的是一批空 Promise，
 * 等于什么都没等。这里改为 return / await 真实请求。
 */
const loadCommentAuthors = async () => {
  const ids = Array.from(new Set(comments.value.map((c) => c.account_id))).filter((id) => id && !user_map.value[id]);
  await Promise.all(
    ids.map(async (id) => {
      // 注意：回调参数是 AxiosResponse，用户数据在 r.data
      const r = await instance.get(apiUrls.get_account(id));
      user_map.value[id] = r.data as IAccount;
    }),
  );
};

/**
 * 展开 / 收起评论，首次展开时拉取评论列表
 *
 * 用 commentsLoading 做并发护栏：快速开合不会叠加出多份重复请求。
 */
const handleComment = async () => {
  const willOpen = select_item.value !== 'comment';
  select_item.value = willOpen ? 'comment' : '';
  if (!willOpen || commentsLoading.value) return;

  commentsLoading.value = true;
  try {
    const r: any = await instance.get(apiUrls.get_comments(props.post.post_id));
    const map = new Map<string, IComment>();
    [...comments.value, ...(r.data?.items ?? [])].forEach((item) => map.set(item.comment_id, item));
    comments.value = Array.from(map.values()).sort(compareByTimeDesc);
    await loadCommentAuthors();
  } catch (e) {
    logger.error('评论加载失败', e);
  } finally {
    commentsLoading.value = false;
  }
};
// 下拉菜单点击事件
const handleDropdownClick = (value: string) => {
  switch (value) {
    case '0': {
      // 删除帖子 confirm
      const diaglog = DialogPlugin.confirm({
        theme: 'warning',
        header: '你确定要执行这个操作吗？',
        body: '删除此帖子后,不可恢复!',
        confirmBtn: '确定',
        cancelBtn: '取消',
        onConfirm: () => {
          instance
            .delete(apiUrls.delete_posts(props.post.post_id))
            .then(() => {
              MessagePlugin.success(`删除成功`);
              appStore.usePostStore.delete_post(props.post.post_id);
              diaglog.destroy();
            })
            .catch((e: any) => MessagePlugin.error(`删除失败${e}`));
        },
        onCancel: () => {
          logger.log('用户取消了');
        },
        onCloseBtnClick: () => {
          logger.log('用户取消了');
        },
      });
      break;
    }
    case '1':
      feedbackDialogRef.value?.open();
      break;
    default:
      break;
  }
};

onMounted(async () => {
  // 预置当前登录用户的资料：自己刚发出的评论可以立刻显示昵称/头像，
  // 不必为"我自己"再额外发一次账号详情请求
  if (account_id && !user_map.value[account_id]) {
    user_map.value[account_id] = appStore.useAccountStore.account;
  }

  // 作者资料由上面的 watch 负责加载，这里只取点赞数
  try {
    const r: any = await instance.get(apiUrls.get_likes(props.post.post_id));
    like.value = r.data as ILikeState;
  } catch (e) {
    logger.error('点赞数加载失败', e);
  }
});

// 帖子展开或收起
//const expanded = ref<boolean>(false);

//const html = getClampPreviewHtml(cleanHtml, config.CDN_BASE_URL)// `<div class="rich-content-wrapper">${getClampPreviewHtml(cleanHtml, config.CDN_BASE_URL)}</div>`;
</script>

<template>
  <t-watermark
    :watermark-content="{text: post.right_status === 0 ? '仅你自己可见' : ''}"
    :y="120"
    :x="80"
    :width="120"
    :height="60"
  >
    <t-card size="small" style="text-align: left">
      <!-- 用户头部信息 -->
      <template #header>
        <div
          style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; width: 100%"
        >
          <t-space>
            <t-popup trigger="hover" show-arrow placement="bottom-left">
              <template #content>
                <t-space direction="vertical" style="width: 300px">
                  <UserAvatar :avatar="account?.avatar" :nickname="account?.nick_name" />
                  <t-typography-text style="margin: 0">{{ account?.nick_name || post.account_id }}</t-typography-text>
                  <t-typography-text style="margin: 0"
                    >正在关注: {{ follow.followee_count }} | 粉丝数:
                    {{ follow.follower_count }}
                  </t-typography-text>
                  <t-divider />
                  <t-space justify="space-between" style="width: 100%">
                    <t-button
                      v-if="account_id !== post.account_id"
                      theme="primary"
                      :danger="follow?.is_following"
                      @click="handleFollow"
                    >
                      {{ follow?.is_following ? '取消关注' : '加关注' }}
                    </t-button>
                    <router-link :to="{name: 'user', params: {username: post.account_id}}">
                      <t-button theme="primary">个人资料</t-button>
                    </router-link>
                  </t-space>
                </t-space>
              </template>
              <router-link :to="{name: 'user', params: {username: post.account_id}}">
                <UserAvatar :avatar="account?.avatar" :nickname="account?.nick_name" />
              </router-link>
            </t-popup>
            <div>
              <t-typography-text style="margin: 0"
                ><b>{{ account?.nick_name || post.account_id }}</b>
              </t-typography-text>
              <br />
              <span style="color: #888">发布于{{ timestampFormat(getEntityTime(post)) }}</span>
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
                  <more-icon />
                </template>
              </t-button>
            </t-dropdown>
          </t-space>
        </div>
      </template>
      <!-- 推文正文内容 -->

      <template #cover>
        <t-space direction="vertical" :size="6" style="width: 100%">
          <!--                    <TextCollapse>-->
          <!--                      <div v-html="getClampPreviewHtml(formatMessageToHtml(post.content.text), config.CDN_BASE_URL)"></div>-->
          <!--                    </TextCollapse>-->

          <div style="margin: 0 16px; width: 100%">
            <SingleEmoji
              v-if="isSingleEmoji"
              :content="post.content.text"
              :continue-after-shrink="true"
              :size="32"
              :animation-size="100"
            />
            <RichTextCollapse
              v-else
              mode="auto"
              :lines="2"
              :content="getClampPreviewHtml(formatMessageToHtml(post.content.text), config.CDN_BASE_URL)"
            />
          </div>
          <ImageGallery :image-list="props.post.content.images" />

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
        </t-space>
      </template>
      <!-- 底部操作栏：分享 / 评论 / 点赞 -->
      <template #footer>
        <t-row :align="'middle'" justify="center" style="gap: 24px">
          <t-col flex="auto" style="display: inline-flex; justify-content: center">
            <t-popup show-arrow>
              <template #content>
                <div style="text-align: center; padding: 8px">
                  <t-qrcode
                    :value="`${apiUrls.share_post_link(post?.post_id)}`"
                    level="H"
                    type="svg"
                    style="margin: 0 auto"
                  />
                  <t-space style="margin-top: 12px">
                    <t-button
                      theme="primary"
                      @click="copyLink(`${apiUrls.share_post_link(post?.post_id)}`, MessagePlugin)"
                    >
                      <template #icon>
                        <link-icon />
                      </template>
                      复制链接
                    </t-button>
                    <t-button theme="primary">
                      <template #icon>
                        <share-icon />
                      </template>
                      <!--
                        微博分享：用官方 share 接口的普通链接实现。
                        原实现用 <ShareNetwork network="Weibo">，但该组件取到的是 undefined（见脚本顶部说明），
                        按钮实际不可点击；这里改为原生 <a>，行为等价且零依赖。
                      -->
                      <a class="share-weibo" :href="weiboShareUrl" target="_blank" rel="noopener noreferrer"> 微博 </a>
                    </t-button>
                  </t-space>
                </div>
              </template>
              <t-button variant="text" @click="select_item === 'share' ? '' : 'share'">
                <template #icon>
                  <share-icon />
                </template>
                分享
              </t-button>
            </t-popup>
          </t-col>
          <t-col flex="auto" style="display: inline-flex; justify-content: center">
            <t-button :variant="select_item === 'comment' ? 'base' : 'text'" @click="handleComment">
              <template #icon>
                <chat-double-icon />
              </template>
              评论
            </t-button>
          </t-col>
          <t-col flex="auto" style="with: auto">
            <t-button variant="text" style="width: auto" @click="handleLike(post.post_id)">
              <template #icon>
                <heart-icon
                  :fill-color="like?.is_liked ? ['red', 'red'] : ['transparent', 'transparent']"
                  :stroke-color="like?.is_liked ? ['red', 'red'] : ['currentColor', 'currentColor']"
                  :stroke-width="2"
                />
              </template>
              <div style="display: inline-flex; align-items: center; gap: 4px">
                <span>赞</span>
                <Ticker
                  v-if="(like?.count ?? 0) > 0"
                  :value="like?.count ?? 0"
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
        <t-comment v-if="select_item === 'comment'" :avatar="getResourceUrl(appStore.useAccountStore.account?.avatar)">
          <template #content>
            <div class="form-container">
              <t-textarea v-model="comment_data" placeholder="请输入内容" />
              <t-button class="form-submit" :loading="submitting" :disabled="submitting" @click="handleSubmit"
                >回复</t-button
              >
            </div>
          </template>
        </t-comment>
        <!-- 评论列表 -->
        <t-list v-if="select_item === 'comment'" :header="`${comments.length} 条评论`" :split="true">
          <t-list-item v-for="item in comments" :key="item.comment_id">
            <t-comment
              :author="user_map[item.account_id]?.nick_name"
              :avatar="getResourceUrl(user_map[item.account_id]?.avatar)"
              :content="item.content"
              :datetime="timestampFormat(getEntityTime(item))"
            />
          </t-list-item>
        </t-list>
      </template>
    </t-card>
  </t-watermark>
  <FeedbackDialog ref="feedbackDialogRef" />
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

/* 微博分享链接：继承按钮文字颜色、去掉默认下划线，保持按钮外观一致 */
.share-weibo {
  color: inherit;
  text-decoration: none;
}
</style>
