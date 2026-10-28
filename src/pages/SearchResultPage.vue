<script setup lang="ts">
/**
 * 搜索结果页（SearchResultPage）
 *
 * 路由路径：/search?q=关键词（路由命名 name: 'search'）
 * 页面用途：按关键词检索「用户」与「帖子」，并内置搜索历史、热门搜索与搜索建议。
 * 数据来源：
 *   - 用户：apiUrls.search_account(q)（offset / limit 分页，可选 total 总数）
 *   - 帖子：apiUrls.search_post(q)（后端未实现时静默降级为「暂无结果」）
 *   - 热门搜索：复用首页的第三方公开热榜接口（8s 超时降级，失败不影响主流程）
 * 主要交互：
 *   1. 页内搜索框（预填地址栏 ?q，回车 / 点击触发），并同步更新地址栏；
 *   2. 输入时实时弹出「搜索建议」下拉（历史 + 热门匹配，支持键盘上下选择 / 回车 / ESC）；
 *   3. 空状态展示「搜索历史」（localStorage，可单条删除 / 清空）与「热门搜索」；
 *   4. 结果分「用户 / 帖子」双 Tab，用户结果整行可点进主页、行内可关注；
 *   5. 关键词在昵称 / 简介 / 正文中高亮；
 *   6. 列表触底「加载更多」，并带竞态防护（只接受最新一次请求的响应）；
 *   7. 结果区顶部展示已加载 / 命中总数。
 */
import {computed, onMounted, reactive, ref, watch} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {MessagePlugin} from 'tdesign-vue-next';
import {SearchIcon} from 'tdesign-icons-vue-next';

import Header from '@/components/Header.vue';
import instance from '@/services';
import {apiUrls} from '@/services/api.ts';
import UserAvatar from '../components/UserAvatar.vue';
import {timestampFormat, getEntityTime, logger} from '@/common/utils.ts';
import {useDeviceWatcher} from '@/common/device.ts';
import type {AxiosRequestConfig} from 'axios';
import appStore from '@/stores';

const route = useRoute();
const router = useRouter();
const {isMobile} = useDeviceWatcher();

/** 当前搜索词（受控输入，初始取自地址栏 ?q） */
const keyword = ref(((route.query.q as string) ?? '').trim());
/** 当前结果 Tab */
const activeTab = ref<'user' | 'post'>('user');
/** 是否已真正发起过一次搜索：未搜索前保持「历史 + 热门」空状态面板，避免一打字就切到空结果 */
const hasSearched = ref(keyword.value.trim() !== '');

/* ==================== 搜索历史（localStorage） ==================== */
const HISTORY_KEY = 'search_history';
const history = ref<string[]>([]);

const loadHistory = () => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    history.value = raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    history.value = [];
  }
};

const persistHistory = () => {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value));
  } catch {
    /* 隐私模式等写入失败，忽略 */
  }
};

/** 记一条历史（去重、置顶、最多保留 8 条） */
const pushHistory = (q: string) => {
  const q2 = q.trim();
  if (!q2) return;
  history.value = [q2, ...history.value.filter((h) => h !== q2)].slice(0, 8);
  persistHistory();
};

const clearHistory = () => {
  history.value = [];
  localStorage.removeItem(HISTORY_KEY);
};

const removeHistory = (q: string) => {
  history.value = history.value.filter((h) => h !== q);
  persistHistory();
};

/* ==================== 热门搜索（第三方热榜，静默降级） ==================== */
const HOT_API = 'https://60s.viki.moe/v2/60s';
const hotList = ref<string[]>([]);

const fetchHotList = async () => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(HOT_API, {signal: controller.signal});
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    hotList.value = Array.isArray(json?.data?.news) ? json.data.news.slice(0, 10) : [];
  } catch (e) {
    // 热搜属于锦上添花，失败必须静默，不能拖垮主流程
    logger.warn('热搜加载失败', e);
  } finally {
    clearTimeout(timer);
  }
};

