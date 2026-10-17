<script setup lang="ts">
/**
 * 用户中心页（UserPage）
 *
 * 路由路径：/user/:username（:username 实际传的是 account_id）
 * 页面用途：展示指定用户资料、关注/粉丝/获赞统计，并提供关注/取关、分享、帖子列表，
 *          以及「关注列表」「粉丝列表」两个关系 Tab。
 * 数据来源：apiUrls.get_account / get_account_follow / get_accounts_posts /
 *          get_followees / get_followers；当前登录态来自 Pinia。
 * 主要交互：
 *   1. 进入时并发拉取用户信息与关注状态；
 *   2. Tab「帖子 / 关注 / 粉丝」首次展开时按需分页加载；
 *   3. 关注/取关（本人主页展示「编辑资料」而非关注按钮）；
 *   4. 同一路由不同 username 之间跳转时自动重新拉取（修复原实现不刷新的 bug）。
 */
import {computed, onMounted, reactive, ref, watch} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {MessagePlugin, type ListProps} from 'tdesign-vue-next';
import {ShareIcon, RollbackIcon, ChatIcon} from 'tdesign-icons-vue-next';

import Header from '../components/Header.vue';
import type {IAccount, IFollow, IPost} from '@/interface';
import {sex_code_map} from '@/common/constants.js';
import {compareByTimeDesc, logger} from '@/common/utils.ts';
import {apiUrls, get_accounts_posts} from '@/services/api.ts';
import Post from '@/components/Post.vue';
import appStore from '@/stores';
import instance from '@/services';
import UserAvatar from '@/components/UserAvatar.vue';
import {useDeviceWatcher} from '@/common/device.ts';
import type {AxiosRequestConfig} from 'axios';

const route = useRoute();
const router = useRouter();
const {isMobile} = useDeviceWatcher();

/**
 * 目标用户名（来自路由参数 :username）。
 *
 * ⚠️ 必须用 computed 包裹：原实现写成 `const username = route.params.username`，
 * 组件在「同一路由、不同 username」之间跳转（例如从搜索结果点进另一个用户）时不会重建，
 * 普通常量不会随路由更新，于是看到的还是上一个人的资料。改为 computed + watch 重新拉取。
 */
const username = computed(() => route.params.username as string);

// 用户信息
const user = ref<IAccount>();
/** 首屏资料加载态 */
const loadingUser = ref(true);

// 是否为本人（决定是否显示「关注」按钮等）
const is_self = computed(() => user.value?.account_id === appStore.useAccountStore.account.account_id);

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

// 帖子 / 关注 / 粉丝 列表
const posts = ref<IPost[]>([]);
const followees = ref<IAccount[]>([]);
const followers = ref<IAccount[]>([]);

const loading = ref(false);
const hasMore = ref(true);
/** 当前激活的 Tab：1 资料 / 2 帖子 / 3 关注 / 4 粉丝 */
const activeTab = ref('1');

/**
 * 关系列表里每一项的关注状态（按 account_id 记录）。
 * 后端返回的关注列表通常带 is_following 字段，这里用它初始化，点击时做乐观更新。
 */
const listFollowMap = reactive<Record<string, boolean>>({});

/** 返回上一页（无历史记录时兜底回首页，避免按钮点了没反应） */
const go_back = () => {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    router.push({name: 'home'});
  }
};

/** 初始化 / 切换用户时重置所有状态，避免上一个用户的数据残留 */
const init = async () => {
  user.value = undefined;
  follow.value = {follower_count: 0, followee_count: 0, is_following: false, like_count: 0};
  followLoaded.value = false;
  loadingUser.value = true;
  posts.value = [];
  followees.value = [];
  followers.value = [];
  hasMore.value = true;
  loading.value = false;
  activeTab.value = '1';

  const u = username.value;
  if (!u) return;
  try {
    // 资料与关注数并行拉取；关注数接口偶发失败不应阻断资料展示
    const [userRes, followRes] = await Promise.all([
      instance.get(apiUrls.get_account(u)),
      instance.get(apiUrls.get_account_follow(u)).catch(() => null),
    ]);
    user.value = userRes.data as IAccount;
    if (followRes?.data) {
      follow.value = followRes.data as IFollow;
    }
  } catch (e) {
    logger.error('加载用户资料失败', e);
    await MessagePlugin.error('加载用户资料失败');
  } finally {
    followLoaded.value = true;
    loadingUser.value = false;
  }
};

