<script setup lang="ts">
import {onMounted, ref, watch} from "vue";
import {useRoute} from 'vue-router';

import Header from "@/components/Header.vue";
import instance from "@/services";
import {apiUrls} from "@/services/api.ts";
import {message} from "ant-design-vue";

const route = useRoute()

const initLoading = ref(false);
const loading = ref(false);
const items = ref<any[]>([]);

// 分页配置
const limit = 5;
const offset = ref(0);
const hasMore = ref(true); // 是否还有下一页

/**
 * 核心搜索函数
 * @param q 搜索关键词
 * @param isLoadMore 是否是“加载更多”（true=追加，false=重置列表）
 */
const doSearch = async (q: string, isLoadMore = false) => {
  if (!isLoadMore) {
    initLoading.value = true;
    offset.value = 0; // 新关键词，页码重置
    hasMore.value = true;
  } else {
    loading.value = true;
  }

  try {
    const res: any = await instance.get(apiUrls.search_account(q), {
      params: {
        offset: offset.value,
        limit
      }
    });
    const list = res.data.items || [];

    if (isLoadMore) {
      // 加载更多：追加
      items.value.push(...list);
    } else {
      // 新搜索：覆盖
      items.value = [...list];
    }

    // 判断是否还有数据
    if (list.length < limit) {
      hasMore.value = false;
    }

  } catch (err) {
    if (!isLoadMore) {
      items.value = [];
      message.info("未搜索到内容!");
    }
    hasMore.value = false;
  } finally {
    initLoading.value = false;
    loading.value = false;
  }
};

// 加载更多
const onMore = async () => {
  if (loading.value || !hasMore.value) return;
  const q = (route.query.q as string ?? '').trim();
  if (!q) return;

  offset.value += limit;
  await doSearch(q, true);
};

// 监听搜索关键词变化 → 重新第一页搜索
watch(
  () => route.query.q,
  (newQ) => {
    const q = (newQ as string ?? '').trim();
    if (q) {
      doSearch(q);
    } else {
      items.value = [];
      hasMore.value = false;
    }
  },
  {immediate: true}
)

onMounted(async () => {
  if (loading.value || !hasMore.value) return;
  const q = (route.query.q as string ?? '').trim();
  if (!q) return;
  await doSearch(q)
})
</script>

<template>
  <a-layout style="min-height: 100vh;">
    <a-layout-header :style="{width: '100%', 'background-color': 'white'}">
      <Header selected-keys="none"/>
    </a-layout-header>
    <a-layout-content style="padding-top: 8px">
      <a-row>
        <a-col :md="{ span: 12, offset: 6 }" :xs="24" style="padding:0 8px">
          <a-list
            :loading="initLoading"
            item-layout="horizontal"
            :data-source="items"
          >
            <template #loadMore>
              <div
                v-if="!initLoading"
                :style="{ textAlign: 'center', marginTop: '12px', height: '32px', lineHeight: '32px' }"
              >
                <a-button
                  v-if="hasMore"
                  :loading="loading"
                  @click="onMore"
                >
                  加载更多
                </a-button>
                <span v-else style="color:#999">没有更多数据了</span>
              </div>
            </template>
            <template #renderItem="{ item }">
              <a-list-item>
                <template #actions>
                  <a key="link" :href="`${apiUrls.share_account_link(item.account_id)}`">查看更多</a>
                </template>
                <a-skeleton avatar :title="false" :loading="!!item.loading" active>
                  <a-list-item-meta
                    :description="item.username"
                  >
                    <template #title>
                      <a>{{ item.nick_name }}</a>
                    </template>
                    <template #avatar>
                      <a-avatar :src="item.avatar"/>
                    </template>
                  </a-list-item-meta>
                  <div>{{ item.bio }}</div>
                </a-skeleton>
              </a-list-item>
            </template>
          </a-list>
        </a-col>
      </a-row>
    </a-layout-content>
  </a-layout>
</template>

<style scoped>
</style>
