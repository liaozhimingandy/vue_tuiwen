<script setup lang="ts">
import {onMounted, ref, watch, computed} from 'vue';
import type {IPost} from "@/interface";
import appStore from '@/stores/';
import {storeToRefs} from 'pinia';
import {post_right_map} from "@/common/constants.js";
import {apiUrls, publish_post} from "@/services/api.ts";
import {getResourceUrl, trimEmptyParagraph} from "@/common/utils.ts";
import FacePicker from "@/components/FacePicker.vue";
import {MessagePlugin} from "tdesign-vue-next";
import {ChevronDownIcon, ImageAddIcon, SmileIcon} from "tdesign-icons-vue-next";
import type { DropdownProps, UploadProps, ButtonProps} from 'tdesign-vue-next';

const draftStore = storeToRefs(appStore.useDraftStore);

// 内容
const content = ref("");
// 上传图片
const fileList = ref<File[]>([]);
const is_open_upload_image = ref<boolean>(false); //是否打开上传图片的弹窗
// 设置图片上传的接口地址
const is_open = ref<boolean>(false); //输入框是否打开


// 选中的状态，默认 "public"
const selected_status = ref(1);
// 处理菜单点击事件
const handleMenuClick : DropdownProps['onClick'] = (data) => {
  selected_status.value = data.value as number;
};
// 组装下拉选项
const dropdownOptions = computed<DropdownProps['options']>(() => {
  return Object.entries(post_right_map).map(([value, content]) => ({
    value,
    content,
  }));
});
// 处理发布博客
const handlePublish = () => {
  // 这里你可以把博客内容和上传的图片发送到后端
  // 如果图片上传成功,获取用户上传的图片链接信息
  // console.log(fileList.value[0].response);
  // let post: IPost = {
  //   account_id: "test",
  //   content: {content: content.value, content_type: 1},
  //   from_device: 1,
  //   post_id: "122465",
  //   right_status: selected_status.value,
  //   status: 1
  // };
  // 判断是否有图片上传
  const images = fileList.value
      .map((file) => (file as any).response?.image_url)
      .filter(Boolean) as string[]

  let post: IPost = {
    post_id: crypto.randomUUID(),
    account_id: appStore.useAccountStore.account.account_id,
    right_status: Number(selected_status.value),
    content: {"text": content.value, "images": images},
    post_type: 1,
    from_ip: "string",
    from_device: 9,
    status: 1
  }

  // 调发布接口
  publish_post(post);

  is_open.value = false;
  content.value = "";
  fileList.value = [];
  MessagePlugin.success("发布成功");
  appStore.useDraftStore.clearDraft();
};

onMounted(() => {
  if (draftStore.post_draft.value) {
    const rawText = draftStore.post_draft.value.text;
    content.value = trimEmptyParagraph(rawText);

  }
})


watch([content, fileList], () => {

      window.setTimeout(() => {
        // 空内容直接清空草稿
        if (!content.value.trim()) {
          appStore.useDraftStore.clearDraft();
          return
        }
        // 提取已上传的图片链接
        const images = fileList.value
            .map((el: any) => el.response?.image_url)
            .filter(Boolean)
        // 更新草稿，插件会自动同步到本地存储
        draftStore.post_draft.value = {text: content.value, images};

      }, 800) // 800ms防抖，输入停顿才保存
    },
    {deep: true}
)

const showFacePanel = ref(false);


// 缓存最后一次光标位置
const lastCursorPos = ref(0);

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
  const start = lastCursorPos.value < 0
    ? content.value.length
    : lastCursorPos.value;

  // 1. 先更新响应式数据，由 v-model 同步 DOM
  content.value = content.value.slice(0, start) + face + content.value.slice(start);

  showFacePanel.value = false;
}

const sizeLimit = ref<UploadProps['sizeLimit']>({
  size: 10240,
  unit: 'KB',
});
const abridgeName: UploadProps['abridgeName'] = [6, 6];
const handleFail: UploadProps['onFail'] = ({ file }) => {
  MessagePlugin.error(`文件 ${file.name} 上传失败`);
};
const disabled = ref(false);
const uploadAllFilesInOneRequest = ref(false);
const autoUpload = ref(true);
const uploadFiles: ButtonProps['onClick'] = () => {
  // uploadRef1.value.uploadFiles();
  // uploadRef2.value.uploadFiles();
  // uploadRef3.value.uploadFiles();
};

</script>