/* ==================== 搜索建议下拉 ==================== */
interface SuggestItem {
  type: 'search' | 'item';
  text: string;
  fromHot: boolean;
}
const showSuggest = ref(false);
const activeIndex = ref(0);

/**
 * 建议列表：首条固定为「搜索 <当前输入>」，其后为历史 / 热门中与输入匹配的条目
 * （去重、最多 8 条）。纯前端派生，不依赖后端，输入即可见，提升搜索可达性。
 */
const suggestItems = computed<SuggestItem[]>(() => {
  const q = keyword.value.trim();
  if (!q) return [];
  const lower = q.toLowerCase();
  const historyHits = history.value
    .filter((h) => h.toLowerCase().includes(lower))
    .map((t) => ({type: 'item' as const, text: t, fromHot: false}));
  const hotHits = hotList.value
    .filter((h) => h.toLowerCase().includes(lower))
    .map((t) => ({type: 'item' as const, text: t, fromHot: true}));
  const seen = new Set<string>();
  const items = [...historyHits, ...hotHits]
    .filter((it) => {
      if (seen.has(it.text)) return false;
      seen.add(it.text);
      return true;
    })
    .slice(0, 8);
  return [{type: 'search', text: q, fromHot: false}, ...items];
});

const openSuggest = () => {
  if (!keyword.value.trim()) return;
  activeIndex.value = 0;
  showSuggest.value = true;
};

const closeSuggest = () => {
  showSuggest.value = false;
};

/** 输入框失焦：延时关闭，留出点击建议项的时间（mousedown 已 prevent 默认，不会先失焦） */
const onInputBlur = () => {
  window.setTimeout(() => {
    showSuggest.value = false;
  }, 150);
};

const moveSuggest = (dir: 1 | -1) => {
  const len = suggestItems.value.length;
  if (!len) return;
  showSuggest.value = true;
  activeIndex.value = (activeIndex.value + dir + len) % len;
};

/** 选中某条建议（或回车命中高亮项） */
const triggerSuggest = (idx: number) => {
  const it = suggestItems.value[idx];
  if (!it) return;
  showSuggest.value = false;
  submitSearch(it.text);
};

/** 回车：下拉可见且有高亮项则选中它，否则按当前输入发起搜索 */
const onEnter = () => {
  if (showSuggest.value && suggestItems.value.length && activeIndex.value >= 0) {
    triggerSuggest(activeIndex.value);
  } else {
    submitSearch();
  }
};

/* ==================== 数据 ==================== */
interface SearchUser {
  account_id: string;
  username?: string;
  nickname?: string;
  bio?: string;
  avatar?: string;
  [property: string]: any;
}

interface SearchPost {
  post_id: string;
  account_id: string;
  content?: {text?: string; [k: string]: any};
  /** 后端统一用 created_at */
  created_at?: string;
  [property: string]: any;
}

const userItems = ref<SearchUser[]>([]);
const postItems = ref<SearchPost[]>([]);
/** 命中总数：后端返回 total 时展示「找到 N 个」，否则退化为「已加载 N 个」 */
const userTotal = ref<number | null>(null);
const postTotal = ref<number | null>(null);
const limit = 10;
const userOffset = ref(0);
const postOffset = ref(0);
const userHasMore = ref(true);
const postHasMore = ref(true);
const initLoading = ref(false);
const loadingMore = ref(false);
/** 竞态防护：每次新搜索自增，只采纳与当前值一致的响应 */
const reqToken = ref(0);

/** 行内关注状态（按 account_id 记录，避免反复查接口） */
const followingMap = reactive<Record<string, boolean>>({});

const isSelf = (u: SearchUser) => u.account_id === appStore.useAccountStore.account.account_id;