// 同一路由不同 username 跳转 → 重新初始化
watch(username, () => {
  void init();
});

/** 帖子列表「加载更多」：以当前列表最后一条的 post_id 作为游标向后分页 */
const onLoadMorePosts = async () => {
  if (loading.value || !hasMore.value) return;
  loading.value = true;
  const last = posts.value.at(-1);
  try {
    const r: any = await get_accounts_posts(10, last?.post_id ?? null, username.value);
    if (r.data.total === 0) {
      hasMore.value = false;
      await MessagePlugin.info('没有更多内容了');
      return;
    }
    const combined = [...posts.value, ...r.data.items];
    // 按 post_id 去重（游标分页可能重叠），再按时间倒序
    const map = new Map<string, IPost>();
    for (const item of combined) map.set(item.post_id, item);
    posts.value = Array.from(map.values()).sort(compareByTimeDesc);
    if (r.data.items.length < 10) hasMore.value = false;
  } catch (e) {
    logger.error('加载帖子失败', e);
  } finally {
    loading.value = false;
  }
};

/** 关注 / 粉丝列表加载（后端未实现时静默降级） */
const onLoadMoreFollow = async (type: 'followers' | 'followees') => {
  if (loading.value) return;
  loading.value = true;
  const list = type === 'followers' ? followers : followees;
  try {
    const url = type === 'followers' ? apiUrls.get_followers(username.value) : apiUrls.get_followees(username.value);
    const r: any = await instance.get(url, {
      params: {limit: 30},
      customOptions: {hideError: true},
    } as AxiosRequestConfig);
    const items = (r.data?.items ?? []) as IAccount[];
    items.forEach((a) => {
      if (a.account_id && listFollowMap[a.account_id] === undefined) {
        listFollowMap[a.account_id] = !!a.is_following;
      }
    });
    list.value = items;
  } catch (e) {
    // 关系列表接口大概率是后续才补的，失败不要弹错误，直接空着即可
    logger.warn('关注列表加载失败（可能后端未实现）', e);
  } finally {
    loading.value = false;
  }
};

/** Tab 切换回调：首次进入某面板且数据为空时自动加载 */
const onTabChange = async (val: string | number) => {
  activeTab.value = String(val);
  if (val === '2' && posts.value.length === 0) {
    await onLoadMorePosts();
  } else if (val === '3' && followees.value.length === 0) {
    await onLoadMoreFollow('followees');
  } else if (val === '4' && followers.value.length === 0) {
    await onLoadMoreFollow('followers');
  }
};

/** 点击统计数字直接跳到对应 Tab */
const goTab = (tab: string) => {
  void onTabChange(tab);
};

/** 关注 / 取消关注（乐观更新 + 失败回滚） */
const onFollow = async () => {
  if (!followLoaded.value) return;
  const target = !follow.value.is_following;
  // 乐观更新：先改 UI，再发请求
  follow.value.is_following = target;
  const delta = target ? 1 : -1;
  follow.value.followee_count += delta;
  try {
    if (target) {
      await instance.post(apiUrls.post_follow(), {
        follower_id: appStore.useAccountStore.account.account_id,
        followee_id: username.value,
      });
      await MessagePlugin.success('关注成功');
    } else {
      await instance.delete(apiUrls.delete_follow(appStore.useAccountStore.account.account_id, username.value));
      await MessagePlugin.success('取消关注成功');
    }
  } catch (e) {
    // 失败回滚
    follow.value.is_following = !target;
    follow.value.followee_count -= delta;
    logger.error('关注操作失败', e);
    await MessagePlugin.error('操作失败，请重试');
  }
};

