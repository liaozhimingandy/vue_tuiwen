<!--
  NewPost.vue — 发帖组件（含草稿自动保存）
  用途：首页/详情页统一的「写推文」入口，支持文本、图片上传、表情插入、可见范围选择，并自动存草稿。
  职责边界：负责本地草稿的写入与恢复、调 publish_post 发布；不负责后端鉴权与帖子列表渲染。
  使用场景：被首页等页面引入；折叠态为卡片内联输入框，展开态为「发贴」对话框。
  注意：
    - 草稿通过 Pinia draftStore 持久化，输入停顿 800ms 后写入（防抖）。
    - 表情插入依赖 lastCursorPos 记录的光标位置（聚焦/失焦时由 saveCursor 更新）。
    - 可见范围下拉选项来自 @/common/constants 的 post_right_map（selected_status 即 right_status）。
-->
<script setup lang="ts">
import {onMounted, ref, watch} from 'vue';
import {ChevronDownIcon, ImageAddIcon, SmileIcon} from 'tdesign-icons-vue-next';
import type {DropdownProps, UploadProps, CheckboxProps} from 'tdesign-vue-next';
import {MessagePlugin} from 'tdesign-vue-next';

import type {IPost} from '@/interface';
import appStore from '@/stores/';
import {storeToRefs} from 'pinia';
<<<<<<< HEAD
import {post_right_map} from '@/common/constants.js';
import {apiUrls, publish_post} from '@/services/api.ts';
import {trimEmptyParagraph} from '@/common/utils.ts';
import FacePicker from '@/components/FacePicker.vue';
import UserAvatar from '@/components/UserAvatar.vue';
=======
import {post_right_map} from "@/common/constants.js";
import {apiUrls, publish_post} from "@/services/api.ts";
import {trimEmptyParagraph} from "@/common/utils.ts";
import FacePicker from "@/components/FacePicker.vue";
import UserAvatar from "@/components/UserAvatar.vue";
>>>>>>> 59059d1206c365f1480f54f5a9dae1805901bc58

const draftStore = storeToRefs(appStore.useDraftStore);
const content = ref(''); // 内容
const fileList = ref<UploadProps['value']>([]); // 上传图片列表
const is_open_upload_image = ref<boolean>(false); //是否打开上传图片的弹窗
const is_open = ref<boolean>(false); //输入框是否打开
const selected_status = ref(1); // 选中的状态，默认 "public"
const showFacePanel = ref(false);
const lastCursorPos = ref(0); // 缓存最后一次光标位置
// 文件名缩写规则：[保留前6字符, 保留后6字符]，中间超长部分省略
const abridgeName: UploadProps['abridgeName'] = [6, 6];
const disabled = ref(false);
const autoUpload = ref(true);
const showUploadButton = ref<CheckboxProps['value']>(true);
const sizeLimit = ref<UploadProps['sizeLimit']>({
  size: 10240,
  unit: 'KB',
});
const submitting = ref(false);

// 处理菜单点击事件
const handleMenuClick: DropdownProps['onClick'] = (data) => {
  // TDesign 的 value 类型较宽（string | number | object），这里统一收敛为 number 状态码
  const value = (data as {value?: string | number} | undefined)?.value;
  if (value !== undefined) {
    selected_status.value = Number(value);
  }
};

// 组装下拉选项
const dropdownOptions: DropdownProps['options'] = Object.entries(post_right_map).map(([value, content]) => ({
  value,
  content,
})) as DropdownProps['options'];

// 处理发布博客
const handlePublish = () => {
  submitting.value = true;
<<<<<<< HEAD
  // 判断是否有图片上传（fileList.value 在清空后可能为 undefined，做兜底）
  const images = (fileList.value ?? []).map((file?) => (file as any).response?.image_url).filter(Boolean) as string[];
=======
  // 判断是否有图片上传
  const images = fileList.value
      .map((file?) => (file as any).response?.rawUrl as string | undefined)
      .filter(Boolean) as string[]
>>>>>>> 59059d1206c365f1480f54f5a9dae1805901bc58

  let post: IPost = {
    post_id: crypto.randomUUID(),
    account_id: appStore.useAccountStore.account.account_id,
    right_status: Number(selected_status.value),
    content: {text: content.value, images: images},
    post_type: 1,
    from_device: 9,
    status: 1,
  };

  // 调发布接口
  publish_post(post);

  is_open.value = false;
  content.value = '';
  fileList.value = [];
  submitting.value = false;
  MessagePlugin.success('发布成功');
  appStore.useDraftStore.clearDraft();
};

