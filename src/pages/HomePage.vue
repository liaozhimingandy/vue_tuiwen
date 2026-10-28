<!--
  文件：HomePage.vue
  用途：首页信息流，展示关注/推荐推文，支持上拉加载、返回顶部、定时刷新
  路由：/ （name: 'home'）
  数据来源：get_posts 分页拉取推文；update_self_account 获取当前用户信息
  主要交互：
    1. 顶部 Header + 左侧功能菜单（用户中心 / 设置）
    2. 中部信息流：发布框 + 推文列表，滚动触底自动加载更多
    3. 每 5 分钟轮询最新数据；页面切到后台时暂停轮询
    4. 轮询到新推文时不直接插入，而是提示「N 条新推文」由用户决定何时查看
-->
<script setup lang="ts">
import {ref, computed, onMounted, onBeforeUnmount} from 'vue';
import {storeToRefs} from 'pinia';
import {debounce} from 'lodash';
import {useRouter} from 'vue-router';
import type {MenuProps} from 'tdesign-vue-next';
import {MessagePlugin} from 'tdesign-vue-next';
import {ArrowUpIcon, SettingIcon, UserCircleIcon} from 'tdesign-icons-vue-next';
import {CScrollbar} from 'c-scrollbar'; // 滚动条

import instance from '@/services/';
import NewPost from '@/components/NewPost.vue';
import type {IPost} from '@/interface';
import Post from '@/components/Post.vue';
import Header from '../components/Header.vue';
import appStore from '@/stores';
import {logger} from '@/common/utils.ts';
import {useDeviceWatcher} from '@/common/device.ts';
import {apiUrls, update_self_account, get_posts} from '@/services/api.ts';

/** 移动端断点统一取自 common/device.ts，避免页面里再维护一份 window.innerWidth 判断 */
const {isMobile} = useDeviceWatcher();

const headerRef = ref<any>(null);
const scrollbarRef = ref<any>(null);
const contentHeight = ref<number | undefined>(window.innerHeight);

// 推文列表（来自全局 Store，供 Post 组件与发布框共用）
const {posts} = storeToRefs(appStore.usePostStore);

const router = useRouter();

/**
 * 计算滚动容器高度：视口高度 - 顶部 Header 高度 - 间距
 * Header 还没渲染出来时按 0 处理，避免读 `.offsetHeight` 抛错
 */
const updateContentHeight = () => {
  const headerEl = headerRef.value?.$el ?? headerRef.value;
  const headerHeight = headerEl?.offsetHeight ?? 0;
  contentHeight.value = window.innerHeight - headerHeight - 12;
};

/* ==================== 新推文提示 ==================== */

/**
 * 轮询到、但用户还没主动查看的新推文
 *
 * 为什么不当场插进列表：插进列表会把用户正在读的内容往下顶，
 * 配合成功提示还会每 5 分钟弹一次 toast。改为先攒着，由用户点击后再合并。
 */
const pending_posts = ref<IPost[]>([]);
/** 待读提示的保留上限：长时间挂后台时避免无限累积 */
const MAX_PENDING_POSTS = 50;

/** 把待读的新推文合并进列表，并回到顶部 */
const applyPendingPosts = () => {
  if (!pending_posts.value.length) return;
  appStore.usePostStore.addPosts(pending_posts.value);
  pending_posts.value = [];
  scrollToTop();
};

/* ==================== 列表加载 ==================== */

/** 是否正在加载下一页（防止触底抖动叠加出多份请求） */
const loadingMore = ref(false);

/**
 * 向下加载更多推文：以列表最后一条的 post_id 为游标分页拉取
 * @param notifyEmpty 空结果是否提示（首屏静默，用户主动触发时才提示）
 */
