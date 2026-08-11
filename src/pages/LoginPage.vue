<script lang="ts" setup>
import {ref, getCurrentInstance, onMounted, h} from 'vue';
import {useRoute} from "vue-router";

import {message, Modal} from 'ant-design-vue';
import {md5} from 'js-md5';

import instance from '../services/';
import router from '../router';
import {apiUrls, update_self_account} from "@/services/api.ts";
import appStore from "@/stores";
import {SettingOutlined} from "@ant-design/icons-vue";
import {config} from "../common/config.ts";
import axios from "axios";

const proxy = getCurrentInstance();
const formRef = ref(null);
const formData = ref({
  username: '',
  password: '',
});
const rules = {
  username: [{required: true, message: '请输入用户名', trigger: 'blur'}],
  password: [{required: true, message: '请输入密码', trigger: 'blur'}],
};

onMounted(() => {
  if (appStore.useAccountStore.token.access_token) {
    router.push({name: "home"});
  }
})

const handleLogin = async () => {
  let data = {
    "username": formData.value.username,
    "password": md5(formData.value.password)
  }
  let account_id;
  await instance.post(apiUrls.login(), data, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  }).then((r: any) => {
    appStore.useAccountStore.update_token('access_token', r.data.access_token);
    appStore.useAccountStore.update_token('refresh_token', r.data.refresh_token);
    account_id = r.data.account_id;
    message.success("登录成功!")
  });
  await update_self_account(account_id);
  await router.push(proxy.proxy.$route.query.redirect || '/');
};

const handleRegister = () => {
  router.push({name: 'register'});
};

const goResetPwd = () => {
  router.push({name: "reset_password"})
}

// 弹窗显示状态
const apiModalVisible = ref(false);
// 输入的API地址
const customApiUrl = ref('');
// 打开设置
const setApiConfig = () => {
  customApiUrl.value = localStorage.getItem('CUSTOM_API_BASE_URL') || '';
  apiModalVisible.value = true;
};

// 保存API地址
const handleOk = () => {
  const val = customApiUrl.value.trim();

  if (val && !val.startsWith('http')) {
    message.error('请输入以 http:// 或 https:// 开头的有效地址');
    return;
  }

  if (val) {
    localStorage.setItem('CUSTOM_API_BASE_URL', val);
    message.success('保存成功，请刷新页面生效');
  } else {
    localStorage.removeItem('CUSTOM_API_BASE_URL');
    message.success('已恢复默认接口地址');
  }

  apiModalVisible.value = false;
};


// 测试连接
const onSearch = async (val: string) => {
  val = val.trim();
  if (!val) {
    message.warning('请输入 API 地址');
    return;
  }
  if (!val.startsWith('http')) {
    message.error('请输入以 http:// 或 https:// 开头的有效地址');
    return;
  }

  try {
    // 轻量测试连通性
    const testUrl = val.replace(/\/$/, '') + apiUrls.check_health();
    console.info(testUrl)
    await axios.get(testUrl, {timeout: 5000});
    message.success('连接成功！接口地址可用');
  } catch (err) {
    message.error('连接失败，请检查地址或网络');
    console.error(err);
  }
};
</script>

<template>
  <!-- 最外层容器：铺满屏幕、禁止滚动、相对定位 -->
  <div class="login-container">
    <!-- 背景装饰圆 -->
    <div class="circle circle-purple"></div>
    <div class="circle circle-teal"></div>

    <!-- 登录卡片居中 -->
    <a-flex class="login-center" justify="center" align="center">
      <a-card :hoverable="true" style="width: 400px">
        <!-- Logo区域 -->
        <template #title>
          <a-flex align="center">
            <img src="../assets/logo.svg" alt="logo" width="32"/>
            <a-typography-title :level="4" style="margin:0; line-height:16px;">请登录</a-typography-title>
          </a-flex>
        </template>
        <template #extra>
          <a-tooltip>
            <template #title>如果默认后端地址不可用时,可以自行修改可用地址</template>
            <a-button type="text" @click="setApiConfig">
              <SettingOutlined/>
            </a-button>
          </a-tooltip>
        </template>
        <a-form :model="formData" :rules="rules" ref="formRef" @finish="handleLogin">
          <a-form-item label="用户名" name="username">
            <a-input v-model:value="formData.username" placeholder="请输入用户名"/>
          </a-form-item>
          <a-form-item label="密码" name="password">
            <a-input-password v-model:value="formData.password" placeholder="请输入密码"/>
          </a-form-item>
          <a-divider>
            <a-button type="link" @click="goResetPwd">忘记密码？点此重置</a-button>
          </a-divider>
          <a-form-item>
            <a-flex size="large" justify="space-evenly">
              <a-button type="primary" html-type="submit">登录</a-button>
              <a-button @click="handleRegister">注册</a-button>
            </a-flex>
          </a-form-item>
        </a-form>
      </a-card>
    </a-flex>
  </div>
  <!-- API 设置弹窗 -->
  <a-modal
      v-model:open="apiModalVisible"
      title="设置后端 API 接口地址"
      ok-text="保存"
      cancel-text="取消"
      @ok="handleOk"
  >
    <a-input-search
        v-model:value="customApiUrl"
        :placeholder="`例如:${config.API_BASE_URL}`"
        loading
        @search="onSearch"
    >
      <template #enterButton>
        <a-button type="primary">测试连接</a-button>
      </template>
    </a-input-search>
    <div style="margin-top: 8px; font-size: 12px; color: #999;">
      留空并保存可恢复默认接口地址:{{ config.API_BASE_URL_ORI }}
    </div>
  </a-modal>
</template>

<style scoped>
/* 关键：铺满屏幕、隐藏滚动条、禁止内容撑开高度 */
.login-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  background-color: #E9EBEE;
  overflow: hidden; /* 核心：禁止滚动条 */
  margin: 0;
  padding: 0;
}

/* 让flex容器也占满 */
.login-center {
  width: 100%;
  height: 100%;
}

/* 背景圆形绝对定位，不占文档流 */
.circle {
  position: absolute;
  border-radius: 50%;
  z-index: 1;
}

.circle-purple {
  width: 32vw;
  height: 32vw;
  background: #027AFF;
  left: -12vw;
  bottom: -10vw;
}

.circle-teal {
  width: 30vw;
  height: 30vw;
  background: #8c6cd9;
  right: -10vw;
  top: -8vw;
}
</style>