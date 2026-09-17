<!--
  文件：ArticleEditor.vue
  用途：wangEditor 富文本编辑器封装（仅「发布长文」页使用）

  为什么单独拆成一个组件：
    wangEditor 本体 + Vue 封装 + 编辑器样式，压缩后约 787KB，占 /articles/ 路由体积的绝大部分。
    把它收进独立组件之后，ArticlePage 就能把这一整块放到「异步边界」之后加载：
    页面框架（Header、可见范围下拉、发布按钮）先渲染出来，编辑器加载完成后替换骨架占位。
    这样首屏不再被一个 787KB 的 chunk 阻塞，慢网下尤其明显。

  对外接口：
    props   modelValue（正文 HTML，v-model） / accessToken（图片上传鉴权头） / draftText（草稿回填）
    emits   update:modelValue / ready（编辑器创建完成）
    expose  getText()（发布前判空） / clear()（发布成功后清空）
-->
<script setup lang="ts">
import {computed, onBeforeUnmount, shallowRef} from 'vue';
import {MessagePlugin} from 'tdesign-vue-next';
import axios from 'axios';
import '@wangeditor/editor/dist/css/style.css'; // 编辑器样式：随本组件异步加载，不再阻塞文章页首屏
import {Editor, Toolbar} from '@wangeditor/editor-for-vue';
import {apiUrls} from '@/services/api.ts';
import {logger} from '@/common/utils.ts';

const props = defineProps<{
  /** 正文 HTML（v-model） */
  modelValue: string;
  /** 图片上传要带的 Authorization 头 */
  accessToken: string;
  /** 未发布完的草稿文本，编辑器创建后自动回填 */
  draftText?: string;
}>();

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
  (event: 'ready'): void;
}>();

/** 正文的双向绑定：本地不另存一份，直接透传给父组件 */
const content = computed<string>({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
});

/**
 * 编辑器实例，必须用 shallowRef：
 * 编辑器实例内部结构很深，用 ref 会被 Vue 递归代理，输入时性能会明显下降。
 */
const editorRef = shallowRef<Editor>();
const mode = 'default';
const toolbarConfig = {};
const editorConfig = {
  placeholder: '静静的留下你此刻的思路...',
  maxLength: 12800, // 正文最大字符数（约 12800 字）
  MENU_CONF: {
    // 上传图片配置
    uploadImage: {
      // 1. 上传地址
      server: apiUrls.upload_image_url(),

      // 2. 上传时携带的请求头（如 token）
      headers: {
        Authorization: props.accessToken,
      },

      // 3. 上传额外参数
      params: {
        type: 'editor',
      },

      // 4. 图片大小限制
      maxSize: 5 * 1024 * 1024, // 5M

      // 5. 上传成功后，后端返回格式必须如下：
      // { errno: 0, data: { url: 'https://xxx.png' } }
      // 如果后端格式不一样，用 customUpload 自己处理

      // 6. 自定义上传（最常用，完全自己控制）
      customUpload: async (file: any, insertFn: any) => {
        const formData = new FormData();
        formData.append('file', file);

        try {
          const res = await axios.post(apiUrls.upload_image_url(), formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: props.accessToken,
            },
          });

          // 后端实际返回结构待确认：此处取 res.data.image_url，
          // 与上方 wangEditor 约定的 { errno, data:{url} } 不一致（口径待确认）
          const url = res.data.url;
          const cdn_url = apiUrls.static_links(url);
          // 插入图片到编辑器
          insertFn(cdn_url);
        } catch (err) {
          console.error('上传失败', err);
        }
      },
    },
    // 上传视频
    uploadVideo: {
      // 置空上传地址，阻断本地文件上传逻辑
      server: '',
      // 拦截所有本地文件上传
      customUpload(file: any) {
        logger.info(file.name);
        MessagePlugin.warning('暂不支持上传本地视频，请粘贴视频链接');
        return Promise.reject();
      },
    },
  },
};

/**
 * 编辑器创建完成：回填草稿文本，并通知父组件「可以发布了」
 * @param editor wangEditor 实例
 */
const handleCreated = (editor: Editor) => {
  editorRef.value = editor;

  const draftText = props.draftText;
  if (draftText) {
    // 文本内容自动填充
    content.value = draftText;
    // TODO: 草稿中的图片尚未自动还原到编辑器（目前仅恢复文本）
  }

  emit('ready');
};

// 组件销毁时，也及时销毁编辑器
onBeforeUnmount(() => {
  editorRef.value?.destroy();
});

defineExpose({
  /** 取编辑器内容的纯文本（发布前判空用） */
  getText: () => editorRef.value?.getText() ?? '',
  /** 清空正文（发布成功后调用） */
  clear: () => editorRef.value?.clear(),
});
</script>

<template>
  <Toolbar style="border-bottom: 1px solid #ccc" :editor="editorRef" :defaultConfig="toolbarConfig" :mode="mode" />
  <Editor
    style="height: 500px; overflow-y: hidden"
    v-model="content"
    :defaultConfig="editorConfig"
    :mode="mode"
    @onCreated="handleCreated"
  />
</template>

<style scoped></style>
