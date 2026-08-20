<script setup lang="ts">
import {ref, onMounted, onBeforeUnmount} from 'vue';
import {storeToRefs} from "pinia";
import {debounce} from "lodash";
import {useRouter} from "vue-router";
import type {MenuProps} from 'tdesign-vue-next';
import {MessagePlugin} from "tdesign-vue-next";
import {CScrollbar} from 'c-scrollbar'; // 滚动条

import instance from '@/services/';
import NewPost from "@/components/NewPost.vue";
import type {IPost} from "@/interface";
import Post from "@/components/Post.vue";
import Header from '../components/Header.vue';
import appStore from "@/stores";
import {apiUrls, update_self_account, get_posts} from "@/services/api.ts";

const isMobile = ref<boolean>(true);
const headerRef = ref<any>(null);
const postContent = ref<any>(null);
const contentHeight = ref<number | undefined>(undefined);
const showBackTop = ref<boolean>(false); // 控制返回顶部按钮的显示与隐藏
const {posts} = storeToRefs(appStore.usePostStore);// 推文列表

// 判断屏幕宽度是否小于等于768px（平板及以下）
const checkDeviceSize = () => {
  isMobile.value = window.innerWidth < 768;
}

const updateContentHeight = () => {
  contentHeight.value = window.innerHeight - headerRef.value.$el.offsetHeight - 12;
};

// 处理滚动事件
const handleScroll = debounce((event: any) => {
  const scrollTop = event.target.scrollTop; // 当前滚动位置
  const scrollHeight = event.target.scrollHeight; // 内容总高度
  const clientHeight = postContent.value.$el.clientHeight; // 视口高度

  // 当内容高度超过视口高度，且当前滚动位置超过一定值时，显示返回顶部按钮
  showBackTop.value = scrollTop >= clientHeight;
  // 判断滚动条是否到达底部
  if (scrollTop + clientHeight >= scrollHeight - 20) {
    get_post();
  }
}, 1000);

// 返回顶部
const scrollToTop = () => {
  postContent.value.setScrollTop({top: 0, behavior: 'smooth'});
};
// 获取最新数据
const get_past_latest = async () => {
  instance.get(apiUrls.get_posts_latest()).then((r: any) => {
    appStore.usePostStore.addPosts(r.data.items as IPost[]);
    is_show_success.value = true;
    //   3s后自动隐藏
    MessagePlugin.success(`成功更新${r.data.items.length}条数据`);
  }).catch((e: any) => MessagePlugin.error(`拉取数据失败:${e}`));
}

//获取推文信息
const get_post = async () => {
  let post = posts.value.at(-1);
  let r = await get_posts(10, post?.post_id ?? null);
  if (r.data.total == 0) {
    await MessagePlugin.info("没有数据可以拉取了")
    return;
  }
  appStore.usePostStore.addPosts(r.data.items as IPost[]);
  is_show_success.value = true;
  //   3s后自动隐藏
  await MessagePlugin.success(`成功更新${r.data.items.length}条数据`);
  // }).catch((e: any) => message.error(`拉取数据失败:${e}`));
}

onMounted(async () => {

  window.addEventListener("resize", updateContentHeight);
  updateContentHeight();
  window.addEventListener("resize", checkDeviceSize);
  checkDeviceSize();
  await get_post();
  // 启动5分钟自动轮询
  startPoll();
  // 监听页面标签切换，后台时暂停轮询（优化请求）
  document.addEventListener('visibilitychange', handlePageVisible)
});

onBeforeUnmount(async () => {
  window.removeEventListener("resize", updateContentHeight);
  window.removeEventListener("resize", checkDeviceSize);
  // 销毁组件：清除定时器 + 页面可见监听
  stopPoll();
  document.removeEventListener('visibilitychange', handlePageVisible)
})

// 获取用户信息
update_self_account(appStore.useAccountStore.account.account_id);

// ========== 定时器新增代码 ==========
// 存储轮询定时器id
const pollTimer = ref<number | null>(null);
// 5分钟 毫秒数
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
}

// 停止定时轮询
const stopPoll = () => {
  if (pollTimer.value) {
    clearInterval(pollTimer.value);
    pollTimer.value = null;
  }
}

// 页面切走/后台隐藏暂停轮询，切回来恢复
const handlePageVisible = () => {
  if (document.hidden) {
    stopPoll()
  } else {
    startPoll()
  }
}
// ====================================


const router = useRouter();

const changeHandler: MenuProps['onChange'] = (active) => {
  switch (active) {
    case 'user':
      router.push({
        name: 'user',
        params: {
          username: appStore.useAccountStore.account.account_id
        }
      });
      break;
    case 'setting':
      router.push({name: 'settings'});
      break;

    default:
      break
  }
  ;
}

</script>

<template>
  <t-layout style="min-height: 100vh; text-align: center;">
    <t-header ref="headerRef" :style="{width: '100%',
      'background-color': 'white'}">
      <Header selected-keys="home"/>
    </t-header>
    <t-content style="padding-top: 8px">
      <t-row style="background-color: #E9EBEE">
        <!-- 功能列表 (第一列) -->
        <t-col :md="3" v-if="!isMobile">
          <c-scrollbar
              trigger="hover"
          >
            <!-- 功能列表内容 -->
            <t-space direction="vertical" style="width: 100%;">
              <t-menu default-value="none" @change="changeHandler">
                <t-menu-item value="user">
                  <template #icon>
                    <t-icon name="user-circle"/>
                  </template>
                  用户中心
                </t-menu-item>
                <t-menu-item value="setting">
                  <template #icon>
                    <t-icon name="setting"/>
                  </template>
                  设置
                </t-menu-item>
              </t-menu>
              <t-typography-text style="text-align: center">{{ new Date().getFullYear() }}
                <t-button variant="text" disabled>内侧中</t-button>
                <t-button href="https://www.alsoapp.com/privacy/" target="_blank" variant="text">隐私政策</t-button>
              </t-typography-text>
            </t-space>
          </c-scrollbar>
        </t-col>

        <!-- 博客列表 (第二列) -->
        <t-col :md="5" :xs="12" :sm="12" :offset="isMobile ? 0 : 1">
          <c-scrollbar
              trigger="hover"
              class="content"
              @scroll="handleScroll"
              ref="postContent"
          >
            <t-col :md="11">
              <!--            发布推文输入框 -->
              <NewPost/>
              <!-- 博客列表内容 -->
              <t-card v-if="posts.length < 1">
                <t-empty/>
              </t-card>
              <Post v-for="post in posts" style="padding-top: 2px" :post="post"/>
            </t-col>
          </c-scrollbar>
        </t-col>

        <!-- 推荐内容 (第三列) -->
        <t-col :md="3" v-if="!isMobile" style="padding-right: 16px;">
          <c-scrollbar
              trigger="hover"
              class="content"
          >
            <t-alert message="禁止非法及不良言论" type="warning"/>
            <t-card title="推荐内容" v-show="false">
            </t-card>
          </c-scrollbar>
        </t-col>
      </t-row>
    </t-content>
     <t-back-top
      container=".container"
       shape="circle"
      :visible-height="0"
      :offset="[20, 0]"
      style="position: absolute; right: 20px; bottom: 20px"
      @click="scrollToTop"
    ></t-back-top>
  </t-layout>
</template>

<style scoped>
.content {
  align-content: center;
  height: v-bind(contentHeight+ 'px');
  background-color: #E9EBEE;
}

</style>