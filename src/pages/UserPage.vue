<script setup lang="ts">
import {ref, computed, onMounted} from 'vue';
import {useRoute} from 'vue-router';

import Header from "../components/Header.vue";
import type {IAccount, IFollow, IPost} from "@/interface";
import {sex_code_map} from "@/common/constants.js";
import {apiUrls, get_accounts_posts, get_posts} from "@/services/api.ts";
import Post from "@/components/Post.vue";
import {type ListProps, MessagePlugin} from "tdesign-vue-next";
import appStore from "@/stores";
import {getResourceUrl, logger} from "@/common/utils.ts";
import instance from "@/services";

const activeKey = ref(1);
const route = useRoute();
const username = route.params.username;

// 用户信息
const user = ref<IAccount>();

const go_back = () => {
  window.history.back();
}
// 是否为本人
const is_self = computed(() => {
  return user.value?.account_id === appStore.useAccountStore.account.account_id;
})

const desc = ref<string>('个人简介');
const follow = ref<IFollow>();

onMounted(() => {
  //   查询用户信息
  instance.get(apiUrls.get_account(username)).then((r: any) => {
    user.value = r.data as IAccount;
  });

  // 查询帐户粉丝情况
  instance.get(apiUrls.get_account_follow(username)).then((r: any) => follow.value = r.data as IFollow);

})

const posts = ref<IPost[]>([]);

const onLoadMore = async () => {
  loading.value = true;
  let post = posts.value.at(-1);
  let r = await get_accounts_posts(10, post?.post_id ?? null, route.params.username);
  if (r.data.total == 0) {
    loading.value = false;
    hasMore.value = false;
    await MessagePlugin.info("没有数据可以拉取了")
    return;
  }
  const combined = [...posts.value, ...r.data.items]

  // Map 去重（保留最后出现的那条）
  const map = new Map()
  for (const item of combined) {
    map.set(item.post_id, item)
  }
  // 排序：最新在前
  posts.value = Array.from(map.values()).sort((a, b) => {
    return new Date(b.gmt_created).getTime() - new Date(a.gmt_created).getTime()
  })
  loading.value = false;
}

const onTabChange = async (val: number) => {

  // 切换到帖子面板，并且还没加载过数据
  if (val === 2 && posts.value.length == 0) {
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
})

