<script setup lang="ts">
import {h, onMounted, ref, watch} from "vue";
import {BellOutlined, HomeOutlined, MailOutlined, LogoutOutlined, SearchOutlined} from "@ant-design/icons-vue";
import appStore from "@/stores";
import router from "@/router";
import instance from "@/services";
import {apiUrls} from "@/services/api.ts";
import {message} from "ant-design-vue";

const props = defineProps<{
  selectedKeys: string;
}>();

// 系统通知
const notices = ref([]);

onMounted(async () => {
  await instance.get(apiUrls.get_system_notices())
      .then((r: any) => notices.value = r.data.items)
      .catch((e: any) => message.error(e.data.detail));
});

// 退出登录
const onLogout = () => {
  // 跳转到登录页面
  router.push('login');
  appStore.useAccountStore.logout();
}

const items = ref([
  {
    key: 'home',
    icon: () => h(HomeOutlined),
    label: h('a', {href: '/', target: '_self'}, ''),
    title: 'Home',
  },
]);


// 把字符串selectedKeys转为数组，供 a-menu selectedKeys 使用
const current = ref<string[]>([props.selectedKeys]);
watch(
    () => props.selectedKeys,
    (val) => {
      current.value = [val];
    },
    {immediate: true}
);

const value = ref('');
const onSearch = () => {
};
</script>

<template>
  <a-flex align="center" justify="space-between" style="height: 100%;">
    <a-flex align="center">
      <img src="../assets/logo.svg" alt="logo" width="32"/>
      <a-input
          v-model:value="value"
          placeholder="搜索用户"
          @click="onSearch"
      >
        <template #prefix>
          <SearchOutlined />
        </template>
      </a-input>
    </a-flex>
    <a-menu v-model:selectedKeys="current" mode="horizontal" :items="items"
            style="height:64px; line-height:64px; border:none; font-size: 16px"/>
    <a-space>
      <a-popover>
        <template #content>
          <a-list style="width: 300px" :data-source="notices">
            <template #renderItem="{ item }">
              <a-list-item>
                <a-list-item-meta
                    :description="item.content?.text"
                >
                  <template #title>
                    {{ item.title }}
                  </template>
                  <template #avatar>
                    <a-avatar :src="item.extra?.avatar"/>
                  </template>
                </a-list-item-meta>
              </a-list-item>
            </template>
          </a-list>
        </template>
        <a-button type="text" shape="circle" size="large">
          <template #icon>
            <BellOutlined/>
          </template>
        </a-button>
      </a-popover>
      <a-dropdown :trigger="['click']">
        <a class="ant-dropdown-link" @click.prevent>
          <a-avatar :src="appStore.useAccountStore.account?.avatar " :size="40"/>
          <span style="margin-left: 8px;">{{ appStore.useAccountStore.account?.nick_name }}</span>
        </a>
        <template #overlay>
          <a-menu style="margin-top: 20px; background-color: #E9EBEE">
            <a-menu-item key="0">
              <a-button href="mailto:liaozhimingandy@gg.com" :icon="h(MailOutlined)" type="text"
                        style="width: 100%; text-align: start">提供宝贵意见
              </a-button>
            </a-menu-item>
            <a-menu-divider/>
            <a-menu-item key="1">
              <a-button href="/" :icon="h(LogoutOutlined)" type="text" style="width: 100%; text-align: start"
                        @click="onLogout">退出登录
              </a-button>
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </a-space>
  </a-flex>
</template>

<style scoped>
:deep(.ant-menu-horizontal .ant-menu-item .anticon) {
  font-size: 22px;
}
:deep(.ant-menu-horizontal .ant-menu-item) {
  padding: 0 36px !important; /* 左右间距加大 */
}
</style>