/** 执行搜索（isLoadMore=true 表示追加下一页） */
const doSearch = async (isLoadMore = false) => {
  const q = keyword.value.trim();
  if (!q) return;
  const token = ++reqToken.value;

  if (!isLoadMore) {
    // 新关键词：记历史、重置两 Tab 的数据与分页
    hasSearched.value = true;
    pushHistory(q);
    initLoading.value = true;
    userOffset.value = 0;
    postOffset.value = 0;
    userItems.value = [];
    postItems.value = [];
    userTotal.value = null;
    postTotal.value = null;
    userHasMore.value = true;
    postHasMore.value = true;
  } else {
    loadingMore.value = true;
  }

  try {
    if (activeTab.value === 'user') {
      const res: any = await instance.get(apiUrls.search_account(q), {
        params: {offset: userOffset.value, limit},
      });
      if (token !== reqToken.value) return; // 已被更新的请求取代，丢弃过期响应
      const list = (res.data?.items ?? []) as SearchUser[];
      userItems.value = isLoadMore ? [...userItems.value, ...list] : list;
      userTotal.value = typeof res.data?.total === 'number' ? res.data.total : null;
      list.forEach((u) => {
        if (u.account_id && followingMap[u.account_id] === undefined) {
          followingMap[u.account_id] = false;
        }
      });
      if (list.length < limit) userHasMore.value = false;
    } else {
      // 帖子搜索后端可能尚未实现：用 hideError 压制全局错误弹窗，失败时降级为空
      const res: any = await instance.get(apiUrls.search_post(q), {
        params: {offset: postOffset.value, limit},
        customOptions: {hideError: true},
      } as AxiosRequestConfig);
      if (token !== reqToken.value) return;
      const list = (res.data?.items ?? []) as SearchPost[];
      postItems.value = isLoadMore ? [...postItems.value, ...list] : list;
      postTotal.value = typeof res.data?.total === 'number' ? res.data.total : null;
      if (list.length < limit) postHasMore.value = false;
    }
  } catch (err) {
    if (token !== reqToken.value) return;
    if (activeTab.value === 'user') {
      if (!isLoadMore) {
        userItems.value = [];
        userTotal.value = null;
        userHasMore.value = false;
        await MessagePlugin.warning('未搜索到相关用户');
      }
    } else {
      // 帖子搜索未实现 / 失败 → 静默降级为空结果
      postItems.value = [];
      postTotal.value = null;
      postHasMore.value = false;
    }
  } finally {
    if (token === reqToken.value) {
      initLoading.value = false;
      loadingMore.value = false;
    }
  }
};

/** 列表触底加载更多 */
const onLoadMore = () => {
  if (loadingMore.value) return;
  if (activeTab.value === 'user') {
    if (!userHasMore.value) return;
    userOffset.value += limit;
  } else {
    if (!postHasMore.value) return;
    postOffset.value += limit;
  }
  void doSearch(true);
};

/** Tab 切换：切到尚空的 Tab 时自动拉一次 */
const onTabChange = (val: string | number) => {
  activeTab.value = val === 'post' ? 'post' : 'user';
  const q = keyword.value.trim();
  if (!q) return;
  if (activeTab.value === 'user' && userItems.value.length === 0 && userHasMore.value) {
    void doSearch(false);
  } else if (activeTab.value === 'post' && postItems.value.length === 0 && postHasMore.value) {
    void doSearch(false);
  }
};

/** 触发一次搜索（来自页内输入框或历史 / 热搜 / 建议点击） */
const submitSearch = (q?: string) => {
  showSuggest.value = false;
  if (q !== undefined) keyword.value = q;
  const kw = keyword.value.trim();
  if (!kw) {
    hasSearched.value = false;
    userItems.value = [];
    postItems.value = [];
    userTotal.value = null;
    postTotal.value = null;
    userHasMore.value = true;
    postHasMore.value = false;
    router.replace({name: 'search'});
    return;
  }
  router.replace({name: 'search', query: {q: kw}});
  void doSearch(false);
};