/** 关系列表里逐项的关注 / 取关 */
const toggleListFollow = async (a: IAccount) => {
  if (!a.account_id) return;
  const target = !listFollowMap[a.account_id];
  listFollowMap[a.account_id] = target;
  try {
    if (target) {
      await instance.post(apiUrls.post_follow(), {
        follower_id: appStore.useAccountStore.account.account_id,
        followee_id: a.account_id,
      });
    } else {
      await instance.delete(apiUrls.delete_follow(appStore.useAccountStore.account.account_id, a.account_id));
    }
  } catch (e) {
    listFollowMap[a.account_id] = !target;
    logger.error('关注操作失败', e);
  }
};

const goUser = (a: IAccount) => {
  if (a.account_id) router.push({name: 'user', params: {username: a.account_id}});
};

const editProfile = () => router.push({name: 'settings'});
const messageUser = () => MessagePlugin.info('私信功能开发中');

const asyncLoading = computed<ListProps['asyncLoading']>(() => {
  if (loading.value) return 'loading';
  if (hasMore.value) return 'load-more';
  return '没有更多数据了';
});

/** 账户状态：优先用后端 is_active，缺失时默认「正常」 */
const userStatus = computed(() =>
  user.value?.is_active === false ? '已封禁' : user.value?.is_active === true ? '正常' : '正常',
);

onMounted(() => {
  void init();
});
</script>

