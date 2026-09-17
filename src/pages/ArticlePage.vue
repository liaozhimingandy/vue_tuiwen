<!--
  文件：ArticlePage.vue
  用途：发布长文（类 Twitter 长推文）
  路由：/articles/（发长文）
  数据来源：正文经 publish_post 接口发布；图片走 upload_image_url 上传（上传逻辑在 ArticleEditor 内）
  主要交互：
    1. 顶部下拉切换可见范围（post_right_map）
    2. 中部富文本编辑器编写正文（支持图片，本地视频暂不支持）
    3. 底部「发布」提交；正文实时写入草稿 store，刷新不丢失

  性能说明（重要）：
    wangEditor 及其样式压缩后约 787KB，是本站最大的单个依赖。因此本页**不直接 import 编辑器**，
    而是通过下面的异步组件加载（实现在 components/ArticleEditor.vue，那里有详细说明）。
    效果：本页自身的 chunk 从约 787KB 降到几十 KB，页面框架（Header、下拉、发布按钮）先渲染，
    编辑器加载完成后替换骨架占位——首屏不再被编辑器阻塞。
-->
<script setup lang="ts">
import {defineAsyncComponent, ref, watch} from 'vue';
import {SendIcon, ChevronDownIcon} from 'tdesign-icons-vue-next';
import {MessagePlugin} from 'tdesign-vue-next';
import {storeToRefs} from 'pinia';
import appStore from '@/stores';
import type {DropdownProps} from 'tdesign-vue-next';
import Header from '@/components/Header.vue';
import EditorSkeleton from '@/components/EditorSkeleton.vue';
import type {IPost} from '@/interface';
import {post_right_map} from '@/common/constants.js';
import {publish_post} from '@/services/api.ts';
import {logger} from '@/common/utils.ts';

/**
 * 富文本编辑器：异步加载，把 787KB 的 wangEditor 移出本页首屏阻塞。
 * - loadingComponent 让骨架一直顶到编辑器就绪，中间不会留白；
 * - delay: 50 是「防闪」：chunk 命中缓存时（50ms 内加载完）直接渲染编辑器，不闪骨架。
 *
 * 注意不要改成静态 import —— 那样编辑器会重新被打进本页 chunk，
 * 首屏又得等它整个下载完（可用 npm run analyze:bundle 对比 ArticlePage 的体积）。
 */
const ArticleEditor = defineAsyncComponent({
  loader: () => import('@/components/ArticleEditor.vue'),
  loadingComponent: EditorSkeleton,
  delay: 50,
});

/** 编辑器是否创建完成：未完成时不允许发布，避免读到空内容 */
const editorReady = ref(false);
/** 编辑器组件实例（用于取纯文本 / 清空） */
const editorComp = ref<{getText(): string; clear(): void} | null>(null);

const submitting = ref(false);
const draftStore = storeToRefs(appStore.useDraftStore);
/** 进页面时如果还有草稿，交给编辑器在创建后回填（仅文本） */
const draftText = draftStore.post_draft.value?.text ?? '';
const selected_status = ref<number>(1);
// 组装下拉选项
const dropdownOptions: DropdownProps['options'] = Object.entries(post_right_map).map(([value, content]) => ({
  value,
  content,
})) as DropdownProps['options'];
/**
 * 下拉菜单点击：用户选择可见范围后，更新 selected_status
 * @param data 下拉项数据，data.value 为权限状态码
 */
const handleMenuClick: DropdownProps['onClick'] = (data: any) => {
  logger.info(data);
  selected_status.value = data.value as number;
};

// 图片上传要用的鉴权头，交给 ArticleEditor
const access_token = 'Bearer ' + appStore.useAccountStore.token.access_token;
// 正文 HTML
const content = ref('');

watch(
  content,
  () => {
    if (!content.value.trim()) return;

    // 显式构造草稿对象：这样即使此前没有草稿，也能生成一个字段完整的合法草稿，
    // 同时保留已存在的图片列表与创建时间（createTime 用于过期校验）。
    const draft = draftStore.post_draft.value;
    draftStore.post_draft.value = {
      text: content.value.trim(),
      images: draft?.images ?? [],
      createTime: draft?.createTime ?? Date.now(),
    };
  },
  {deep: true},
);

<<<<<<< HEAD
/**
 * 发布长文：校验非空后调用 publish_post 接口，并清理本地草稿
 */
