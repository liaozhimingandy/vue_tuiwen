<script setup lang="ts">
import {watch, onBeforeUnmount, ref, shallowRef} from "vue";
import {SendIcon, ChevronDownIcon} from 'tdesign-icons-vue-next';
import {MessagePlugin} from 'tdesign-vue-next';
import {storeToRefs} from "pinia";
import appStore from "@/stores";
import type { DropdownProps } from 'tdesign-vue-next';
import '@wangeditor/editor/dist/css/style.css' // 引入 css
import {Editor, Toolbar} from '@wangeditor/editor-for-vue'
import Header from "@/components/Header.vue";
import type {IPost} from "@/interface";
import {post_right_map} from "@/common/constants.js";
import axios from "axios";
import {apiUrls, publish_post} from "@/services/api.ts";
import {logger} from "@/common/utils.ts";

const submitting = ref(false);
const draftStore = storeToRefs(appStore.useDraftStore);
const selected_status = ref<number>(1);
// 组装下拉选项
const dropdownOptions : DropdownProps['options'] = Object.entries(post_right_map).map(([value, content]) => ({
    value,
    content,
  })) as DropdownProps['options'];
// 下拉菜单点击
const handleMenuClick: DropdownProps['onClick'] = (data: any) => {
  logger.info(data)
  selected_status.value = data.value as number;
};

// 设置图片上传的接口地址
const access_token = 'Bearer ' + appStore.useAccountStore.token.access_token;
const mode = 'default';
// 编辑器实例，必须用 shallowRef
const editorRef = shallowRef()
// 内容 HTML
const content = ref('')
const toolbarConfig = {}
const editorConfig = {
  placeholder: '静静的留下你此刻的思路...',
  maxLength: 12800,
  MENU_CONF: {
    // 上传图片配置
    uploadImage: {
      // 1. 上传地址
      server: apiUrls.upload_image_url(),

      // 2. 上传时携带的请求头（如 token）
      headers: {
        Authorization: access_token
      },

      // 3. 上传额外参数
      params: {
        type: 'editor'
      },

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
          const url = res.data.image_url
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
const onPublish = async () => {

  if (editorRef.value.getText().trim() == '') {
    await MessagePlugin.info("内容不能为空!");
    return
  }
  submitting.value = true;

  let post: IPost = {
    post_id: crypto.randomUUID(),
    account_id: appStore.useAccountStore.account.account_id,
    right_status: Number(selected_status.value),
    content: {"text": content.value, "images": []},
    post_type: 2,
    from_device: 9,
    status: 1
  }

  // 调发布接口
  await publish_post(post);

  submitting.value = false;
  await MessagePlugin.success("发布成功!");
  editorRef.value.clear();
  appStore.useDraftStore.clearDraft();
}



</script>

<template>
  <t-layout style="min-height: 100vh;">
    <t-header ref="headerRef" :style="{width: '100vw','background-color': 'white'}">
      <Header selected-keys="none"/>
    </t-header>
    <t-content :style="{ padding: '0 50px', marginTop: '4px' }">
      <Toolbar
          style="border-bottom: 1px solid #ccc"
          :editor="editorRef"
          :defaultConfig="toolbarConfig"
          :mode="mode"
      />
      <Editor
          style="height: 500px; overflow-y: hidden;"
          v-model="content"
          :defaultConfig="editorConfig"
          :mode="mode"
          @onCreated="handleCreated"
      />
    </t-content>
    <t-footer>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span/>
        <t-space direction="horizontal">
          <t-button @click="onPublish" :loading="submitting">
            <template #icon>
              <send-icon v-if="!submitting" :fill-color='["transparent","transparent"]' :stroke-color='["currentColor","currentColor"]'
                         :stroke-width="2.5"/>
            </template>
            发布
          </t-button>
          <t-dropdown :options="dropdownOptions" @click="handleMenuClick">
            <t-button variant="text">
              {{ post_right_map[selected_status] }}
              <template #suffix>
                <ChevronDownIcon size="14"/>
              </template>
            </t-button>
          </t-dropdown>
        </t-space>
      </div>
    </t-footer>
  </t-layout>
</template>

<style scoped>

</style>