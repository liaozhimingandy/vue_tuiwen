<!--
  文件：HomePage.vue
  用途：首页信息流，展示关注/推荐推文，支持下拉刷新、上拉加载、返回顶部
  路由：/ （name: 'home'）
  数据来源：get_posts 分页拉取推文；update_self_account 获取当前用户信息
  主要交互：
    1. 顶部 Header + 左侧功能菜单（用户中心 / 设置）
    2. 中部信息流：发布框 + 推文列表，滚动触底自动加载更多
    3. 每 5 分钟轮询最新数据；页面切到后台时暂停轮询
    4. 滚动超过一屏显示「返回顶部」按钮
-->
<script setup lang="ts">
import {ref, onMounted, onBeforeUnmount} from 'vue';
import {storeToRefs} from 'pinia';
import {debounce} from 'lodash';
import {useRouter} from 'vue-router';
import type {MenuProps} from 'tdesign-vue-next';
import {MessagePlugin} from 'tdesign-vue-next';
import {SettingIcon, UserCircleIcon} from 'tdesign-icons-vue-next';
import {CScrollbar} from 'c-scrollbar'; // 滚动条

import instance from '@/services/';
import NewPost from '@/components/NewPost.vue';
import type {IPost} from '@/interface';
import Post from '@/components/Post.vue';
import Header from '../components/Header.vue';
import appStore from '@/stores';
import {apiUrls, update_self_account, get_posts} from '@/services/api.ts';

const isMobile = ref<boolean>(true);
const headerRef = ref<any>(null);
const scrollbarRef = ref<any>(null);
const contentHeight = ref<number | undefined>(window.innerHeight);
const showBackTop = ref<boolean>(false); // 控制返回顶部按钮的显示与隐藏
const {posts} = storeToRefs(appStore.usePostStore); // 推文列表
// 判断屏幕宽度是否小于等于768px（平板及以下）；<=768 视为移动端，隐藏左右两栏
const checkDeviceSize = () => {
  isMobile.value = window.innerWidth < 768;
};

const updateContentHeight = () => {
  contentHeight.value = window.innerHeight - headerRef.value.$el.offsetHeight - 12;
};

// 处理滚动事件（防抖 1000ms，避免高频触发加载）
const handleScroll = debounce((event: any) => {
  const target = event.target as HTMLElement;
  const scrollTop = target.scrollTop;
  const scrollHeight = target.scrollHeight;
  const clientHeight = target.clientHeight;

  // 滚动超过一屏高度时显示「返回顶部」按钮
  showBackTop.value = scrollTop >= clientHeight;
  // 触底判定：距底部不足 20px 时拉取下一页（无限滚动）
  if (scrollTop + clientHeight >= scrollHeight - 20) {
    get_post();
  }
}, 1000);

// 返回顶部
const scrollToTop = () => {
  if (!scrollbarRef.value) return;
  scrollbarRef.value.setScrollTop({top: 10, behavior: 'smooth'});
};
/**
 * 拉取最新数据（用于轮询 / 手动刷新）：叠加到列表头部
 */
const get_past_latest = async () => {
  instance
    .get(apiUrls.get_posts_latest())
    .then((r: any) => {
      appStore.usePostStore.addPosts(r.data.items as IPost[]);
      is_show_success.value = true;
      MessagePlugin.success(`成功更新${r.data.items.length}条数据`);
    })
    .catch((e: any) => MessagePlugin.error(`拉取数据失败:${e}`));
};

/**
 * 向下加载更多推文：以列表最后一条的 post_id 为游标分页拉取
 */
const get_post = async () => {
  let post = posts.value.at(-1);
  // 每次拉取 10 条；post_id 为上一页最后一条，null 表示从头开始
  let r = await get_posts(10, post?.post_id ?? null);
  if (r.data.total == 0) {
    await MessagePlugin.info('没有数据可以拉取了');
    return;
  }
  appStore.usePostStore.addPosts(r.data.items as IPost[]);
  is_show_success.value = true;
  await MessagePlugin.success(`成功更新${r.data.items.length}条数据`);
};

onMounted(async () => {
  window.addEventListener('resize', updateContentHeight);
  updateContentHeight();
  window.addEventListener('resize', checkDeviceSize);
  checkDeviceSize();
  await get_post();
  // 启动5分钟自动轮询
  startPoll();
  // 监听页面标签切换，后台时暂停轮询（优化请求）
  document.addEventListener('visibilitychange', handlePageVisible);
});

