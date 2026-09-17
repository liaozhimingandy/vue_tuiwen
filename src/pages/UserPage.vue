<script setup lang="ts">
/**
 * 用户中心页（UserPage）
 *
 * 路由路径：/user/:username
 * 页面用途：展示指定用户资料、粉丝/关注/点赞统计，并提供关注/取关、分享（二维码）、帖子列表。
 * 数据来源：apiUrls.get_account / get_account_follow / get_accounts_posts；当前登录态来自 Pinia。
 * 主要交互：
 *   1. 进入时并发拉取用户信息与关注状态；
 *   2. Tab「帖子」首次展开时按游标分页加载（以最后一条 post_id 为游标）；
 *   3. 关注/取关即时更新本地计数与按钮文案。
 */
import {ref, computed, onMounted} from 'vue';
import {useRoute} from 'vue-router';

import Header from '../components/Header.vue';
import type {IAccount, IFollow, IPost} from '@/interface';
import {sex_code_map} from '@/common/constants.js';
import {compareByTimeDesc} from '@/common/utils.ts';
import {apiUrls, get_accounts_posts} from '@/services/api.ts';
import Post from '@/components/Post.vue';
import {type ListProps, MessagePlugin} from 'tdesign-vue-next';
import appStore from '@/stores';
import instance from '@/services';
import UserAvatar from '@/components/UserAvatar.vue';
import {ShareIcon, RollbackIcon} from 'tdesign-icons-vue-next';

const route = useRoute();

/**
 * 目标页面的用户名（来自路由参数 :username）
 *
 * route.params 的静态类型是 string | string[]，但 /u/:username/ 实际只会是单个字符串，
 * 这里收敛为 string，避免每处调用点都写类型判断。
 * ⚠️ 历史行为提示：组件在「同一路由、不同 username」之间跳转时不会重建，
 * username 为普通常量不会自动更新（如需支持请改成 computed + watch route.params）。
 */
const username = route.params.username as string;

// 用户信息
const user = ref<IAccount>();

// 返回上一页（浏览器历史回退）
const go_back = () => {
  window.history.back();
};
// 是否为本人（用于决定是否显示「关注」按钮等）
const is_self = computed(() => {
  return user.value?.account_id === appStore.useAccountStore.account.account_id;
});

const desc = ref<string>('个人简介');
/**
 * 当前页用户的关注关系数据
 *
 * 给一份全 0 的默认值而非 undefined：
 * 模板里原本就是 `follow?.x ?? 0`，显示结果完全一致；而脚本中可直接读写，
 * 不必到处判空（此前数据未加载完就点「关注」会抛 TypeError 读到 undefined）。
 * 是否已加载由 followLoaded 单独标记。
 */
const follow = ref<IFollow>({
  follower_count: 0,
  followee_count: 0,
  is_following: false,
  like_count: 0,
});
/** 关注关系接口是否已返回（避免基于空数据发起关注/取关请求） */
const followLoaded = ref(false);

onMounted(() => {
  //   查询用户信息
  instance.get(apiUrls.get_account(username)).then((r: any) => {
    user.value = r.data as IAccount;
  });

  // 查询帐户粉丝情况
  instance.get(apiUrls.get_account_follow(username)).then((r: any) => {
    follow.value = r.data as IFollow;
    followLoaded.value = true;
  });
});

const posts = ref<IPost[]>([]);

/**
 * 帖子列表「加载更多」：以当前列表最后一条的 post_id 作为游标向后分页
 */
const onLoadMore = async () => {
  loading.value = true;
  let post = posts.value.at(-1);
  let r = await get_accounts_posts(10, post?.post_id ?? null, username);
  if (r.data.total == 0) {
    loading.value = false;
    hasMore.value = false;
    await MessagePlugin.info('没有数据可以拉取了');
    return;
  }
  const combined = [...posts.value, ...r.data.items];

  // 用 post_id 做 Map 去重（相同帖子只保留最后一次出现的版本，防止游标分页重叠重复）
  const map = new Map();
  for (const item of combined) {
    map.set(item.post_id, item);
  }
  // 排序：按创建时间倒序，最新在前（兼容 create_at / gmt_created 两种字段名）
  posts.value = Array.from(map.values()).sort(compareByTimeDesc);
  loading.value = false;
};

/**
 * Tab 切换回调：首次进入「帖子」面板(值=2) 且尚无数据时，自动加载列表
 * @param val 当前激活的 Tab 值（TDesign 透传 string | number）
 */
const onTabChange = async (val: string | number) => {
  // 切换到帖子面板，并且还没加载过数据
  if (Number(val) === 2 && posts.value.length == 0) {
    await onLoadMore();
  }
};

