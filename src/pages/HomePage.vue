<script setup lang="ts">
import {ref, onMounted, onBeforeUnmount, h, reactive} from 'vue';
import instance from '@/services/';
import {storeToRefs} from "pinia";
import {CScrollbar} from 'c-scrollbar'; // 滚动条
import {SettingFilled, UserOutlined, CommentOutlined} from "@ant-design/icons-vue";

import NewPost from "@/components/NewPost.vue";
import type {IPost} from "@/interface";
import Post from "@/components/Post.vue";
import {debounce} from "lodash";
import Header from '../components/Header.vue';
import appStore from "@/stores";
import {apiUrls, update_self_account, get_posts} from "@/services/api.ts";
import {type ItemType, type MenuProps, message} from "ant-design-vue";
import {useRouter} from "vue-router";

const isMobile = ref<boolean>(true);
const headerRef = ref<any>(null);
const postContent = ref<any>(null);
const contentHeight = ref<number | undefined>(undefined);
const showBackTop = ref<boolean>(false); // 控制返回顶部按钮的显示与隐藏
const {posts} = storeToRefs(appStore.usePostStore);// 推文列表
const count = ref(0);

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
    appStore.usePostStore.addPosts(r.c as IPost[]);
    is_show_success.value = true;
    count.value = r.data.items.length;
    //   3s后自动隐藏
    setTimeout(() => {
      is_show_success.value = false
    }, 3000);
  }).catch((e: any) => message.error(`拉取数据失败:${e}`));
}

//获取推文信息
const get_post = async () => {
  let post = posts.value.at(-1);
  let r = await get_posts(10, post?.post_id ?? null);
  if (r.data.total == 0) {
    message.info("没有数据可以拉取了")
    return;
  }
  appStore.usePostStore.addPosts(r.data.items as IPost[]);
  is_show_success.value = true;
  count.value = r.data.items.length;
  //   3s后自动隐藏
  setTimeout(() => {
    is_show_success.value = false
  }, 3000);
  // }).catch((e: any) => message.error(`拉取数据失败:${e}`));
}
const recommendations = ref<Array<Map<string, string>>>([]);

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


//=====================================
function getItem(
    label: string,
    key: string,
    icon?: any,
    children?: ItemType[],
    type?: 'group',
): ItemType {
  return {
    key,
    icon,
    children,
    label,
    type,
  } as ItemType;
}

const items: ItemType[] = reactive([
  getItem('用户中心', 'user', () => h(UserOutlined),),
  {type: 'divider'},
  getItem('设置', 'settings', () => h(SettingFilled),)
])
const router = useRouter();
const handleClick: MenuProps['onClick'] = e => {
  //console.log('click', e.key);
  switch (e.key) {
    case 'user':
      router.push({
        name: 'user',
        params: {
          username: appStore.useAccountStore.account.account_id
        }
      });
      break;
    case 'settings':
      router.push({name: 'settings'});
      break;

    default:
      break

  }
};
</script>

<template>
  <t-layout style="min-height: 100vh; text-align: center;">
    <t-header ref="headerRef" :style="{width: '100%',
      'background-color': 'white'}">
      <Header selected-keys="home"/>
    </t-header>
    <t-content style="padding-top: 8px">
      <a-row style="background-color: #E9EBEE">
        <!-- 功能列表 (第一列) -->
        <a-col :md="5" v-if="!isMobile">
          <c-scrollbar
              trigger="hover"
          >
            <!-- 功能列表内容 -->
            <a-space direction="vertical" style="width: 100%;">
              <a-menu :items="items" @click="handleClick" mode="inline" style="text-align: left;"/>
              <a-typography-text style="text-align: center">{{ new Date().getFullYear() }}
                <a-button type="text" disabled>内侧中</a-button>
                <a-button href="https://www.alsoapp.com/privacy/" target="_blank" type="text">隐私政策</a-button>
              </a-typography-text>
            </a-space>
          </c-scrollbar>
        </a-col>

        <!-- 博客列表 (第二列) -->
        <a-col :md="12" :xs="24" :sm="24" :offset="isMobile ? 0 : 1">
          <a-alert :message="`成功更新${count}条数据`" type="success" v-if="is_show_success" show-icon closable/>
          <c-scrollbar
              trigger="hover"
              class="content"
              @scroll="handleScroll"
              ref="postContent"
          >
            <a-col :md="isMobile? 22 : 20">
              <!--            发布推文输入框 -->

              <NewPost/>

              <!-- 博客列表内容 -->
              <a-card v-if="posts.length < 1">
                <a-empty/>
              </a-card>
              <Post v-for="post in posts" style="padding-top: 2px" :post="post"/>
              <!--                <a-list-->
              <!--                  item-layout="horizontal"-->
              <!--                  :data-source="posts"-->
              <!--                  render-item="item">-->
              <!--                <a-list-item v-for="post in posts" :key="post.post_id">-->
              <!--                </a-list-item>-->
              <!--              </a-list>-->
            </a-col>
          </c-scrollbar>
        </a-col>

        <!-- 推荐内容 (第三列) -->
        <a-col :md="5" offset="1" v-if="!isMobile" style="padding-right: 16px;">
          <c-scrollbar
              trigger="hover"
              class="content"
          >
            <a-alert message="禁止非法及不良言论" type="warning"/>
            <a-card title="推荐内容" v-show="false">
              <!-- 推荐内容 -->
<!--              <a-list-->
<!--                  item-layout="horizontal"-->
<!--                  :data-source="recommendations"-->
<!--                  render-item="item">-->
<!--                <a-list-item v-for="item in recommendations" :key="item.title">-->
<!--                  <a-list-item-meta-->
<!--                      :title="item.title"-->
<!--                      description="推荐的文章或者内容"-->
<!--                  />-->
<!--                </a-list-item>-->
<!--              </a-list>-->
            </a-card>
          </c-scrollbar>
        </a-col>
      </a-row>
    </t-content>
  </t-layout>
  <a-float-button-group>
    <a-float-button>
      <template #icon>
        <CommentOutlined/>
      </template>
      <template #tooltip>
        <div>给我们提出宝贵的意见或建议,我们非常关注你的建议</div>
        <b>contact@alsoapp.com</b>
      </template>
    </a-float-button>
    <t-back-top
      container=".baseList-container"
      :visible-height="0"
      style="position: absolute"
      :offset="['24px', '80px']"
      @click="scrollToTop" v-if="showBackTop"
    ></t-back-top>
  </a-float-button-group>
</template>

<style scoped>
.content {
  align-content: center;
  height: v-bind(contentHeight+ 'px');
  background-color: #E9EBEE;
}

</style>