// 监听地址栏 ?q：支持从顶栏搜索框 / 外部链接直接进入
watch(
  () => route.query.q,
  (newQ) => {
    const q = ((newQ as string) ?? '').trim();
    // 本页 submitSearch 已主动搜索，跳过避免重复请求
    if (q === keyword.value.trim()) return;
    keyword.value = q;
    if (q) {
      void doSearch(false);
    } else {
      hasSearched.value = false;
      userItems.value = [];
      postItems.value = [];
      userTotal.value = null;
      postTotal.value = null;
      userHasMore.value = true;
      postHasMore.value = false;
    }
  },
);

const goUser = (u: SearchUser) => {
  if (u.account_id) router.push({name: 'user', params: {username: u.account_id}});
};

const goPost = (p: SearchPost) => {
  if (p.post_id) router.push({name: 'post', params: {post_id: p.post_id}});
};

/** 列表内关注 / 取关（乐观更新 + 失败回滚） */
const toggleFollow = async (u: SearchUser) => {
  if (!u.account_id || isSelf(u)) return;
  const target = !followingMap[u.account_id];
  followingMap[u.account_id] = target;
  try {
    if (target) {
      // 关注者取自令牌，请求体只传 followee_id
      await instance.post(apiUrls.post_follow(), {
        followee_id: u.account_id,
      });
      await MessagePlugin.success('关注成功');
    } else {
      await instance.delete(apiUrls.delete_follow(u.account_id));
      await MessagePlugin.success('取消关注成功');
    }
  } catch (e) {
    followingMap[u.account_id] = !target; // 回滚
    logger.error('关注操作失败', e);
    await MessagePlugin.error('操作失败，请重试');
  }
};

/**
 * 关键词高亮：把文本切成「命中 / 未命中」片段返回，模板里逐段渲染。
 * 刻意不用 v-html，避免把用户输入拼进 HTML 造成 XSS。
 */
const highlight = (text: string, kw: string) => {
  const raw = text ?? '';
  const key = (kw ?? '').trim();
  if (!key) return [{text: raw, hit: false}];
  const lower = raw.toLowerCase();
  const lowerKey = key.toLowerCase();
  const parts: {text: string; hit: boolean}[] = [];
  let start = 0;
  let idx = lower.indexOf(lowerKey, start);
  while (idx !== -1) {
    if (idx > start) parts.push({text: raw.slice(start, idx), hit: false});
    parts.push({text: raw.slice(idx, idx + key.length), hit: true});
    start = idx + key.length;
    idx = lower.indexOf(lowerKey, start);
  }
  if (start < raw.length) parts.push({text: raw.slice(start), hit: false});
  return parts;
};

const showEmpty = computed(() => !hasSearched.value && !initLoading.value && !loadingMore.value);
const noResult = computed(() => {
  const q = keyword.value.trim();
  if (!q || !hasSearched.value || initLoading.value) return false;
  return activeTab.value === 'user' ? userItems.value.length === 0 : postItems.value.length === 0;
});

/** 结果计数文案：优先命中总数，否则展示已加载条数 */
const resultMeta = computed(() => {
  if (!hasSearched.value || initLoading.value) return '';
  if (activeTab.value === 'user') {
    return userTotal.value != null ? `找到 ${userTotal.value} 位用户` : `已加载 ${userItems.value.length} 位用户`;
  }
  return postTotal.value != null ? `找到 ${postTotal.value} 篇帖子` : `已加载 ${postItems.value.length} 篇帖子`;
});

const userAsyncLoading = computed(() => {
  if (loadingMore.value) return 'loading';
  if (userHasMore.value) return 'load-more';
  return '没有更多数据了';
});
const postAsyncLoading = computed(() => {
  if (loadingMore.value) return 'loading';
  if (postHasMore.value) return 'load-more';
  return '没有更多数据了';
});

onMounted(async () => {
  loadHistory();
  void fetchHotList();
  if (keyword.value.trim()) {
    void doSearch(false);
  }
});
</script>

