<script setup lang="ts">
import {h, onMounted, ref} from "vue";
import {MessagePlugin} from 'tdesign-vue-next';
import type {DropdownProps, MenuProps} from 'tdesign-vue-next';
import {LogoutIcon, MailIcon, HomeIcon, NotificationIcon, SearchIcon} from 'tdesign-icons-vue-next';
import appStore from "@/stores";
import router from "@/router";
import instance from "@/services";
import {apiUrls} from "@/services/api.ts";
import {useDeviceWatcher} from '@/common/device.ts';

const {isMobile} = useDeviceWatcher();

const onChangeHandler: MenuProps['onChange'] = (active) => {
  switch (active){
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
    icon: h(HomeIcon),
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
    content: '提供宝贵意见',
    value: 1,
    href: 'mailto:liaozhimingandy@gg.com',
    prefixIcon: () => h(MailIcon)
  },
  {
    content: '退出登录',
    value: 2,
    onClick: () => onLogout(),
    prefixIcon: () => h(LogoutIcon)
  },
]
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
        <search-icon :style="{ cursor: 'pointer' }" />
      </template>
      </t-input>
    </template>
    <t-menu-item :value="item.key" v-for="item in items">
      <template #icon>
        <t-icon name="home" :size="36"/>
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
            <notification-icon/>
          </template>
        </t-button>
      </t-popup>

      <t-dropdown :options="options">
        <t-avatar :image="appStore.useAccountStore.account?.avatar" :hide-on-load-failed="false"/>
        <span v-if="!isMobile" style="margin-left: 8px;">{{ appStore.useAccountStore.account?.nick_name }}</span>
      </t-dropdown>
    </template>
  </t-head-menu>
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
</style>