onMounted(() => {
  if (draftStore.post_draft.value) {
    const rawText = draftStore.post_draft.value.text;
    content.value = trimEmptyParagraph(rawText);
  }
});

<<<<<<< HEAD
watch(
  [content, fileList],
  () => {
    window.setTimeout(() => {
      // 空内容直接清空草稿
      if (!content.value.trim()) {
        appStore.useDraftStore.clearDraft();
        return;
      }
      // 提取已上传的图片链接（fileList.value 可能为 undefined，做兜底）
      const images = (fileList.value ?? []).map((el: any) => el.response?.image_url).filter(Boolean) as string[];
      // 更新草稿，插件会自动同步到本地存储
      draftStore.post_draft.value = {
        text: content.value,
        images,
        createTime: draftStore.post_draft.value?.createTime ?? Date.now(),
      };
    }, 800); // 800ms防抖，输入停顿才保存
  },
  {deep: true},
);
=======

watch([content, fileList], () => {
      window.setTimeout(() => {
        // 空内容直接清空草稿
        if (!content.value.trim()) {
          appStore.useDraftStore.clearDraft();
          return
        }
        // 提取已上传的图片链接
        const images = fileList.value
            .map((el: any) => el.response?.rawUrl as string | undefined)
            .filter(Boolean)
        // 更新草稿，插件会自动同步到本地存储
        draftStore.post_draft.value = {text: content.value, images};

      }, 800) // 800ms防抖，输入停顿才保存
    },
    {deep: true}
)
>>>>>>> 59059d1206c365f1480f54f5a9dae1805901bc58

// 保存光标位置
const saveCursor = () => {
  const comp = inputRef.value;
  if (!comp) return;
  const ta = comp.$el.querySelector('textarea') as HTMLTextAreaElement;
  lastCursorPos.value = ta.selectionStart;
};

const inputRef = ref();
const onSelectFace = (face: string) => {
  // 如果从未聚焦过，默认插到文本末尾
  const start = lastCursorPos.value < 0 ? content.value.length : lastCursorPos.value;

  // 1. 先更新响应式数据，由 v-model 同步 DOM
  content.value = content.value.slice(0, start) + face + content.value.slice(start);
  showFacePanel.value = false;
};

const handleFail: UploadProps['onFail'] = ({file}) => {
  MessagePlugin.error(`文件 ${file.name} 上传失败`);
};
<<<<<<< HEAD
=======

const formatUploadResp = (resp: any) => {
  const relativeUrl = resp.url // 后端返回的纯相对路径 /static/xxx
  return {
    url: apiUrls.static_links(relativeUrl), // 给t-upload预览用，开发环境带域名
    rawUrl: relativeUrl // 保存原始相对路径，用于发布帖子存入数据库
  }
}
>>>>>>> 59059d1206c365f1480f54f5a9dae1805901bc58
</script>

<template>
  <div id="newPost">
    <t-card style="width: 100%; margin-bottom: 20px; border-radius: 8px">
      <!-- 第一段：用户头像 + 输入框 -->
      <div style="display: flex; align-items: center; margin-bottom: 16px">
        <!-- 用户头像 -->
        <UserAvatar
          :avatar="appStore.useAccountStore.account?.avatar"
          :nickname="appStore.useAccountStore.account?.nick_name"
        />
        <!-- 输入框 -->
        <t-input
          v-model:value="content"
          style="margin-left: 12px; flex-grow: 1"
          placeholder="请输入博客内容..."
          rows="6"
          type="text"
          show-limit-number
          @click="is_open = !is_open"
        />
      </div>
      <!-- 第二段：上传图片按钮 + 发布按钮 -->
      <div style="display: flex; justify-content: space-between; align-items: center">
        <t-space size="small">
          <!-- 上传图片按钮 -->
          <t-tooltip content="上传图片">
            <t-button variant="text" @click="() => (is_open = !is_open)">
              <template #icon>
                <image-add-icon
                  :fill-color="['transparent', 'transparent']"
                  :stroke-color="['currentColor', 'currentColor']"
                  :stroke-width="2.5"
                />
              </template>
            </t-button>
          </t-tooltip>
          <!-- 表情弹窗 -->
          <t-popup showArrow>
            <template #content>
              <FacePicker @select="onSelectFace" />
            </template>
            <t-tooltip content="表情包">
              <t-button variant="text">
                <template #icon>
                  <smile-icon
                    :fill-color="['transparent', 'transparent']"
                    :stroke-color="['currentColor', 'currentColor']"
                    :stroke-width="2.5"
                  />
                </template>
              </t-button>
            </t-tooltip>
          </t-popup>
        </t-space>
        <!-- 发布按钮 -->
        <t-button theme="primary" @click="handlePublish" :disabled="!content.trim()" :loading="submitting"
          >发布
        </t-button>
      </div>
    </t-card>
  </div>
  <t-dialog v-model:visible="is_open" header="发贴" :footer="null">
    <template #body>
      <t-space direction="vertical" style="width: 100%">
        <!-- 用户头像 -->
        <div style="display: flex; align-items: center; gap: 16px">
          <UserAvatar
            :avatar="appStore.useAccountStore.account?.avatar"
            :nickname="appStore.useAccountStore.account?.nick_name"
          />
          <t-dropdown :options="dropdownOptions" @click="handleMenuClick">
            <t-button variant="text">
              {{ post_right_map[selected_status] }}
              <template #suffix>
                <ChevronDownIcon size="14px" />
              </template>
            </t-button>
          </t-dropdown>
          <router-link :to="{name: 'article'}" target="_blank">
            <t-link>发长文</t-link>
          </router-link>
        </div>
        <!-- 输入框 -->
        <t-textarea
          ref="inputRef"
          placeholder="分享一下你的生活趣事"
          v-model:value="content"
          :maxcharacter="256"
          :autosize="{minRows: 3, maxRows: 5}"
          @focus="saveCursor"
          @blur="saveCursor"
        />
      </t-space>
      <t-divider />
      <!--          图片上传功能 TDesign t-upload -->
      <t-upload
