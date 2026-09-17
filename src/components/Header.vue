<!--
  Header.vue — 顶部导航栏
  用途：站点统一顶栏，含 Logo、搜索、菜单导航、系统通知、用户下拉（意见反馈/退出登录）。
  职责边界：负责路由跳转、登出、拉取系统通知与唤起反馈弹窗；不负责业务内容渲染。
  使用场景：被各页面（首页、天亮即焚等）引入作为公共布局头部。
  注意：
    - 通过 props.selectedKeys 接收当前路由标识，用于高亮对应菜单项。
    - 移动端由 useDeviceWatcher 的 isMobile 控制搜索框/昵称的显隐。
    - 退出登录先跳 login 再调用 store.logout()，顺序依赖 store 内部状态。
-->
<script setup lang="ts">
import {h, onMounted, ref} from 'vue';
import {MessagePlugin} from 'tdesign-vue-next';
import type {DropdownProps, MenuProps} from 'tdesign-vue-next';
import {LogoutIcon, MailIcon, SearchIcon, NotificationIcon, HomeIcon} from 'tdesign-icons-vue-next';

import appStore from '@/stores';
import router from '@/router';
import instance from '@/services';
import {apiUrls} from '@/services/api.ts';
import {useDeviceWatcher} from '@/common/device.ts';
import {getResourceUrl} from '@/common/utils.ts';
import FeedbackDialog from '@/components/FeedbackDialog.vue';
import UserAvatar from '@/components/UserAvatar.vue';
import SvgIcon from '@/components/SvgIcon.vue';

const props = defineProps<{
  selectedKeys: string;
}>();

/**
 * 系统通知项
 *
 * 注意 `avator` 是后端返回的字段名（拼写如此，非 avatar），使用时不要"顺手改对"，
 * 否则会取不到值。字段随业务扩展，保留索引签名兜底。
 */
interface ISystemNotice {
  title?: string;
  content?: {text?: string};
  extra?: {avator?: string};
  [property: string]: any;
}

const feedbackDialogRef = ref();
const {isMobile} = useDeviceWatcher();
// 系统通知列表。必须显式给出元素类型，否则被推断为 never[]，
// 模板里访问 item.title / item.extra 会报 TS2339
const notices = ref<ISystemNotice[]>([]);
const items = ref([
  {
    key: 'home',
    icon: h(HomeIcon),
    title: '首页',
  },
  {
    key: 'snap',
    icon: h(SvgIcon, {name: 'snap', size: 28, color: 'red'}),
    label: h('a', {href: '/test/', target: '_blank'}, ''),
    title: '天亮即焚',
  },
]);
// selectedKeys 是字符串，用 ref 包一层供 t-head-menu 的 v-model:value 双向绑定（并非数组）
const current = ref(props.selectedKeys);
const keyword = ref('');
const options: DropdownProps['options'] = [
  {
    content: '意见反馈',
    value: 1,
    onClick: () => handleOpenFeedback(),
    prefixIcon: () => h(MailIcon),
  },
  {
    content: '退出登录',
    value: 2,
    onClick: () => onLogout(),
    prefixIcon: () => h(LogoutIcon),
  },
];

// 菜单切换：根据选中项的 key 进行路由跳转
const onChangeHandler: MenuProps['onChange'] = (active) => {
  switch (active) {
    case 'home':
      router.push({name: 'home'});
      break;
    case 'snap':
      router.push({name: 'snap'});
      break;
    default:
      MessagePlugin.warning('不支持的菜单');
  }
};

// 退出登录
const onLogout = () => {
  // 跳转到登录页面
  router.push('login');
  appStore.useAccountStore.logout();
  MessagePlugin.success('您已退出登录');
};

const onSearch = () => {
  if (keyword.value.trim() === '') return;
  router.push({name: 'search', query: {q: keyword.value}});
};

// 唤起意见反馈弹窗（FeedbackDialog 通过 ref 暴露 open()）
const handleOpenFeedback = () => feedbackDialogRef.value?.open();

onMounted(async () => {
  await instance
    .get(apiUrls.get_system_notices())
    .then((r: any) => (notices.value = r.data.items))
    .catch((e: any) => MessagePlugin.error(e.data.detail));
});
</script>

<template>
  <div>
    <t-head-menu v-model:value="current" theme="light" @change="onChangeHandler">
      <template #logo>
        <img src="/logo.svg" width="38" alt="logo" />
        <!-- 搜索框：大屏展示，移动端隐藏 -->
        <t-input
          v-model:value="keyword"
          placeholder="搜索用户"
          class="header-search"
          v-if="!isMobile"
          @enter="onSearch"
        >
          <template #suffixIcon>
            <search-icon :style="{cursor: 'pointer'}" />
          </template>
        </t-input>
      </template>
      <t-menu-item :value="item.key" v-for="(item, index) in items" :key="index" :icon="item.icon">
        {{ item.title }}
      </t-menu-item>
      <template #operations>
        <t-popup>
          <template #content>
            <t-empty v-if="notices.length == 0" />
            <t-list :split="true" size="small" stripe header="系统通知">
              <t-list-item v-for="(item, index) in notices" :key="index" style="width: 200px">
                <t-list-item-meta
                  :image="getResourceUrl(item.extra?.avator)"
                  :title="item.title"
                  :description="item.content?.text"
                />
              </t-list-item>
            </t-list>
          </template>
          <t-button size="large" variant="text">
            <template #icon>
              <notification-icon />
            </template>
          </t-button>
        </t-popup>
        <t-dropdown :options="options">
          <t-space direction="horizontal">
            <UserAvatar
              :avatar="appStore.useAccountStore.account?.avatar"
              :nickname="appStore.useAccountStore.account?.nick_name"
            />
            <span v-if="!isMobile" style="margin-left: 8px">{{ appStore.useAccountStore.account?.nick_name }}</span>
          </t-space>
        </t-dropdown>
      </template>
    </t-head-menu>
    <FeedbackDialog ref="feedbackDialogRef" />
  </div>
</template>

<style scoped>
/* 搜索框样式 */
.header-search {
  width: 220px;
  margin-left: 16px;
}

.t-menu__operations {
  .t-button {
    margin-left: 8px;
  }
}
</style>
