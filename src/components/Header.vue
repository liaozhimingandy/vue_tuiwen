<script setup lang="ts">
import {h, onMounted, ref} from "vue";
import {MessagePlugin} from 'tdesign-vue-next';
import type {DropdownProps, MenuProps} from 'tdesign-vue-next';
import {LogoutIcon, MailIcon, SearchIcon} from 'tdesign-icons-vue-next';
import appStore from "@/stores";
import router from "@/router";
import instance from "@/services";
import {apiUrls} from "@/services/api.ts";
import {useDeviceWatcher} from '@/common/device.ts';
import {getResourceUrl} from "@/common/utils.ts";

const {isMobile} = useDeviceWatcher();

const onChangeHandler: MenuProps['onChange'] = (active) => {
  switch (active) {
    case 'home':
      router.push({name: "home"})
      break
    default:
      MessagePlugin.warning('不支持的菜单');
  }
};

const props = defineProps<{
  selectedKeys: string;
}>();

// 系统通知
const notices = ref([]);

onMounted(async () => {
  await instance.get(apiUrls.get_system_notices())
      .then((r: any) => notices.value = r.data.items)
      .catch((e: any) => MessagePlugin.error(e.data.detail));
});

// 退出登录
const onLogout = () => {
  // 跳转到登录页面
  router.push('login');
  appStore.useAccountStore.logout();
  MessagePlugin.success('您已退出登录')
}

const items = ref([
  {
    key: 'home',
    icon: '',
    label: h('a', {href: '/', target: '_self'}, ''),
    title: '首页',
  },
]);


// 把字符串selectedKeys转为数组，供 a-menu selectedKeys 使用
const current = ref(props.selectedKeys);

const keyword = ref('');
const onSearch = () => {
  if (keyword.value.trim() === "") return;
  router.push({name: "search", query: {q: keyword.value}})
};

const options: DropdownProps['options'] = [
  {
    content: '意见反馈',
    value: 1,
    onClick: () => handleOpenFeedback(),
    prefixIcon: () => h(MailIcon)
  },
  {
    content: '退出登录',
    value: 2,
    onClick: () => onLogout(),
    prefixIcon: () => h(LogoutIcon)
  },
]


const feedbackDialogRef = ref();
const handleOpenFeedback = () => {
  feedbackDialogRef.value?.open();
};
</script>

<template>
  <t-head-menu class="menu-center" v-model:value="current" expand-type="popup" @change="onChangeHandler">
    <template #logo>
      <img src="../assets/logo.svg" alt="logo" width="32"/>
      <!-- 搜索框：大屏展示，移动端隐藏 -->
      <t-input
          v-model:value="keyword"
          placeholder="搜索用户"
          class="header-search"
          v-if="!isMobile"
          @enter="onSearch"
      >
        <template #suffixIcon>
          <search-icon :style="{ cursor: 'pointer' }"/>
        </template>
      </t-input>
    </template>
    <t-menu-item :value="item.key" v-for="item in items">
      <template #icon>
        <t-icon name="home" size="36px"/>
      </template>
    </t-menu-item>
    <template #operations>
      <t-popup>
        <template #content>
          <t-list :split="true" style="width: 200px">
            <t-list-item v-for="item in notices" :key="item.key">
              <t-list-item-meta image="imageUrl" title="title" description="desc"/>
            </t-list-item>
            <t-empty v-if="notices.length == 0"/>
          </t-list>
        </template>
        <t-button size="large" variant="text">
          <template #icon>
            <t-icon name="notification"/>
          </template>
        </t-button>
      </t-popup>
      <t-dropdown :options="options">
        <t-space direction="horizontal">
          <t-avatar :image="getResourceUrl(appStore.useAccountStore.account?.avatar)" :hide-on-load-failed="false"/>
          <span v-if="!isMobile" style="margin-left: 8px;">{{ appStore.useAccountStore.account?.nick_name }}</span>
        </t-space>
      </t-dropdown>
    </template>
  </t-head-menu>
  <FeedbackDialog ref="feedbackDialogRef"/>
</template>

<style scoped>
/* 核心：t-menu-item 的父容器居中 */
:deep(.menu-center .t-head-menu__content) {
  display: flex;
  justify-content: center;
}

/* 菜单选项间距 */
:deep(.menu-center .t-head-menu__menu-item) {
  padding: 0 36px !important;
}

:deep(.menu-center .t-head-menu__menu-item .t-icon) {
  font-size: 22px;
}

/* 搜索框样式 */
.header-search {
  width: 220px;
  margin-left: 16px;
}

:deep(.t-head-menu__middle) {
  position: absolute !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  z-index: 1;
}
</style>