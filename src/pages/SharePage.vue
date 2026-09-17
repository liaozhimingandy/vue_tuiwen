<script setup lang="ts">
import {useRoute} from 'vue-router';
import {computed, onMounted, ref, watch} from 'vue';
import type {IPost, IAccount} from '@/interface';
import instance from '@/services';
import {apiUrls} from '@/services/api.ts';
import {timestampFormat} from '@/common/utils.ts';
import {MessagePlugin} from 'tdesign-vue-next';
import UserAvatar from '@/components/UserAvatar.vue';
import {copyLink, getClampPreviewHtml, getEntityTime} from '../common/utils.ts';
import {config} from '../common/config.ts';
import {LinkIcon} from 'tdesign-icons-vue-next';
import ImageGallery from '../components/ImageGallery/ImageGallery.vue';
import RichTextCollapse from '../components/RichTextCollapse.vue';

const route = useRoute();
const post_id = computed(() => route.params.post_id as string);

const post = ref<IPost | null>(null);
const account = ref<IAccount | null>(null);
const loading = ref(true);

async function loadPostDetail() {
  if (!post_id.value) return;
  try {
    loading.value = true;
    post.value = null;
    account.value = null;

    const resPost = await instance.get(apiUrls.get_s_post(post_id.value));
    post.value = resPost.data as IPost;

    if (post.value?.account_id) {
      const resAccount = await instance.get(apiUrls.get_account(post.value.account_id));
      account.value = resAccount.data as IAccount;
    }
  } catch (err) {
    await MessagePlugin.error('帖子加载失败，请稍后重试');
  } finally {
    loading.value = false;
  }
}

onMounted(() => loadPostDetail());
watch(post_id, () => loadPostDetail());
</script>

<template>
  <t-layout class="post-detail-layout" style="min-height: 65vh">
    <t-content>
      <!-- Loading骨架屏，使用t-row/t-col居中 -->
      <t-row v-if="loading" justify="center">
        <t-col :md="5" :xs="11" :sm="12">
          <t-skeleton theme="avatar-text" />
          <t-skeleton theme="article" />
        </t-col>
      </t-row>

      <!-- 帖子不存在 -->
      <t-row v-else-if="!post" justify="center">
        <t-col :md="6" :xs="11" :sm="12">
          <t-empty description="帖子不存在或已删除!" />
        </t-col>
      </t-row>

      <template v-else>
        <!-- 作者头部信息 -->
        <t-row justify="center">
          <t-col :md="{offset: 0, span: 6}" :xs="11" :sm="11" class="article-header">
            <t-space size="small">
              <UserAvatar :avatar="account?.avatar" :nickname="account?.nick_name" />
              <t-space direction="vertical" :size="1">
                <t-typography-text strong>{{ account?.nick_name || post.account_id }}</t-typography-text>
                <t-typography-text theme="secondary">{{ timestampFormat(getEntityTime(post)) }}</t-typography-text>
              </t-space>
            </t-space>
          </t-col>
        </t-row>

        <!-- 文章主体内容 -->
        <t-row justify="center">
          <t-col :md="{offset: 0, span: 6}" :xs="11" :sm="11">
            <div class="article-body">
              <!-- 富文本文章 post_type=2 -->
              <!--              <div-->
              <!--                  v-if="post.post_type === 2"-->
              <!--                  v-html="html"-->
              <!--                  class="rich-article"-->
              <!--              />-->
              <!-- 普通文本帖子 post_type=1 -->
              <!--              <div v-if="post.post_type === 1" class="plain-article">-->
              <!--                {{ post?.content?.text }}-->
              <!--              </div>-->
              <RichTextCollapse mode="full" :content="getClampPreviewHtml(post?.content?.text, config.CDN_BASE_URL)" />
              <!-- 九宫格图片 -->
              <!--              <NineImageGrid-->
              <!--                  v-if="post?.post_type === 1 && post?.content?.images?.length"-->
              <!--                  :image-list="post.content.images"-->
              <!--                  :single-max-width="100"-->
              <!--                  :two-col-max-width="100"-->
              <!--                  :three-col-max-width="100"-->
              <!--              />-->

              <ImageGallery :image-list="post.content.images" />
            </div>
          </t-col>
        </t-row>
      </template>
    </t-content>

    <!-- t-layout原生 t-footer -->
    <t-footer v-if="!loading && post">
      <t-row justify="center">
        <t-col :md="{offset: 0, span: 6 }" :xs="12" :sm="12">
          <t-space class="article-footer">
            <t-typography-text theme="secondary">
              © {{ new Date().getFullYear() }}-{{ account?.nick_name }}
            </t-typography-text>
            <t-button
              theme="default"
              variant="text"
              @click="copyLink(`${apiUrls.share_post_link(post_id)}`, MessagePlugin)"
            >
              <template #icon><link-icon /></template>
              分享
            </t-button>
          </t-space>
        </t-col>
      </t-row>
    </t-footer>
  </t-layout>
</template>

<style scoped>
.post-detail-layout {
  padding: 24px 0;
  background-color: white;
}

/* 作者头部 */
.article-header {
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
  margin-bottom: 24px;
}

/* 文章主体，公众号阅读参数 */
.article-body {
  font-size: 17px;
  line-height: 1.75;
  color: #222;
  word-break: break-word;
}

.plain-article {
  white-space: pre-wrap;
}

/* t-footer 覆写样式 */
.article-footer {
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #eee;
  text-align: center;
  font-size: 13px;
  color: #999;
  display: flex;
  justify-content: space-between;
}

/* =========富文本自适应规则========= */
.rich-article {
  width: 100%;
  overflow-x: hidden;
}

.rich-article :deep(img),
.rich-article :deep(video),
.rich-article :deep(svg),
.rich-article :deep(canvas) {
  max-width: 100% !important;
  height: auto !important;
  display: block;
  border-radius: 8px;
  margin: 16px auto;
}

.rich-article :deep(iframe) {
  max-width: 100% !important;
  height: auto;
  display: block;
  margin: 16px 0;
}

.rich-article :deep(p) {
  margin: 1em 0;
}

.rich-article :deep(h1),
.rich-article :deep(h2),
.rich-article :deep(h3),
.rich-article :deep(h4) {
  margin: 1.2em 0 0.6em;
  font-weight: 600;
}

.rich-article :deep(li) {
  margin: 0.5em 0;
}

.rich-article :deep(pre) {
  max-width: 100%;
  overflow-x: auto;
  background: #f6f7f8;
  padding: 14px;
  border-radius: 6px;
  white-space: pre-wrap !important;
}

.rich-article :deep(code) {
  background: #f6f7f8;
  padding: 2px 6px;
  border-radius: 4px;
}

.rich-article :deep(table) {
  width: 100%;
  display: block;
  overflow-x: auto;
  border-collapse: collapse;
}

.rich-article :deep(th),
.rich-article :deep(td) {
  border: 1px solid #ddd;
  padding: 6px 10px;
}

.rich-article :deep(p),
.rich-article :deep(span),
.rich-article :deep(li),
.rich-article :deep(a) {
  word-break: break-word;
}

.rich-article :deep(*) {
  box-sizing: border-box !important;
}

/* 移动端响应式 */
@media (max-width: 768px) {
  .post-detail-layout {
    padding: 16px 0;
  }

  .article-body {
    font-size: 16px;
    line-height: 1.8;
  }

  .article-header {
    margin-bottom: 18px;
    padding-bottom: 16px;
  }

  .rich-article :deep(img) {
    margin: 12px auto;
  }
}
</style>
