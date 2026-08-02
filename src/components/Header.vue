<script setup lang="ts">
import {h, onMounted, ref} from "vue";
import {BellOutlined, HomeOutlined, MailOutlined, LogoutOutlined} from "@ant-design/icons-vue";
import appStore from "@/stores";
import router from "@/router";
import instance from "@/services";
import {apiUrls} from "@/services/api.ts";
import {message} from "ant-design-vue";

defineProps<{
  selectedKeys: string;
}>();

// 系统通知
const notices = ref([]);

onMounted(async () => {
  await instance.get(apiUrls.get_system_notices())
      .then((r: any) => notices.value = r.data.items)
      .catch((e: any) => message.error(e.data.detail));
});

// 退出登录
const logout = () => {
  // 跳转到登录页面
  router.push('login');
  appStore.useAccountStore.logout();
}
</script>

<template>
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
          :selected-keys="[selectedKeys,]"
          style="line-height: 64px; display: flex; justify-content: center;font-size: 16px; ">
        <a-menu-item key="s">
          <a-tooltip>
            <template #title>
              首页
            </template>
            <router-link to="/">
              <a-button type="text" style="width: 100px; height: 80%;">
                <HomeOutlined style="font-size: 20px"/>
              </a-button>
            </router-link>
          </a-tooltip>
        </a-menu-item>
        <!--        <a-menu-item key="2">-->
        <!--          <router-link to="/friends/">-->
        <!--            <a-button type="text" style="width: 100px; height: 80%;">-->
        <!--              <UserSwitchOutlined style="font-size: 20px"/>-->
        <!--            </a-button>-->
        <!--          </router-link>-->
        <!--        </a-menu-item>-->
        <!--        <a-menu-item key="3">-->
        <!--          <router-link to="hot">-->
        <!--            <a-button type="text" style="width: 100px; height: 80%;">-->
        <!--              <FireOutlined style="font-size: 20px"/>-->
        <!--            </a-button>-->
        <!--          </router-link>-->
        <!--        </a-menu-item>-->
      </a-menu>
    </a-col>
    <!-- User Info 右侧 -->
    <a-col :span="4">
      <a-space>
        <a-popover>
          <template #content>
            <a-list style="width: 300px" :data-source="notices">
              <template #renderItem="{ item }">
                <a-list-item>
                  <a-list-item-meta
                      :description="item.content?.text"
                  >
                    <template #title>
                      {{ item.title }}
                    </template>
                    <template #avatar>
                      <a-avatar :src="item.extra?.avatar"/>
                    </template>
                  </a-list-item-meta>
                </a-list-item>
              </template>
            </a-list>
          </template>
          <a-button type="text" shape="circle" size="large">
            <template #icon>
              <BellOutlined/>
            </template>
          </a-button>
        </a-popover>
        <a-dropdown :trigger="['click']">
          <a class="ant-dropdown-link" @click.prevent>
            <a-avatar :src="appStore.useAccountStore.account?.avatar " :size="40"/>
            <span style="margin-left: 8px;">{{ appStore.useAccountStore.account?.nick_name }}</span>
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
                <a-button href="/" :icon="h(LogoutOutlined)" type="text" style="width: 100%; text-align: start"
                          @click="logout">退出登录
                </a-button>
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </a-space>
    </a-col>
  </a-row>
</template>

<style scoped>

</style>