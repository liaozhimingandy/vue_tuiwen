<script setup lang="ts">
import {onMounted, ref, watch, computed} from "vue";
import {useRoute} from 'vue-router';
import type { ListProps } from 'tdesign-vue-next';
import {MessagePlugin} from 'tdesign-vue-next';
import Header from "@/components/Header.vue";
import instance from "@/services";
import {apiUrls} from "@/services/api.ts";

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
      await MessagePlugin.warning("未搜索到内容!");
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

const asyncLoading = computed<ListProps['asyncLoading']>(() => {
 if (loading.value) {
    return 'loading';
  }
  if (hasMore.value) {
    return 'load-more';
  }
  // 全部加载完成，自定义提示文字
  return '没有更多数据了';
})
</script>

<template>
  <t-layout>
    <t-header>
      <Header selected-keys="none"/>
    </t-header>
    <t-content>
      <t-row justify="center">
        <t-col :span="8">
          <t-list split @load-more="onMore" :async-loading="asyncLoading">
            <t-list-item v-for="item in items" :key="item.key">
              <t-list-item-meta :image="item.avatar" :title="item.username" :description="item.username"/>
              <template #action>
                <t-link theme="primary" :href="`${apiUrls.share_account_link(item.account_id)}`" hover="color" style="margin-left: 16px">查看更多</t-link>
              </template>
            </t-list-item>
            <t-empty v-if="items.length == 0"/>
          </t-list>
        </t-col>
      </t-row>
    </t-content>
    <t-footer>  © {{ new Date().getFullYear() }} -tuiwen </t-footer>
  </t-layout>
</template>

<style scoped>
</style>