const loading = ref(false);
const hasMore = ref(true);
const asyncLoading = computed<ListProps['asyncLoading']>(() => {
  if (loading.value) {
    return 'loading';
  }
  if (hasMore.value) {
    return 'load-more';
  }
  // 全部加载完成，自定义提示文字
  return '没有更多数据了';
});

/**
 * 关注 / 取消关注切换
 * 关注者 = 当前登录用户；被关注者 = 本页 username
 */
const onFollow = async () => {
  // 关注数据还没回来时直接忽略，避免基于默认值误发请求
  if (!followLoaded.value) return;

  //follower_id: 关注者 followee_id:被关注者
  if (!follow.value.is_following) {
    // 如果没有正在关注
    const data = {
      follower_id: appStore.useAccountStore.account.account_id,
      followee_id: username,
    };
    await instance.post(apiUrls.post_follow(), data);
    follow.value.is_following = true;
    follow.value.followee_count++;
    await MessagePlugin.success('关注成功');
  } else {
    instance.delete(apiUrls.delete_follow(appStore.useAccountStore.account.account_id, username)).then(() => {
      MessagePlugin.success('取消关注成功');
      follow.value.is_following = false;
      follow.value.followee_count--;
    });
  }
};
</script>

<template>
  <t-layout style="min-height: 100vh; text-align: center">
    <t-header ref="headerRef" :style="{width: '100%', 'background-color': 'white'}">
      <Header selected-keys="o" />
    </t-header>
    <t-content style="padding-top: 8px">
      <t-row justify="center">
        <t-col :md="6" :xs="12" :sm="12" style="text-align: start; background-color: white">
          <div
            style="border: 1px solid rgb(235, 237, 240); padding: 16px; display: flex; align-items: center; gap: 8px"
          >
            <t-button variant="text" @click="go_back">
              <template #icon>
                <rollback-icon />
              </template>
              返回
            </t-button>
            <div>
              <div style="font-size: 18px; font-weight: bold">用户中心</div>
              <div style="color: #666; font-size: 14px">可以查看用户资料</div>
            </div>
          </div>

          <t-row style="margin-top: 16px">
            <t-space>
              <UserAvatar :avatar="user?.avatar" :nickname="user?.nick_name" :size="120" />
              <t-space direction="vertical">
                <h2>
                  {{ user?.nick_name }}<span style="font-size: 16px">({{ username }})</span>
                </h2>
                <t-space>
                  <t-button v-show="!is_self" theme="primary" @click="onFollow">
                    {{ (follow?.is_following ?? false) ? '取消关注' : '加关注' }}
                  </t-button>
                  <t-popup trigger="hover">
                    <template #content>
                      <t-space direction="vertical">
                        <t-typography-text level="h4">扫一扫</t-typography-text>
                        <t-qrcode
                          :value="`${apiUrls.share_account_link(user?.account_id ?? '')}`"
                          level="H"
                          style="margin: 0 auto"
                          type="svg"
                        />
                      </t-space>
                    </template>
                    <t-button variant="outline">
                      <template #icon>
                        <share-icon />
                      </template>
                      分享
                    </t-button>
                  </t-popup>
                </t-space>
                <t-space>
                  <t-statistic :value="follow?.follower_count ?? 0" unit="关注"> </t-statistic>
                  <t-statistic :value="follow?.followee_count ?? 0" unit="粉丝"> </t-statistic>
                  <t-statistic :value="follow?.like_count ?? 0" unit="赞"> </t-statistic>
                </t-space>
                <!-- 可编辑段落，保留原逻辑 -->
                <t-paragraph-text v-if="false" v-model:content="desc" editable style="width: 40vw" />
              </t-space>
            </t-space>
          </t-row>

          <t-tabs default-value="1" @change="onTabChange">
            <t-tab-panel value="1" label="资料">
              <t-card>
                <t-descriptions title="用户信息" bordered>
                  <t-descriptions-item label="用户名">{{ user?.username }}</t-descriptions-item>
                  <t-descriptions-item label="电子邮箱">{{ user?.mail }}</t-descriptions-item>
                  <t-descriptions-item label="账户目前状态" :span="2"> 正常 </t-descriptions-item>
                  <t-descriptions-item label="出生日期">{{ user?.gmt_birth }}</t-descriptions-item>
                  <t-descriptions-item label="性别">{{ sex_code_map[user?.sex ?? 0] }}</t-descriptions-item>
                </t-descriptions>
              </t-card>
            </t-tab-panel>
            <t-tab-panel value="2" label="帖子">
              <t-list split @load-more="onLoadMore" :async-loading="asyncLoading">
                <t-list-item v-for="item in posts" :key="item.key">
                  <Post :post="item" style="width: 100%" />
                </t-list-item>
              </t-list>
            </t-tab-panel>
          </t-tabs>
        </t-col>
      </t-row>
    </t-content>
  </t-layout>
</template>

<style scoped></style>
