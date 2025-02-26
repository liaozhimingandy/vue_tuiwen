<script setup lang="ts">
import {ref, onMounted, onBeforeUnmount, h} from 'vue';
import {CScrollbar} from 'c-scrollbar'; // 滚动条
import {BugFilled, MailOutlined, BellOutlined, SettingFilled, HomeOutlined}
  from "@ant-design/icons-vue";
import {message} from 'ant-design-vue';
import NewPost from "../components/NewPost.vue";
import instance from '../services/';
import type {IPost} from "../interface/types.ts";
import Post from "../components/Post.vue";
import {debounce} from "lodash";
import {storeToRefs} from "pinia";

import appStore from "../stores";
import router from "../router";

const header = ref<any>(null);
const postContent = ref<any>(null);
const contentHeight = ref<number | undefined>(undefined);
const selectedKeys = ref<string[]>(['1']);
const handleMenuClick = (e: any) => {
  selectedKeys.value = [e.key];
};
const isMobile = ref<boolean>(false); // 判断是否为手机设备
const showBackTop = ref<boolean>(false); // 控制返回顶部按钮的显示与隐藏

const {posts} = storeToRefs(appStore.usePostStore);// 推文列表

// 判断屏幕宽度是否小于等于768px（平板及以下）
const checkDeviceSize = () => {
  isMobile.value = window.innerWidth <= 768;
}

const updateContentHeight = () => {
  contentHeight.value = window.innerHeight - header.value.$el.offsetHeight - 12;
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
//获取推文信息
const get_post = async () => {
  instance.get("/posts/lasted/").then((res: any) => {
    posts.value = posts.value.concat(res.data as IPost[]);
    // message.info(`成功加载${res.data.length}条数据`)
  })
}

onMounted(async () => {
  window.addEventListener("resize", updateContentHeight);
  updateContentHeight();
  window.addEventListener("resize", checkDeviceSize);
  checkDeviceSize();
  await get_post();
});

onBeforeUnmount(async () => {
  window.removeEventListener("resize", updateContentHeight);
  window.removeEventListener("resize", checkDeviceSize);
})

// 退出登录
const logout = () => {
  // 清空登录信息
  localStorage.clear();
  // 跳转到登录页面
  router.push('login');
}
</script>

<template>
  <a-layout style="min-height: 100vh; text-align: center;">
    <a-layout-header ref="header" :style="{width: '100%',
      'background-color': 'white'}">
      <a-row justify="space-between">
        <!-- Logo 左侧 -->
        <a-col :span="4">
          <a href="/" style="font-size: 24px; font-weight: bold;">Logo</a>
        </a-col>

        <!-- Menu 中间 -->
        <a-col :span="16">
          <a-menu
              theme="light"
              mode="horizontal"
              :selected-keys="selectedKeys"
              @click="handleMenuClick"
              style="line-height: 64px; display: flex; justify-content: center;font-size: 16px; ">
            <a-menu-item key="1">
              <a-button type="text" style="width: 100px; height: 80%;">
                <HomeOutlined style="font-size: 20px"/>
              </a-button>
            </a-menu-item>
            <!--            <a-menu-item key="2">-->
            <!--              <router-link to="friends">-->
            <!--                <a-button type="text" style="width: 100px; height: 80%;">-->
            <!--                  <UserSwitchOutlined style="font-size: 20px"/>-->
            <!--                </a-button>-->
            <!--              </router-link>-->
            <!--            </a-menu-item>-->
            <!--            <a-menu-item key="3">-->
            <!--              <router-link to="hot">-->
            <!--                <a-button type="text" style="width: 100px; height: 80%;">-->
            <!--                  <FireOutlined style="font-size: 20px"/>-->
            <!--                </a-button>-->
            <!--              </router-link>-->
            <!--            </a-menu-item>-->
          </a-menu>
        </a-col>
        <!-- User Info 右侧 -->
        <a-col :span="4" style="text-align: right;">
          <a-space>
            <a-tooltip>
              <template #title>
                通知
              </template>
              <a-button type="text" shape="circle" size="large">
                <template #icon>
                  <BellOutlined/>
                </template>
              </a-button>
            </a-tooltip>
            <a-dropdown :trigger="['click']">
              <a class="ant-dropdown-link" @click.prevent>
                <a-avatar src="https://xsgames.co/randomusers/avatar.php?g=male" :size="40"/>
                <span style="margin-left: 8px;">用户名</span>
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
                    <a-button href="/" :icon="h(MailOutlined)" type="text" style="width: 100%; text-align: start"
                              @click="logout">退出登录
                    </a-button>
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </a-space>
        </a-col>
      </a-row>
    </a-layout-header>
    <a-layout-content style="padding-top: 8px">
      <a-row style="background-color: #E9EBEE">
        <!-- 功能列表 (第一列) -->
        <a-col :md="5" v-if="!isMobile">
          <c-scrollbar
              trigger="hover"
              class="content"
          >
            <!-- 功能列表内容 -->
            <a-menu>
              <a-menu-item key="1">
                <router-link :to="{ name: 'settings'}">
                  <a-button :icon="h(SettingFilled)" type="text" style="width: 100%; font-size: 16px">设置
                  </a-button>
                </router-link>
              </a-menu-item>
            </a-menu>

          </c-scrollbar>
        </a-col>

        <!-- 博客列表 (第二列) -->
        <a-col :md="12" :xs="24" :sm="24" :offset="isMobile? 0 : 1">
          <c-scrollbar
              trigger="hover"
              class="content"
              @scroll="handleScroll"
              ref="postContent"
          >
            <a-col :md="isMobile? 22 : 20">
              <!--            发布推文输入框 -->

              <NewPost/>
              <div style="height: 6px"></div>

              <!-- 博客列表内容 -->
              <a-empty v-if="posts.length < 1"/>
              <Post v-for="post in posts" style="padding-top: 2px" :post="post"/>

            </a-col>
          </c-scrollbar>

        </a-col>

        <!-- 推荐内容 (第三列) -->
        <a-col :md="5" offset="1" v-if="!isMobile">
          <c-scrollbar
              trigger="hover"
              class="content"
          >
            <a-card title="推荐内容">
              <!-- 推荐内容 -->
              <a-list
                  item-layout="horizontal"
                  :data-source="recommendations"
                  render-item="item">
                <a-list-item v-for="item in recommendations" :key="item.title">
                  <a-list-item-meta
                      :title="item.title"
                      description="推荐的文章或者内容"
                  />
                </a-list-item>
              </a-list>
            </a-card>
          </c-scrollbar>
        </a-col>
      </a-row>
    </a-layout-content>
  </a-layout>
  <a-float-button-group>
    <a-float-button>
      <template #icon>
        <BugFilled/>
      </template>
      <template #tooltip>
        <div>给我们提出宝贵的意见或建议,我们非常关注你的建议</div>
        <b>liaozhimingandy@qq.com</b>
      </template>
    </a-float-button>
    <a-back-top :visibility-height="0" @click="scrollToTop" v-if="showBackTop"/>
  </a-float-button-group>
</template>

<style scoped>
.content {
  align-content: center;
  height: v-bind(contentHeight+ 'px');
  background-color: #E9EBEE;
}

</style>