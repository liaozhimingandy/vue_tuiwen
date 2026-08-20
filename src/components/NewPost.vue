<script setup lang="ts">
import {onMounted, ref, watch} from 'vue';
import {DownOutlined, PlusOutlined, SmileOutlined} from "@ant-design/icons-vue";
import type {IPost} from "@/interface";
import appStore from '@/stores/';
import {storeToRefs} from 'pinia';
import {message} from "ant-design-vue";
import {AddPicture} from '@icon-park/vue-next';
import {post_right_map} from "@/common/constants.js";
import {apiUrls, publish_post} from "@/services/api.ts";
import {trimEmptyParagraph} from "@/common/utils.ts";
import FacePicker from "@/components/FacePicker.vue";

const draftStore = storeToRefs(appStore.useDraftStore);

// 内容
const content = ref("");
// 上传图片
const fileList = ref<File[]>([]);
const is_open_upload_image = ref<boolean>(false); //是否打开上传图片的弹窗
// 设置图片上传的接口地址
const is_open = ref<boolean>(false); //输入框是否打开

// 处理图片上传
const handleOpenChange = (open: boolean) => {
  is_open.value = open;
  if (!is_open_upload_image.value) {
    is_open_upload_image.value = true;
  }
};

const previewVisible = ref(false);
const previewImage = ref('');
const previewTitle = ref('');

const handleCancel = () => {
  previewVisible.value = false;
  previewTitle.value = '';
};

const handlePreview = async (file: any) => {
  if (!file.url && !file.preview) {
    // file.preview = (await getBase64(file.originFileObj)) as string;
    file.preview = 'https://xsgames.co/randomusers/avatar.php?g=male';
  }
  previewImage.value = file.url || file.preview;
  previewVisible.value = true;
  previewTitle.value = file.name || file.url.substring(file.url.lastIndexOf('/') + 1);
};

// 选中的状态，默认 "public"
const selected_status = ref(1);
// 处理菜单点击事件
const handleMenuClick = ({key}: { key: string }) => {
  selected_status.value = key;

};

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
  message.success("发布成功");
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


</script>

<template>
  <div id="newPost">
    <a-card :hoverable="true" style="width: 100%; margin-bottom: 20px; border-radius: 8px;"
    >
      <!-- 第一段：用户头像 + 输入框 -->
      <div style="display: flex; align-items: center; margin-bottom: 16px;">
        <!-- 用户头像 -->
        <a-avatar :src="appStore.useAccountStore.account?.avatar" size="large"/>
        <!-- 输入框 -->
        <a-input
            v-model:value="content"
            style="margin-left: 12px; flex-grow: 1;"
            placeholder="请输入博客内容..."
            rows="6"
            type="textarea"
            @click="is_open=!is_open"

        />
      </div>
      <!-- 第二段：上传图片按钮 + 发布按钮 -->
      <a-flex justify="space-between">
        <a-space>
          <!-- 上传图片按钮 -->
          <a-tooltip>
            <template #title>
              上传图片
            </template>
            <a-button type="text" @click="handleOpenChange(true)">
              <template #icon>
                <add-picture theme="outline" size="24" fill="#333"/>
              </template>
            </a-button>
          </a-tooltip>
          <!-- 表情弹窗 -->
          <a-popover>
            <template #content>
              <FacePicker @select="onSelectFace"/>
            </template>
            <a-tooltip title="表情包">
              <a-button type="text" size="large">
                <template #icon>
                  <SmileOutlined/>
                </template>
              </a-button>
            </a-tooltip>
          </a-popover>
        </a-space>
        <!-- 发布按钮 -->
        <a-button
            type="primary"
            @click="handlePublish"
            :disabled="!content.trim()"
        >
          发布
        </a-button>
      </a-flex>
    </a-card>
  </div>
  <a-modal
      v-model:open="is_open"
      title="发贴"
      :closable="true"
      :maskClosable="false"
      :footer="null"
  >
    <a-space direction="vertical" style="width: 100%">
      <!-- 用户头像 -->
      <a-space direction="horizontal">
        <a-avatar :src="appStore.useAccountStore.account?.avatar" size="large"/>
        <a-dropdown :trigger="['click']">
          <a-button class="ant-dropdown-link" @click.prevent type="text">
            {{ post_right_map[selected_status] }}
            <DownOutlined/>
          </a-button>
          <template #overlay>
            <a-menu>
              <a-menu @click="handleMenuClick">
                <a-menu-item v-for="(lable, value) in post_right_map" :key="value">
                  {{ lable }}
                </a-menu-item>
              </a-menu>
            </a-menu>
          </template>
        </a-dropdown>
        <router-link
            :to="{ name: 'long' }"
            target="_blank"
        >
          <a-button type="link">发长文</a-button>
        </router-link>
      </a-space>
      <!-- 输入框 -->
      <a-textarea ref="inputRef" :rows="4" placeholder="分享一下你的生活趣事" v-model:value="content" show-count
                  :maxlength="256"
                  @focus="saveCursor"
                  @blur="saveCursor"/>
    </a-space>
    <a-divider/>
    <!--          图片上传功能 -->
    <a-upload
        v-model:file-list="fileList"
        :action="apiUrls.upload_image_url()"
        list-type="picture-card"
        @preview="handlePreview"
        v-show="is_open_upload_image"
        :headers="{'Authorization': `Bearer ${appStore.useAccountStore.token.access_token}`}"
    >
      <div v-if="fileList.length < 9">
        <plus-outlined/>
        <div style="margin-top: 8px">上传</div>
      </div>
    </a-upload>
    <a-modal :open="previewVisible" :title="previewTitle" :footer="null" @cancel="handleCancel">
      <img alt="example" style="width: 100%" :src="previewImage"/>
    </a-modal>
    <a-divider v-if="is_open_upload_image"/>
    <!-- 第二段：上传图片按钮 + 发布按钮 -->
    <a-flex justify="space-between">
      <a-space>
        <!-- 上传图片按钮 -->
        <a-tooltip>
          <template #title>
            上传图片
          </template>
          <a-button type="text" size="large" @click="is_open_upload_image=!is_open_upload_image">
            <template #icon>
              <add-picture theme="outline" size="24" fill="#333"/>
            </template>
          </a-button>
        </a-tooltip>
        <!-- 表情弹窗 -->
        <a-popover
            v-model:open="showFacePanel"
            trigger="click"
        >
          <template #content>
            <FacePicker @select="onSelectFace"/>
          </template>
          <a-tooltip title="表情包">
            <a-button type="text" size="large">
              <template #icon>
                <SmileOutlined/>
              </template>
            </a-button>
          </a-tooltip>
        </a-popover>
      </a-space>
      <!-- 发布按钮 -->
      <a-button
          type="primary"
          @click="handlePublish"
          :disabled="!content.trim()"
          @mousedown.prevent="showFacePanel = true"
      >
        发布
      </a-button>
    </a-flex>
  </a-modal>
</template>

<style scoped>

</style>