<<<<<<< HEAD
        ref="uploadRef3"
        :allow-upload-duplicate-file="true"
        v-model="fileList"
        :action="apiUrls.upload_image_url()"
        theme="image"
        tips="最多只能上传9张图片"
        v-show="is_open_upload_image"
        accept="image/*"
        :size-limit="sizeLimit"
        :abridge-name="abridgeName"
        :disabled="disabled"
        :auto-upload="autoUpload"
        :headers="{Authorization: `Bearer ${appStore.useAccountStore.token.access_token}`}"
        :upload-button="showUploadButton ? undefined : null"
        :cancel-upload-button="showUploadButton ? {theme: 'default', content: '取消上传'} : null"
        multiple
        :max="9"
        @fail="handleFail"
=======
          ref="uploadRef3"
          :allow-upload-duplicate-file="true"
          v-model="fileList"
          :action="apiUrls.upload_image_url()"
          theme="image"
          tips="最多只能上传9张图片"
          v-show="is_open_upload_image"
          accept="image/*"
          :size-limit="sizeLimit"
          :abridge-name="abridgeName"
          :disabled="disabled"
          :auto-upload="autoUpload"
          :headers="{'Authorization': `Bearer ${appStore.useAccountStore.token.access_token}`}"
          :upload-button="showUploadButton ? undefined : null"
          :cancel-upload-button="showUploadButton ? { theme: 'default', content: '取消上传' } : null"
          multiple
          :max="9"
          :format-response="formatUploadResp"
          @fail="handleFail"
>>>>>>> 59059d1206c365f1480f54f5a9dae1805901bc58
      >
      </t-upload>
      <t-divider v-if="is_open_upload_image" />
      <!-- 第二段：上传图片按钮 + 发布按钮 -->
      <div style="display: flex; justify-content: space-between; align-items: center">
        <t-space size="small">
          <!-- 上传图片按钮 -->
          <t-tooltip content="上传图片">
            <t-button variant="text" @click="() => (is_open_upload_image = !is_open_upload_image)">
              <template #icon>
                <image-add-icon
                  :fill-color="['transparent', 'transparent']"
                  :stroke-color="['currentColor', 'currentColor']"
                  :stroke-width="2.5"
                />
              </template>
            </t-button>
          </t-tooltip>
          <!-- 表情弹窗 -->
          <t-popup showArrow>
            <template #content>
              <FacePicker @select="onSelectFace" />
            </template>
            <t-tooltip content="表情包">
              <t-button variant="text">
                <template #icon>
                  <smile-icon
                    :fill-color="['transparent', 'transparent']"
                    :stroke-color="['currentColor', 'currentColor']"
                    :stroke-width="2.5"
                  />
                </template>
              </t-button>
            </t-tooltip>
          </t-popup>
        </t-space>
        <!-- 发布按钮 -->
        <t-button
          theme="primary"
          @click="handlePublish"
          :disabled="!content.trim()"
          @mousedown.prevent="showFacePanel = true"
        >
          发布
        </t-button>
      </div>
    </template>
  </t-dialog>
</template>

<style scoped></style>