onBeforeUnmount(async () => {
  window.removeEventListener('resize', updateContentHeight);
  window.removeEventListener('resize', checkDeviceSize);
  // 销毁组件：清除定时器 + 页面可见监听
  stopPoll();
  document.removeEventListener('visibilitychange', handlePageVisible);
  handleScroll.cancel();
});

// 获取用户信息
update_self_account(appStore.useAccountStore.account.account_id);

// ========== 定时器新增代码 ==========
// 存储轮询定时器id
const pollTimer = ref<number | null>(null);
// 5分钟 毫秒数（轮询间隔）
const POLL_TIME = 5 * 60 * 1000;
// 标记是否正在请求，防止并发重复请求
const isLoading = ref(false);
// 控制成功提示显示
const is_show_success = ref(false);

// 启动定时轮询
const startPoll = () => {
  // 先清除旧定时器，避免多个定时器同时运行
  if (pollTimer.value) clearInterval(pollTimer.value);
  pollTimer.value = window.setInterval(async () => {
    if (!isLoading.value) {
      await get_past_latest();
    }
  }, POLL_TIME);
};

// 停止定时轮询
const stopPoll = () => {
  if (pollTimer.value) {
    clearInterval(pollTimer.value);
    pollTimer.value = null;
  }
};

// 页面切走/后台隐藏暂停轮询，切回来恢复
const handlePageVisible = () => {
  if (document.hidden) {
    stopPoll();
  } else {
    startPoll();
  }
};
// ====================================

const router = useRouter();

/**
 * 左侧菜单切换：跳转到用户中心或设置页
 * @param active 菜单项的 value（'user' | 'setting'）
 */
const changeHandler: MenuProps['onChange'] = (active) => {
  switch (active) {
    case 'user':
      router.push({
        name: 'user',
        params: {
          username: appStore.useAccountStore.account.account_id,
        },
      });
      break;
    case 'setting':
      router.push({name: 'settings'});
      break;

    default:
      break;
  }
};
</script>

<template>
  <t-layout style="min-height: 100vh; text-align: center">
    <t-header ref="headerRef" :style="{width: '100%', 'background-color': 'white'}">
      <Header selected-keys="home" />
    </t-header>
    <t-content style="padding-top: 8px">
      <t-row style="background-color: #e9ebee">
        <!-- 功能列表 (第一列) -->
        <t-col :md="3" v-if="!isMobile">
          <c-scrollbar trigger="hover">
            <!-- 功能列表内容 -->
            <t-space direction="vertical" style="width: 100%">
              <t-menu default-value="none" @change="changeHandler" style="width: 100%">
                <t-menu-item value="user">
                  <template #icon>
                    <user-circle-icon />
                  </template>
                  用户中心
                </t-menu-item>
                <t-menu-item value="setting">
                  <template #icon>
                    <setting-icon />
                  </template>
                  设置
                </t-menu-item>
              </t-menu>
              <t-typography-text style="text-align: center"
                >{{ new Date().getFullYear() }}
                <t-button variant="text" disabled>内侧中</t-button>
                <t-button href="https://www.alsoapp.com/privacy/" target="_blank" variant="text">隐私政策</t-button>
              </t-typography-text>
            </t-space>
          </c-scrollbar>
        </t-col>

        <!-- 博客列表 (第二列) -->
        <t-col :md="{offset: 1, span: 5}" :xs="11" :sm="11">
          <c-scrollbar trigger="hover" class="content" @scroll="handleScroll" ref="scrollbarRef">
            <t-col :md="11">
              <!--            发布推文输入框 -->
              <NewPost />
              <!-- 博客列表内容 -->
              <t-card v-if="posts.length < 1">
                <t-empty />
              </t-card>
              <Post v-for="post in posts" style="padding-top: 2px" :post="post" />
            </t-col>
          </c-scrollbar>
        </t-col>

        <!-- 推荐内容 (第三列) -->
        <t-col :md="3" v-if="!isMobile" style="padding-right: 16px">
          <c-scrollbar trigger="hover" class="content">
            <t-alert message="禁止非法及不良言论" theme="warning" />
            <t-card title="推荐内容" v-show="false"> </t-card>
          </c-scrollbar>
        </t-col>
      </t-row>
    </t-content>
    <t-back-top
      shape="circle"
      :offset="[20, 0]"
      :visible-height="0"
      style="position: absolute; right: 20px; bottom: 20px"
      @click="scrollToTop"
    ></t-back-top>
  </t-layout>
</template>

<style scoped>
.content {
  align-content: center;
  height: v-bind(contentHeight + 'px');
  background-color: #e9ebee;
}
</style>