const get_post = async (notifyEmpty = true) => {
  if (loadingMore.value) return;
  loadingMore.value = true;
  try {
    const cursor = posts.value.at(-1)?.post_id ?? null;
    // 每次拉取 10 条；post_id 为上一页最后一条，null 表示从头开始
    const r: any = await get_posts(10, cursor);
    const items = (r.data?.items ?? []) as IPost[];
    if (!items.length) {
      if (notifyEmpty) await MessagePlugin.info('没有数据可以拉取了');
      return;
    }
    appStore.usePostStore.addPosts(items);
  } catch (e) {
    logger.error('加载更多推文失败', e);
  } finally {
    loadingMore.value = false;
  }
};

/**
 * 拉取最新推文（轮询用）
 *
 * 只把「本地列表里没有的」攒进 pending_posts，静默执行、不弹提示。
 */
const get_past_latest = async () => {
  try {
    const r: any = await instance.get(apiUrls.get_posts_latest());
    const items = (r.data?.items ?? []) as IPost[];
    if (!items.length) return;
    const known = new Set(posts.value.map((p) => p.post_id));
    const fresh = items.filter((p) => !known.has(p.post_id));
    if (!fresh.length) return;
    // 合并而非覆盖：原实现 `pending_posts.value = fresh` 会把上一批还没被查看的
    // 提示直接冲掉，若下一批 latest 里不再包含它们，这些提示就永久消失了。
    // 这里新批次在前、按 post_id 去重，并设上限防止无限增长。
    const seen = new Set<string>();
    pending_posts.value = [...fresh, ...pending_posts.value]
      .filter((p) => {
        if (seen.has(p.post_id)) return false;
        seen.add(p.post_id);
        return true;
      })
      .slice(0, MAX_PENDING_POSTS);
  } catch (e) {
    logger.error('拉取最新推文失败', e);
  }
};

/* ==================== 滚动与返回顶部 ==================== */

// 处理滚动事件（防抖 200ms：触底加载要跟手，1s 会明显迟滞）
const handleScroll = debounce((event: Event) => {
  const target = event.target as HTMLElement;
  const {scrollTop, scrollHeight, clientHeight} = target;
  // 触底判定：距底部不足 20px 时拉取下一页（无限滚动）
  if (scrollTop + clientHeight >= scrollHeight - 20) {
    get_post();
  }
}, 200);

/** 返回顶部 */
const scrollToTop = () => {
  if (!scrollbarRef.value) return;
  scrollbarRef.value.setScrollTop({top: 10, behavior: 'smooth'});
};

/* ==================== 定时轮询 ==================== */

// 存储轮询定时器id
const pollTimer = ref<number | null>(null);
// 5分钟 毫秒数（轮询间隔）
const POLL_TIME = 5 * 60 * 1000;
/** 本轮轮询是否还在进行：上一轮没返回就不再发起下一轮 */
const polling = ref(false);

