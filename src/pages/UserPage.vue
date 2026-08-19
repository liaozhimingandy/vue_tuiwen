<script setup lang="ts">
import {h, ref, onMounted, computed} from 'vue';
import {useRoute} from 'vue-router';
import {ShareAltOutlined, SettingOutlined, EditOutlined, EllipsisOutlined} from '@ant-design/icons-vue';
import Header from "../components/Header.vue";
import instance from "@/services";
import type {IAccount, IPost} from "@/interface";
import {IdCardH} from "@icon-park/vue-next";
import {sex_code_map} from "@/common/constants.js";
import {apiUrls, get_accounts_posts, get_posts} from "@/services/api.ts";
import Post from "@/components/Post.vue";
import {message} from "ant-design-vue";
import appStore from "@/stores";

const activeKey = ref('1');
const route = useRoute();
const username = route.params.username;
const follow = ref({
  follower_count: 0,
  followee_count: 0,
  like_count: 0,
}); // 关注信息
// 查询的用户信息
let user = ref<IAccount>();
const go_back = () => {
  window.history.back();
}
// 是否为本人
const is_self = computed(() => {
  return user.value?.account_id === appStore.useAccountStore.account.account_id;
})
const desc = ref<string>('个人简介');

onMounted(() => {
  //   查询用户信息
  instance.get(apiUrls.get_account(username)).then((r: any) => {
    r.data.sex = r.data.sex + '';
    user.value = r.data as IAccount;
  });
  // 查询帐户粉丝情况
  instance.get(apiUrls.get_account_follow(username)).then((r: any) => follow.value = r.data);
})

const postLoaded = ref(false);
const postLoading = ref(false);
const posts = ref<IPost[]>([]);

const handleTabChange = async (key: string) => {
  // 切换到帖子tab，且未加载过帖子数据
  if (key === '2' && !postLoaded.value) {
    postLoading.value = true
    await onLoadMore();
    postLoaded.value = true // 标记已加载，下次切换不再请求
    postLoading.value = false
    }
  // key=1 资料页无需额外请求，页面onMounted已加载
}