<template>
  <t-layout style="min-height: 100vh; text-align: center">
    <t-header :style="{width: '100%', 'background-color': 'white'}">
      <Header selected-keys="o" />
    </t-header>
    <t-content style="padding-top: 8px">
      <t-row justify="center">
        <t-col :md="6" :xs="12" :sm="12" style="text-align: start; background-color: white">
          <div class="profile-head">
            <t-button variant="text" @click="go_back">
              <template #icon>
                <rollback-icon />
              </template>
              返回
            </t-button>
            <div>
              <div class="title">用户中心</div>
              <div class="subtitle">可以查看用户资料</div>
            </div>
          </div>

          <!-- 首屏资料加载骨架 -->
          <t-skeleton
            v-if="loadingUser"
            style="padding: 16px"
            :row-col="[
              {width: isMobile ? '80px' : '120px', height: isMobile ? '80px' : '120px', borderRadius: '50%'},
              {width: '40%'},
              {width: '60%'},
            ]"
          />

          <template v-else-if="user">
            <t-row style="margin-top: 16px">
              <t-space>
                <UserAvatar :avatar="user?.avatar" :nickname="user?.nick_name" :size="isMobile ? '80px' : '120px'" />
                <t-space direction="vertical">
                  <h2>
                    {{ user?.nick_name }}<span class="uname">({{ username }})</span>
                  </h2>
                  <t-space>
                    <t-button v-if="!is_self" theme="primary" :disabled="!followLoaded" @click="onFollow">
                      {{ (follow?.is_following ?? false) ? '取消关注' : '加关注' }}
                    </t-button>
                    <t-button v-else theme="primary" @click="editProfile">编辑资料</t-button>
                    <t-button v-if="!is_self" variant="outline" @click="messageUser">
                      <template #icon>
                        <chat-icon />
                      </template>
                      私信
                    </t-button>
                    <t-popup trigger="hover">
                      <template #content>
                        <t-space direction="vertical">
                          <t-typography-text level="h4">扫一扫</t-typography-text>
                          <t-qrcode
                            :value="`${apiUrls.share_account_link(user?.account_id ?? '')}`"
                            level="H"
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
                  <t-space class="stats">
                    <span class="stat" @click="goTab('3')">
                      <b>{{ follow?.followee_count ?? 0 }}</b> 关注
                    </span>
                    <span class="stat" @click="goTab('4')">
                      <b>{{ follow?.follower_count ?? 0 }}</b> 粉丝
                    </span>
                    <span class="stat">
                      <b>{{ follow?.like_count ?? 0 }}</b> 赞
                    </span>
                  </t-space>
                </t-space>
              </t-space>
            </t-row>

            <t-tabs v-model="activeTab" @change="onTabChange" style="margin-top: 16px">
              <t-tab-panel value="1" label="资料" />
              <t-tab-panel value="2" label="帖子" />
              <t-tab-panel value="3" label="关注" />
              <t-tab-panel value="4" label="粉丝" />
            </t-tabs>

            <!-- 资料 -->
            <div v-if="activeTab === '1'" style="margin-top: 12px">
              <t-card>
                <t-descriptions title="用户信息" bordered>
                  <t-descriptions-item label="用户名">{{ user?.username }}</t-descriptions-item>
                  <t-descriptions-item label="电子邮箱">{{ user?.mail }}</t-descriptions-item>
                  <t-descriptions-item label="账户状态" :span="2">{{ userStatus }}</t-descriptions-item>
                  <t-descriptions-item label="出生日期">{{ user?.gmt_birth }}</t-descriptions-item>
                  <t-descriptions-item label="性别">{{ sex_code_map[user?.sex ?? 0] }}</t-descriptions-item>
                </t-descriptions>
              </t-card>
            </div>

            <!-- 帖子 -->
            <div v-else-if="activeTab === '2'">
              <t-list v-if="posts.length" split @load-more="onLoadMorePosts" :async-loading="asyncLoading">
                <t-list-item v-for="item in posts" :key="item.post_id">
                  <Post :post="item" style="width: 100%" />
                </t-list-item>
              </t-list>
              <t-empty v-else-if="!loading" description="暂无帖子" />
              <t-skeleton v-else :row-col="[3]" />
            </div>

            <!-- 关注 -->
            <div v-else-if="activeTab === '3'">
              <t-list v-if="followees.length" split>
                <t-list-item v-for="a in followees" :key="a.account_id" class="rel-row" @click="goUser(a)">
                  <t-list-item-meta :title="a.nick_name" :description="a.bio">
                    <template #image>
                      <UserAvatar :avatar="a.avatar" :nickname="a.nick_name" />
                    </template>
                  </t-list-item-meta>
                  <template #action>
                    <t-button
                      size="small"
                      :theme="listFollowMap[a.account_id] ? 'default' : 'primary'"
                      @click.stop="toggleListFollow(a)"
                    >
                      {{ listFollowMap[a.account_id] ? '已关注' : '关注' }}
                    </t-button>
                  </template>
                </t-list-item>
              </t-list>
              <t-empty v-else description="暂无关注" />
            </div>

            <!-- 粉丝 -->
            <div v-else>
              <t-list v-if="followers.length" split>
                <t-list-item v-for="a in followers" :key="a.account_id" class="rel-row" @click="goUser(a)">
                  <t-list-item-meta :title="a.nick_name" :description="a.bio">
                    <template #image>
                      <UserAvatar :avatar="a.avatar" :nickname="a.nick_name" />
                    </template>
                  </t-list-item-meta>
                  <template #action>
                    <t-button
                      size="small"
                      :theme="listFollowMap[a.account_id] ? 'default' : 'primary'"
                      @click.stop="toggleListFollow(a)"
                    >
                      {{ listFollowMap[a.account_id] ? '已关注' : '关注' }}
                    </t-button>
                  </template>
                </t-list-item>
              </t-list>
              <t-empty v-else description="暂无粉丝" />
            </div>
          </template>

          <t-empty v-else description="用户不存在或加载失败" />
        </t-col>
      </t-row>
    </t-content>
  </t-layout>
</template>

<style scoped>
.profile-head {
  border: 1px solid rgb(235, 237, 240);
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.title {
  font-size: 18px;
  font-weight: bold;
}
.subtitle {
  color: #666;
  font-size: 14px;
}
.uname {
  font-size: 16px;
  color: #888;
}
.stats {
  cursor: default;
}
.stat {
  cursor: pointer;
  padding: 0 4px;
}
.stat b {
  font-size: 16px;
}
.rel-row {
  cursor: pointer;
}
</style>