// 启动定时轮询
const startPoll = () => {
  // 先清除旧定时器，避免多个定时器同时运行
  stopPoll();
  pollTimer.value = window.setInterval(async () => {
    if (polling.value) return;
    polling.value = true;
    try {
      // 两个请求互不依赖，并行发出
      await Promise.all([get_past_latest(), fetchHotList()]);
    } finally {
      polling.value = false;
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

/* ==================== 用户信息与热搜 ==================== */

/** 同步当前登录用户资料（失败不阻塞首屏渲染） */
const syncSelfAccount = async () => {
  const id = appStore.useAccountStore.account.account_id;
  if (!id) return;
  try {
    await update_self_account(id);
  } catch (e) {
    logger.error('同步当前用户资料失败', e);
  }
};

/** 热搜数据源（外部公开接口） */
const HOT_API = 'https://60s.viki.moe/v2/60s';
const list_hot = ref<string[]>([]);
/** 侧栏最多展示 10 条 */
const hotList = computed(() => list_hot.value.slice(0, 10));

/**
 * 拉取今日热搜
 *
 * 走的是第三方公开接口，失败必须静默降级——不能拖垮整个信息流，
 * 因此加了 8s 超时（AbortController），并把错误交给 logger 而不是裸 console。
 */
const fetchHotList = async () => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(HOT_API, {signal: controller.signal});
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    list_hot.value = Array.isArray(json?.data?.news) ? json.data.news : [];
  } catch (e) {
    logger.warn('热搜加载失败', e);
  } finally {
    clearTimeout(timer);
  }
};

/* ==================== 左侧菜单 ==================== */

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

/* ==================== 生命周期 ==================== */

onMounted(async () => {
  window.addEventListener('resize', updateContentHeight);
  updateContentHeight();

  // 首屏三个请求互不依赖，并行发出；任一失败都不影响其余
  await Promise.all([get_post(false), syncSelfAccount(), fetchHotList()]);

  // 启动5分钟自动轮询
  startPoll();
  // 监听页面标签切换，后台时暂停轮询（优化请求）
  document.addEventListener('visibilitychange', handlePageVisible);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateContentHeight);
  // 销毁组件：清除定时器 + 页面可见监听
  stopPoll();
  document.removeEventListener('visibilitychange', handlePageVisible);
  handleScroll.cancel();
});
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
        <t-col :md="{offset: 1, span: 5}" :xs="12" :sm="12">
          <c-scrollbar trigger="hover" class="content" @scroll="handleScroll" ref="scrollbarRef">
            <t-col :md="11">
              <!--
                新推文提示条：轮询到更新时先提示，不打断当前阅读位置。
                用 sticky 定位，用户滚动到任何位置都能看到。
              -->
              <button v-if="pending_posts.length" type="button" class="new-posts-tip" @click="applyPendingPosts">
                <arrow-up-icon />
                <span>{{ pending_posts.length }} 条新推文，点击查看</span>
              </button>
              <!--            发布推文输入框 -->
              <NewPost />
              <!-- 博客列表内容 -->
              <t-card v-if="posts.length < 1">
                <t-empty />
              </t-card>
              <!--
                必须带 :key：此前没写，Vue 只能按位置复用组件，
                列表头部插入新推文时会错位复用、并触发「重复 key」告警。
              -->
              <Post v-for="post in posts" :key="post.post_id" style="padding-top: 2px" :post="post" />
            </t-col>
          </c-scrollbar>
        </t-col>

        <!-- 推荐内容 (第三列) -->
        <t-col :md="3" v-if="!isMobile" style="padding-right: 16px">
          <c-scrollbar trigger="hover" class="content">
            <t-space direction="vertical" style="width: 100%">
              <t-alert message="禁止非法及不良言论" theme="warning" />
              <t-list header="今日热搜" :split="true">
                <t-list-item v-for="(item, index) in hotList" :key="item + index">
                  <!-- 左侧排名 -->
                  <span class="rank" :class="{top1: index === 0, top2: index === 1, top3: index === 2}"
                    >{{ index + 1 }}
                  </span>
                  <!-- 热搜标题，左对齐 -->
                  <!-- 标题：单行截断 + TDesign tooltip悬浮看全文 -->
                  <t-tooltip :content="item" placement="top">
                    <div class="hot-title">{{ item }}</div>
                  </t-tooltip>
                </t-list-item>
              </t-list>
            </t-space>
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

/* 新推文提示条：sticky 悬浮在信息流顶部 */
.new-posts-tip {
  position: sticky;
  top: 8px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 8px 12px;
  margin-bottom: 8px;
  border: none;
  border-radius: 16px;
  background: #027aff;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(2, 122, 255, 0.28);
  transition: opacity 0.2s ease;
}

.new-posts-tip:hover {
  opacity: 0.9;
}

.rank {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  background: #eee;
  flex-shrink: 0;
}

.rank.top1 {
  background: #f43f3f;
  color: #fff;
}

.rank.top2 {
  background: #ff7838;
  color: #fff;
}

.rank.top3 {
  background: #ffb800;
  color: #fff;
}

/* =========重点：单行截断，超长文字显示省略号========= */
.hot-title {
  flex: 1;
  color: #222;
  /* 单行截断三件套 */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