<template>
  <t-layout>
    <t-header>
      <Header selected-keys="none" />
    </t-header>
    <t-content>
      <t-row justify="center">
        <t-col :span="isMobile ? 24 : 10">
          <!-- 页内搜索框 + 搜索建议下拉 -->
          <div class="search-bar">
            <div class="search-input-wrap">
              <t-input
                v-model="keyword"
                placeholder="搜索用户或帖子"
                clearable
                @focus="openSuggest"
                @blur="onInputBlur"
                @enter="onEnter"
                @keydown.down.prevent="moveSuggest(1)"
                @keydown.up.prevent="moveSuggest(-1)"
                @keydown.esc="closeSuggest"
              >
                <template #suffixIcon>
                  <search-icon class="search-icon" @click="submitSearch()" />
                </template>
              </t-input>

              <!-- 搜索建议下拉：首条为「搜索 <输入>」，其后为历史/热门匹配 -->
              <div v-if="showSuggest && keyword.trim()" class="suggest-pop">
                <div
                  v-for="(it, i) in suggestItems"
                  :key="i"
                  class="suggest-item"
                  :class="{active: i === activeIndex}"
                  @mouseenter="activeIndex = i"
                  @mousedown.prevent="triggerSuggest(i)"
                >
                  <span class="suggest-tag" :class="{hot: it.fromHot}">
                    {{ it.type === 'search' ? '搜索' : it.fromHot ? '热门' : '历史' }}
                  </span>
                  <span class="suggest-text">{{ it.text }}</span>
                </div>
              </div>
            </div>
            <t-button theme="primary" @click="submitSearch()">搜索</t-button>
          </div>

          <!-- 空状态：搜索历史 + 热门搜索（仅未发起搜索时展示） -->
          <div v-if="showEmpty" class="empty-panel">
            <div v-if="history.length" class="block">
              <div class="block-head">
                <span>搜索历史</span>
                <t-link theme="default" hover="color" @click="clearHistory">清空</t-link>
              </div>
              <div class="chips">
                <t-tag
                  v-for="h in history"
                  :key="h"
                  class="chip"
                  closable
                  @click="submitSearch(h)"
                  @close="removeHistory(h)"
                >
                  {{ h }}
                </t-tag>
              </div>
            </div>
            <div v-if="hotList.length" class="block">
              <div class="block-head"><span>热门搜索</span></div>
              <div class="hot-list">
                <div v-for="(h, i) in hotList" :key="h" class="hot-item" @click="submitSearch(h)">
                  <span class="rank" :class="{top: i < 3}">{{ i + 1 }}</span>
                  <span class="hot-text">{{ h }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 结果 -->
          <template v-else>
            <t-tabs v-model="activeTab" @change="onTabChange">
              <t-tab-panel value="user" label="用户" />
              <t-tab-panel value="post" label="帖子" />
            </t-tabs>

            <div v-if="resultMeta" class="result-meta">{{ resultMeta }}</div>

            <!-- 首屏加载骨架 -->
            <div v-if="initLoading" class="skeleton-wrap">
              <t-skeleton
                v-for="n in 4"
                :key="n"
                :row-col="[{width: '48px', height: '48px', borderRadius: '50%'}, {width: '60%'}, {width: '40%'}]"
              />
            </div>

            <!-- 用户结果 -->
            <t-list v-else-if="activeTab === 'user'" split @load-more="onLoadMore" :async-loading="userAsyncLoading">
              <t-list-item v-for="u in userItems" :key="u.account_id" class="user-row" @click="goUser(u)">
                <t-list-item-meta>
                  <template #image>
                    <UserAvatar :avatar="u.avatar" :nickname="u.nickname" />
                  </template>
                  <template #title>
                    <span class="meta-title">
                      <template v-for="(part, i) in highlight(u.nickname ?? '', keyword)" :key="i">
                        <mark v-if="part.hit" class="hl">{{ part.text }}</mark>
                        <template v-else>{{ part.text }}</template>
                      </template>
                    </span>
                  </template>
                  <template #description>
                    <span class="meta-desc">
                      <template v-for="(part, i) in highlight(u.bio ?? '', keyword)" :key="i">
                        <mark v-if="part.hit" class="hl">{{ part.text }}</mark>
                        <template v-else>{{ part.text }}</template>
                      </template>
                    </span>
                  </template>
                </t-list-item-meta>
                <template #action>
                  <t-button
                    size="small"
                    :theme="followingMap[u.account_id] ? 'default' : 'primary'"
                    :disabled="isSelf(u)"
                    @click.stop="toggleFollow(u)"
                  >
                    {{ followingMap[u.account_id] ? '已关注' : '关注' }}
                  </t-button>
                </template>
              </t-list-item>
            </t-list>

            <!-- 帖子结果 -->
            <t-list v-else split @load-more="onLoadMore" :async-loading="postAsyncLoading">
              <t-list-item v-for="p in postItems" :key="p.post_id" class="post-row" @click="goPost(p)">
                <t-list-item-meta>
                  <template #image>
                    <UserAvatar :avatar="undefined" :nickname="p.account_id" />
                  </template>
                  <template #title>
                    <span class="meta-title">@{{ p.account_id }}</span>
                  </template>
                  <template #description>
                    <div class="post-snippet">
                      <template v-for="(part, i) in highlight(p.content?.text ?? '', keyword)" :key="i">
                        <mark v-if="part.hit" class="hl">{{ part.text }}</mark>
                        <template v-else>{{ part.text }}</template>
                      </template>
                      <span class="post-time">{{ timestampFormat(getEntityTime(p) ?? '') }}</span>
                    </div>
                  </template>
                </t-list-item-meta>
              </t-list-item>
            </t-list>

            <t-empty
              v-if="noResult"
              :description="`未找到与“${keyword}”相关的${activeTab === 'user' ? '用户' : '帖子'}`"
            />
          </template>
        </t-col>
      </t-row>
    </t-content>
  </t-layout>
</template>

<style scoped>
.search-bar {
  display: flex;
  gap: 8px;
  margin: 12px 0;
}
.search-input-wrap {
  position: relative;
  flex: 1;
}
.search-icon {
  cursor: pointer;
}
.suggest-pop {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 20;
  background: var(--td-bg-color-container, #fff);
  border: 1px solid var(--td-component-border, #e7e7e7);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}
.suggest-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
}
.suggest-item.active,
.suggest-item:hover {
  background: var(--td-bg-color-container-hover, #f3f3f3);
}
.suggest-tag {
  flex: none;
  font-size: 12px;
  color: var(--td-text-color-placeholder, #999);
  border: 1px solid var(--td-component-border, #e7e7e7);
  border-radius: 4px;
  padding: 0 6px;
  line-height: 18px;
}
.suggest-tag.hot {
  color: #f5483b;
  border-color: #f5483b;
}
.suggest-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.empty-panel {
  margin-top: 16px;
}
.block {
  margin-bottom: 24px;
}
.block-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--td-text-color-primary, #1d2129);
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chip {
  cursor: pointer;
}
.hot-list {
  display: flex;
  flex-direction: column;
}
.hot-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 4px;
  cursor: pointer;
  border-radius: 6px;
}
.hot-item:hover {
  background: var(--td-bg-color-container-hover, #f3f3f3);
}
.rank {
  width: 20px;
  text-align: center;
  font-weight: 700;
  color: var(--td-text-color-placeholder, #999);
}
.rank.top {
  color: #f5483b;
}
.hot-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.result-meta {
  margin: 12px 0 4px;
  font-size: 13px;
  color: var(--td-text-color-secondary, #666);
}
.skeleton-wrap {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 16px;
}
.user-row,
.post-row {
  cursor: pointer;
}
.meta-title {
  font-weight: 600;
}
.meta-desc {
  color: var(--td-text-color-secondary, #666);
}
.hl {
  background: #fff2cc;
  color: #d4380d;
  padding: 0 1px;
  border-radius: 2px;
}
.post-snippet {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: var(--td-text-color-secondary, #666);
}
.post-time {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--td-text-color-placeholder, #999);
}
</style>
