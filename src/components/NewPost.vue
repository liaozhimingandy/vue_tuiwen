<script setup lang="ts">
import {ref} from 'vue';
import {FileImageFilled, DownOutlined, PlusOutlined} from "@ant-design/icons-vue";
import type {IPost} from "@/interface";
import appStore from '@/stores/';
import {storeToRefs} from 'pinia';
import instance from '@/services/';

const {posts} = storeToRefs(appStore.usePostStore);

// 内容
const content = ref<string>('');
// 上传图片
const fileList = ref<File[]>([]);
const is_open_upload_image = ref<boolean>(false); //是否打开上传图片的弹窗
// 设置图片上传的接口地址
const url_upload = import.meta.env.VITE_APP_BASE_URL + '/upload/image/';
const is_open = ref<boolean>(false); //输入框是否打开

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


// 定义状态列表（可以后续拓展更多选项）
const list_status = ref([
  {value: "public", label: "公开"},
  {value: "private", label: "仅自己可见"},
  // {value: "friends", label: "仅好友可见"}, // 可以随时添加新状态
]);

// 选中的状态，默认 "public"
const selected_status = ref<number>(list_status.value[0] as number);
// 处理菜单点击事件
const handleMenuClick = ({key}: { key: string }) => {
  selected_status.value = (list_status.value.find((item) => item.value === key) || selected_status.value) as number;
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
  let images = [];
  if (is_open_upload_image.value) {
    fileList.value.forEach((el) => {
      images.push(el.response.image_url);
    })
  }
  let post: IPost = {
    post_id: crypto.randomUUID(),
    account_id: localStorage.getItem('account_id') || "unknow",
    right_status: 1,
    content: {"text": content.value, "images": images},
    from_ip: "string",
    from_device: 9,
    status: 1
  }
  // 调发布接口
  instance.post("/posts/", JSON.stringify(post)).then((r: any) => {
    posts.value.push(r.data as IPost);
    posts.value = posts.value.sort((a, b) => new Date(b.gmt_created).getTime() - new Date(a.gmt_created).getTime());
  });
  0
  is_open.value = false;
  content.value = "";
};
//token
const access_token = 'Bearer ' + localStorage.getItem('access_token');
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
                  {{ selected_status.label }}
                  <DownOutlined/>
                </a-button>
                <template #overlay>
                  <a-menu>
                    <a-menu @click="handleMenuClick">
                      <a-menu-item v-for="status in list_status" :key="status.value">
                        {{ status.label }}
                      </a-menu-item>
                    </a-menu>
                  </a-menu>
                </template>
              </a-dropdown>
            </a-space>
            <!-- 输入框 -->
            <a-textarea :rows="4" placeholder="分享一下你的生活趣事" v-model:value="content"/>
          </a-space>
          <a-divider/>
          <!--          图片上传功能 -->
          <a-upload
              v-model:file-list="fileList"
              :action="url_upload"
              list-type="picture-card"
              @preview="handlePreview"
              v-show="is_open_upload_image"
              :headers="{'Authorization': access_token}"
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
            <!-- 上传图片按钮 -->
            <a-tooltip>
              <template #title>
                上传图片
              </template>
              <a-button type="text" size="large" @click="is_open_upload_image=!is_open_upload_image">
                <template #icon>
                  <FileImageFilled/>
                </template>
              </a-button>
            </a-tooltip>
            <!-- 发布按钮 -->
            <a-button
                type="primary"
                @click="handlePublish"
                :disabled="!content.trim()"
            >
              发布
            </a-button>
          </a-flex>
        </a-modal>
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
        <!-- 上传图片按钮 -->
        <a-tooltip>
          <template #title>
            上传图片
          </template>
          <a-button type="text" @click="handleOpenChange(true)">
            <template #icon>
              <FileImageFilled/>
            </template>
          </a-button>
        </a-tooltip>
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
</template>

<style scoped>

</style>