const onLoadMore = async()=>{
    let post = posts.value.at(-1);
    let r = await get_accounts_posts(10, post?.post_id ?? null, route.params.username);
    if(r.data.total == 0){
      message.info("没有数据可以拉取了")
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
  // .catch((e: any) => message.error(`拉取数据失败:${e}`));
}

</script>

<template>
  <a-layout style="min-height: 100vh; text-align: center;">
    <a-layout-header ref="headerRef" :style="{width: '100%', 'background-color': 'white'}">
      <Header selected-keys="o"/>
    </a-layout-header>
    <a-layout-content style="padding-top: 8px;">
      <a-row justify="center">
        <a-col :span="12" style="text-align: start; background-color: white">
          <a-page-header
              style="border: 1px solid rgb(235, 237, 240)"
              title="用户中心"
              sub-title="可以查看用户资料"
              @back="() => go_back()"
          />
          <a-row justify="space-between" align="bottom">
            <a-space>
              <a-avatar
                  :src="user?.avatar"
                  :size="140"
                  fallback="data:image/png;base64,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"/>
              <a-space direction="vertical">
                <h2>{{ user?.nick_name }}<span style="font-size: 16px">({{ username }})</span></h2>
                <a-space>
                  <a-button v-show="!is_self" type="primary">
                    关注
                  </a-button>
                  <a-popover title="扫码分享">
                    <template #content>
                      <t-qrcode :value="`${apiUrls.share_account_link(user?.account_id)}`" level="H"
                                style="margin: 0 auto;" type="svg"/>
                    </template>
                    <a-button :icon="h(ShareAltOutlined)" type="dashed">分享</a-button>
                  </a-popover>

                </a-space>
                <a-space direction="horizontal">
                  <a-statistic :value="follow.followee_count">
                    <template #suffix>
                      <span style="font-size: 16px;color: gray">关注</span>
                    </template>
                  </a-statistic>
                  <a-statistic :value="follow.follower_count">
                    <template #suffix>
                      <span style="font-size: 16px;color: gray">粉丝</span>
                    </template>
                  </a-statistic>
                  <a-statistic :value="follow.like_count">
                    <template #suffix>
                      <span style="font-size: 16px;color: gray">获赞</span>
                    </template>
                  </a-statistic>
                </a-space>
                <a-typography-paragraph v-if="false" v-model:content="desc" editable style="width: 40vw"/>
              </a-space>
            </a-space>
            <!--            <a-space>-->
            <!--               <a-button :icon="h(EditOutlined)" type="text"></a-button>-->
            <!--            </a-space>-->
          </a-row>
          <a-tabs v-model:activeKey="activeKey" size="large" @change="handleTabChange">
            <a-tab-pane key="1">
              <template #tab>
                <span>
                <id-card-h theme="outline" fill="#333"/>
                <a-typography-text>资料</a-typography-text>
                  </span>
              </template>
              <a-card>
                <a-descriptions title="用户信息" bordered :column="2">
                  <a-descriptions-item label="用户名">{{ user?.username }}</a-descriptions-item>
                  <a-descriptions-item label="电子邮箱">{{ user?.email }}</a-descriptions-item>
                  <a-descriptions-item label="账户目前状态" :span="2">
                    <a-badge status="processing" text="正常"/>
                  </a-descriptions-item>
                  <a-descriptions-item label="出生日期">{{ user?.gmt_birth }}</a-descriptions-item>
                  <a-descriptions-item label="性别">{{ sex_code_map[user?.sex] }}</a-descriptions-item>
                </a-descriptions>
              </a-card>
            </a-tab-pane>
            <a-tab-pane key="2" tab="帖子">
              <a-spin :spinning="postLoading">
                <a-card v-if="posts.length < 1">
                  <a-empty description="暂无帖子"/>
                </a-card>
                <a-list :data-source="posts"  item-layout="horizontal" :loading="!postLoaded">
                  <template #loadMore>
                    <div
                        :style="{ textAlign: 'center', marginTop: '12px', height: '32px', lineHeight: '32px' }"
                    >
                      <a-button @click="onLoadMore">加载更多</a-button>
                    </div>
                  </template>
                  <template #renderItem="{ item }">
                    <a-list-item>
                      <Post :post="item" style="width: 100%"/>
                    </a-list-item>
                  </template>

                </a-list>
                <!--              <Post v-for="post in posts" style="padding-top: 2px" :post="post"/>-->
                <!--                <a-list :grid="{ gutter: 16, column: 2 }" :data-source="posts">-->
                <!--                  <template #renderItem="{ item }">-->
                <!--                    <a-list-item>-->
                <!--                      <a-card hoverable style="width: 300px">-->
                <!--                        <template #cover>-->
                <!--                          <img-->
                <!--                              alt="example"-->
                <!--                              src="https://gw.alipayobjects.com/zos/rmsportal/JiqGstEfoWAOHiTxclqi.png"-->
                <!--                          />-->
                <!--                        </template>-->
                <!--                        <template #actions>-->
                <!--                          <setting-outlined key="setting"/>-->
                <!--                          <edit-outlined key="edit"/>-->
                <!--                          <ellipsis-outlined key="ellipsis"/>-->
                <!--                        </template>-->
                <!--                        <a-card-meta :title="item.content.text">-->
                <!--                        </a-card-meta>-->
                <!--                      </a-card>-->
                <!--                    </a-list-item>-->
                <!--                  </template>-->
                <!--                </a-list>-->

              </a-spin>
            </a-tab-pane>
          </a-tabs>

        </a-col>
      </a-row>
    </a-layout-content>
  </a-layout>
</template>

<style scoped>

</style>