<template>
  <div id="newPost">
    <t-card style="width: 100%; margin-bottom: 20px; border-radius: 8px;"
    >
      <!-- 第一段：用户头像 + 输入框 -->
      <div style="display: flex; align-items: center; margin-bottom: 16px;">
        <!-- 用户头像 -->
        <t-avatar :image="getResourceUrl(appStore.useAccountStore.account?.avatar)" size="large"/>
        <!-- 输入框 -->
        <t-input
            v-model:value="content"
            style="margin-left: 12px; flex-grow: 1;"
            placeholder="请输入博客内容..."
            rows="6"
            type="text"
            show-limit-number
            @click="is_open=!is_open"

        />
      </div>
      <!-- 第二段：上传图片按钮 + 发布按钮 -->
      <div style="display:flex;justify-content:space-between;align-items:center">
        <t-space size="small">
          <!-- 上传图片按钮 -->
          <t-tooltip content="上传图片">
            <t-button variant="text" @click="()=>is_open_upload_image=!is_open_upload_image">
              <template #icon>
                <image-add-icon :fill-color='["transparent","transparent"]' :stroke-color='["currentColor","currentColor"]' :stroke-width="2.5"/>
              </template>
            </t-button>
          </t-tooltip>
          <!-- 表情弹窗 -->
          <t-popup showArrow>
            <template #content>
              <FacePicker @select="onSelectFace"/>
            </template>
            <t-tooltip content="表情包">
              <t-button variant="text">
                <template #icon>
                  <smile-icon :fill-color='["transparent","transparent"]' :stroke-color='["currentColor","currentColor"]' :stroke-width="2.5"/>
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
        >发布</t-button>
      </div>
    </t-card>
  </div>
  <t-dialog
      v-model:visible="is_open"
      header="发贴"
      :footer="null"
  >
    <template #body>
    <t-space direction="vertical" style="width: 100%">
      <!-- 用户头像 -->
      <div style="display:flex; align-items:center; gap:16px;">
        <t-avatar :image="getResourceUrl(appStore.useAccountStore.account?.avatar)" size="large"/>
         <t-dropdown :options="dropdownOptions" @click="handleMenuClick">
            <t-button variant="text">
              {{ post_right_map[selected_status] }}
              <template #suffix>
                <ChevronDownIcon size="14px"/>
              </template>
            </t-button>
          </t-dropdown>
        <router-link
            :to="{ name: 'long' }"
            target="_blank"
        >
          <t-link>发长文</t-link>
        </router-link>
      </div>
      <!-- 输入框 -->
      <t-textarea ref="inputRef" placeholder="分享一下你的生活趣事" v-model:value="content"
                  :maxcharacter="256"
                  :autosize="{ minRows: 3, maxRows: 5 }"
                  @focus="saveCursor"
                  @blur="saveCursor"/>
    </t-space>
    <t-divider/>
      <!--          图片上传功能 TDesign t‑upload -->
   <t-upload
      ref="uploadRef3"
      v-model="fileList"
      :action="apiUrls.upload_image_url()"
      theme="image"
      tips="最多只能上传1张图片"
      v-show="is_open_upload_image"
      accept="image/*"
      :size-limit="sizeLimit"
      :abridge-name="abridgeName"
      :disabled="disabled"
      :auto-upload="autoUpload"
      :headers="{'Authorization': `Bearer ${appStore.useAccountStore.token.access_token}`}"
      :upload-all-files-in-one-request="uploadAllFilesInOneRequest"
      multiple
      :max="9"
      @fail="handleFail"
    >
   </t-upload>
    <t-divider v-if="is_open_upload_image"/>
    <!-- 第二段：上传图片按钮 + 发布按钮 -->
    <div style="display:flex;justify-content:space-between;align-items:center">
        <t-space size="small">
          <!-- 上传图片按钮 -->
          <t-tooltip content="上传图片">
            <t-button variant="text" @click="()=>is_open_upload_image=!is_open_upload_image">
              <template #icon>
                <image-add-icon :fill-color='["transparent","transparent"]' :stroke-color='["currentColor","currentColor"]' :stroke-width="2.5"/>
              </template>
            </t-button>
          </t-tooltip>
          <!-- 表情弹窗 -->
          <t-popup showArrow>
            <template #content>
              <FacePicker @select="onSelectFace"/>
            </template>
            <t-tooltip content="表情包">
              <t-button variant="text">
                <template #icon>
                  <smile-icon :fill-color='["transparent","transparent"]' :stroke-color='["currentColor","currentColor"]' :stroke-width="2.5"/>
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
            @mousedown.prevent="showFacePanel=true"
        >
          发布
        </t-button>
      </div>
      </template>
  </t-dialog>
</template>

<style scoped>

</style>