const onFollow = async () => {
  //follower_id: 关注者 followee_id:被关注者
  if (!follow.value.is_following) {
    // 如果没有正在关注
    const data = {
      follower_id: appStore.useAccountStore.account.account_id,
      followee_id: username
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
}
</script>

<template>
  <t-layout style="min-height: 100vh; text-align: center;">
    <t-header ref="headerRef" :style="{width: '100%', 'background-color': 'white'}">
      <Header selected-keys="o"/>
    </t-header>
    <t-content style="padding-top: 8px;">
      <t-row justify="center">
        <t-col :span="6" style="text-align: start; background-color: white">
          <div style="border: 1px solid rgb(235, 237, 240); padding: 16px; display:flex;align-items:center;gap:8px;">
            <t-button variant="text" @click="go_back">← 返回</t-button>
            <div>
              <div style="font-size: 18px; font-weight:bold">用户中心</div>
              <div style="color:#666;font-size:14px">可以查看用户资料</div>
            </div>
          </div>

          <t-row style="margin-top:16px">
            <t-space>
              <t-avatar
                  :image="getResourceUrl(user?.avatar)"
                  size="140px"
                  fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3PTWBSGcbGzM6GCKqlIBRV0dHRJFarQ0eUT8LH4BnRU0NHR0UEFVdIlFRV7TzRksomPY8uykTk/zewQfKw/9znv4yvJynLv4uLiV2dBoDiBf4qP3/ARuCRABEFAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghggQAQZQKAnYEaQBAQaASKIAQJEkAEEegJmBElAoBEgghgg0Aj8i0JO4OzsrPv69Wv+hi2qPHr0qNvf39+iI97soRIh4f3z58/u7du3SXX7Xt7Z2enevHmzfQe+oSN2apSAPj09TSrb+XKI/f379+08+A0cNRE2ANkupk+ACNPvkSPcAAEibACyXUyfABGm3yNHuAECRNgAZLuYPgEirKlHu7u7XdyytGwHAd8jjNyng4OD7vnz51dbPT8/7z58+NB9+/bt6jU/TI+AGWHEnrx48eJ/EsSmHzx40L18+fLyzxF3ZVMjEyDCiEDjMYZZS5wiPXnyZFbJaxMhQIQRGzHvWR7XCyOCXsOmiDAi1HmPMMQjDpbpEiDCiL358eNHurW/5SnWdIBbXiDCiA38/Pnzrce2YyZ4//59F3ePLNMl4PbpiL2J0L979+7yDtHDhw8vtzzvdGnEXdvUigSIsCLAWavHp/+qM0BcXMd/q25n1vF57TYBp0a3mUzilePj4+7k5KSLb6gt6ydAhPUzXnoPR0dHl79WGTNCfBnn1uvSCJdegQhLI1vvCk+fPu2ePXt2tZOYEV6/fn31dz+shwAR1sP1cqvLntbEN9MxA9xcYjsxS1jWR4AIa2Ibzx0tc44fYX/16lV6NDFLXH+YL32jwiACRBiEbf5KcXoTIsQSpzXx4N28Ja4BQoK7rgXiydbHjx/P25TaQAJEGAguWy0+2Q8PD6/Ki4R8EVl+bzBOnZY95fq9rj9zAkTI2SxdidBHqG9+skdw43borCXO/ZcJdraPWdv22uIEiLA4q7nvvCug8WTqzQveOH26fodo7g6uFe/a17W3+nFBAkRYENRdb1vkkz1CH9cPsVy/jrhr27PqMYvENYNlHAIesRiBYwRy0V+8iXP8+/fvX11Mr7L7ECueb/r48eMqm7FuI2BGWDEG8cm+7G3NEOfmdcTQw4h9/55lhm7DekRYKQPZF2ArbXTAyu4kDYB2YxUzwg0gi/41ztHnfQG26HbGel/crVrm7tNY+/1btkOEAZ2M05r4FB7r9GbAIdxaZYrHdOsgJ/wCEQY0J74TmOKnbxxT9n3FgGGWWsVdowHtjt9Nnvf7yQM2aZU/TIAIAxrw6dOnAWtZZcoEnBpNuTuObWMEiLAx1HY0ZQJEmHJ3HNvGCBBhY6jtaMoEiJB0Z29vL6ls58vxPcO8/zfrdo5qvKO+d3Fx8Wu8zf1dW4p/cPzLly/dtv9Ts/EbcvGAHhHyfBIhZ6NSiIBTo0LNNtScABFyNiqFCBChULMNNSdAhJyNSiECRCjUbEPNCRAhZ6NSiAARCjXbUHMCRMjZqBQiQIRCzTbUnAARcjYqhQgQoVCzDTUnQIScjUohAkQo1GxDzQkQIWejUogAEQo121BzAkTI2agUIkCEQs021JwAEXI2KoUIEKFQsw01J0CEnI1KIQJEKNRsQ80JECFno1KIABEKNdtQcwJEyNmoFCJAhELNNtScABFyNiqFCBChULMNNSdAhJyNSiECRCjUbEPNCRAhZ6NSiAARCjXbUHMCRMjZqBQiQIRCzTbUnAARcjYqhQgQoVCzDTUnQIScjUohAkQo1GxDzQkQIWejUogAEQo121BzAkTI2agUIkCEQs021JwAEXI2KoUIEKFQsw01J0CEnI1KIQJEKNRsQ80JECFno1KIABEKNdtQcwJEyNmoFCJAhELNNtScABFyNiqFCBChULMNNSdAhJyNSiEC/wGgKKC4YMA4TAAAAABJRU5ErkJggg=="/>
              <t-space direction="vertical">
                <h2>{{ user?.nick_name }}<span style="font-size: 16px">({{ username }})</span></h2>
                <t-space>
                  <t-button v-show="!is_self" theme="primary" @click="onFollow">
                    {{ follow?.is_following ?? false ? '取消关注' : '加关注' }}
                  </t-button>
                  <t-popup trigger="hover">
                    <template #content>
                      <t-space direction="vertical">
                        <t-typography-text level="h4">扫一扫</t-typography-text>
                        <t-qrcode :value="`${apiUrls.share_account_link(user?.account_id)}`" level="H"
                                  style="margin: 0 auto;" type="svg"/>
                      </t-space>
                    </template>
                    <t-button variant="outline">
                      <template #icon>
                        <t-icon name="share"/>
                      </template>
                      分享
                    </t-button>
                  </t-popup>
                </t-space>
                <t-space>
                  <t-statistic :value="follow?.follower_count ?? 0" unit="关注">
                  </t-statistic>
                  <t-statistic :value="follow?.followee_count?? 0" unit="粉丝">
                  </t-statistic>
                  <t-statistic :value="follow?.like_count ?? 0" unit="赞">
                  </t-statistic>
                </t-space>
                <!-- 可编辑段落，保留原逻辑 -->
                <t-paragraph-text v-if="false" v-model:content="desc" editable style="width: 40vw"/>
              </t-space>
            </t-space>
          </t-row>

          <t-tabs :default-value="activeKey" @change="onTabChange">
            <t-tab-panel :value="1" label="资料">
              <t-card>
                <t-descriptions title="用户信息" bordered :column="2">
                  <t-descriptions-item label="用户名">{{ user?.username }}</t-descriptions-item>
                  <t-descriptions-item label="电子邮箱">{{ user?.email }}</t-descriptions-item>
                  <t-descriptions-item label="账户目前状态" :span="2">
                    正常
                  </t-descriptions-item>
                  <t-descriptions-item label="出生日期">{{ user?.gmt_birth }}</t-descriptions-item>
                  <t-descriptions-item label="性别">{{ sex_code_map[user?.sex] }}</t-descriptions-item>
                </t-descriptions>
              </t-card>
            </t-tab-panel>
            <t-tab-panel :value="2" label="帖子">
              <t-list split @load-more="onLoadMore" :async-loading="asyncLoading">
                <t-list-item v-for="item in posts" :key="item.key">
                  <Post :post="item" style="width: 100%"/>
                </t-list-item>
              </t-list>
            </t-tab-panel>
          </t-tabs>
        </t-col>
      </t-row>
    </t-content>
  </t-layout>
</template>

<style scoped>

</style>