=======
      // 4. 图片大小限制
      maxSize: 5 * 1024 * 1024, // 5M

      // 5. 上传成功后，后端返回格式必须如下：
      // { errno: 0, data: { url: 'https://xxx.png' } }
      // 如果后端格式不一样，用 customUpload 自己处理

      // 6. 自定义上传（最常用，完全自己控制）
      customUpload: async (file: any, insertFn: any) => {
        const formData = new FormData()
        formData.append('file', file)

        try {
          const res = await axios.post(apiUrls.upload_image_url(), formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: access_token
            }
          })

          // 假设后端返回 { code:0, data: { url } }
          const url = res.data.url
          // 插入图片到编辑器
          insertFn(url)
        } catch (err) {
          console.error('上传失败', err)
        }
      }
    },
    // 上传视频
    uploadVideo: {
      // 置空上传地址，阻断本地文件上传逻辑
      server: '',
      // 拦截所有本地文件上传
      customUpload(file: any) {
        logger.info(file.name)
        MessagePlugin.warning('暂不支持上传本地视频，请粘贴视频链接')
        return Promise.reject()
      }
    },
  }

}

// 组件销毁时，也及时销毁编辑器
onBeforeUnmount(() => {
  const editor = editorRef.value
  if (editor == null) return
  editor.destroy()
})

const handleCreated = (editor: Editor) => {
  editorRef.value = editor;

  const draft = draftStore.post_draft.value;
  if (draft) {
    // 文本内容自动填充
    content.value = draft.text;
    // 草稿里的图片自动插入到编辑器

  }
}

watch(content, () => {
  if (content.value.trim()) {
    let tmp_draft = draftStore.post_draft.value;
    draftStore.post_draft.value = {...tmp_draft, text: content.value.trim()}
  }
}, {deep: true})

// 处理发布博客
>>>>>>> 59059d1206c365f1480f54f5a9dae1805901bc58
const onPublish = async () => {
  const editor = editorComp.value;
  // 骨架阶段就点发布：编辑器还没创建，此时读不到内容，给出提示而不是静默失败
  if (!editor || !editorReady.value) {
    await MessagePlugin.info('编辑器还在加载，请稍候');
    return;
  }

  // 仅取纯文本判断是否为空（排除空白字符）
  if (editor.getText().trim() == '') {
    await MessagePlugin.info('内容不能为空!');
    return;
  }
  submitting.value = true; // 防止重复提交

  let post: IPost = {
    post_id: crypto.randomUUID(), // 前端生成唯一 ID
    account_id: appStore.useAccountStore.account.account_id,
    right_status: Number(selected_status.value), // 可见范围状态码
    content: {text: content.value, images: []}, // 长文正文（图片列表暂为空，待编辑器图片回填）
    post_type: 2, // 2 表示长文类型（口径待确认）
    from_device: 9, // 设备来源标识（口径待确认）
    status: 1, // 1 表示正常发布状态
  };

  // 调发布接口
  await publish_post(post);

  submitting.value = false;
  await MessagePlugin.success('发布成功!');
  editor.clear(); // 清空编辑器
  appStore.useDraftStore.clearDraft(); // 清除草稿
};
</script>

<template>
  <t-layout style="min-height: 100vh">
    <t-header :style="{width: '100vw', 'background-color': 'white'}">
      <Header selected-keys="none" />
    </t-header>
    <t-content style="margin-top: 2px">
      <t-row justify="center">
        <t-col :md="{offset: 0, span: 6}" :xs="12" :sm="12">
          <!-- 编辑器就绪前的骨架由 ArticleEditor 的 loadingComponent 负责，这里不用再写 v-if -->
          <ArticleEditor
            ref="editorComp"
            v-model="content"
            :access-token="access_token"
            :draft-text="draftText"
            @ready="editorReady = true"
          />
        </t-col>
      </t-row>
    </t-content>
    <t-footer>
      <div style="display: flex; justify-content: space-between; align-items: center">
        <span />
        <t-space direction="horizontal">
          <t-button @click="onPublish" :loading="submitting">
            <template #icon>
              <send-icon
                v-if="!submitting"
                :fill-color="['transparent', 'transparent']"
                :stroke-color="['currentColor', 'currentColor']"
                :stroke-width="2.5"
              />
            </template>
            发布
          </t-button>
          <t-dropdown :options="dropdownOptions" @click="handleMenuClick">
            <t-button variant="text">
              {{ post_right_map[selected_status] }}
              <template #suffix>
                <ChevronDownIcon size="14" />
              </template>
            </t-button>
          </t-dropdown>
        </t-space>
      </div>
    </t-footer>
  </t-layout>
</template>

<style scoped></style>
