<script lang="ts" setup>
import {ref, getCurrentInstance, onMounted} from 'vue';
import {MessagePlugin} from 'tdesign-vue-next';
import {SettingIcon} from 'tdesign-icons-vue-next';
import type {FormProps} from 'tdesign-vue-next';
import {md5} from 'js-md5';

import instance from '../services/';
import router from '../router';
import {apiUrls, update_self_account} from "@/services/api.ts";
import appStore from "@/stores";
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

const handleLogin: FormProps['onSubmit'] = async ({validateResult, firstError }) => {
  if (!(validateResult === true)) {
   await MessagePlugin.warning(firstError || '请输入登录信息');
    return;
  }

  let data = {
    "username": formData.value.username,
    "password": md5(formData.value.password)
  }
  let account_id;
  await instance.post(apiUrls.login(), data, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  }).then(((r: any) => {
    appStore.useAccountStore.update_token('access_token', r.data.access_token);
    appStore.useAccountStore.update_token('refresh_token', r.data.refresh_token);
    account_id = r.data.account_id;
    MessagePlugin.success("登录成功!")
    update_self_account(account_id);
    router.push(proxy.proxy.$route.query.redirect || '/');
  })).catch((err: any) => MessagePlugin.error(err?.response?.data?.detail || "接口地址不存在(404)"));

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
    MessagePlugin.error('请输入以 http:// 或 https:// 开头的有效地址');
    return;
  }

  if (val) {
    localStorage.setItem('CUSTOM_API_BASE_URL', val);
    MessagePlugin.success('保存成功，请刷新页面生效');
  } else {
    localStorage.removeItem('CUSTOM_API_BASE_URL');
    MessagePlugin.success('已恢复默认接口地址');
  }

  apiModalVisible.value = false;
};


// 测试连接
const onSearch = async (val: string) => {
  val = val.trim();
  if (!val) {
    await MessagePlugin.warning('请输入 API 地址');
    return;
  }
  if (!val.startsWith('http')) {
    await MessagePlugin.error('请输入以 http:// 或 https:// 开头的有效地址');
    return;
  }

  try {
    // 轻量测试连通性
    const testUrl = val.replace(/\/$/, '') + apiUrls.check_health();
    console.info(testUrl)
    await axios.get(testUrl, {timeout: 5000});
    MessagePlugin.success('连接成功！接口地址可用');
  } catch (err) {
    MessagePlugin.error('连接失败，请检查地址或网络');
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
    <div class="login-center" style="display:flex;justify-content:center;align-items:center;width:100%;height:100%">
      <t-card style="width: 400px" header-bordered>
        <!-- Logo区域 -->
        <template #title>
          <div style="display:flex;align-items:center;gap:8px">
            <img src="../assets/logo.svg" alt="logo" width="32"/>
            <t-typography-title level="h4" style="margin:0; line-height:16px;">请登录</t-typography-title>
          </div>
        </template>
        <template #actions>
          <t-tooltip content="如果默认后端地址不可用时,可以自行修改可用地址">
            <t-button variant="text" @click="setApiConfig">
              <SettingIcon/>
            </t-button>
          </t-tooltip>
        </template>
        <t-form ref="formRef" :data="formData" :rules="rules" @submit="handleLogin">
          <t-form-item label="用户名" name="username">
            <t-input v-model:value="formData.username" placeholder="请输入用户名"/>
          </t-form-item>
          <t-form-item label="密  码" name="password">
            <t-input v-model:value="formData.password" placeholder="请输入密码" type="password"/>
          </t-form-item>
          <t-divider>
            <t-link @click="goResetPwd">忘记密码？点此重置</t-link>
          </t-divider>
          <t-form-item>
            <div style="display:flex;gap:24px;justify-content:space-evenly;">
              <t-button theme="primary" type="submit">登录</t-button>
              <t-button theme="default" @click="handleRegister">注册</t-button>
            </div>
          </t-form-item>
        </t-form>
      </t-card>
    </div>
  </div>
  <!-- API 设置弹窗 -->
  <t-dialog
      v-model:visible="apiModalVisible"
      header="设置后端 API 接口地址"
      confirm-btn="保存"
      cancel-btn="取消"
      @confirm="handleOk"
  >
    <t-input v-model:value="customApiUrl" :placeholder="`例如:${config.API_BASE_URL}`">
      <template #suffix>
        <t-button theme="primary" @click="onSearch(customApiUrl)">测试连接</t-button>
      </template>
    </t-input>
    <div style="margin-top: 8px; font-size: 12px; color: #999;">
      留空并保存可恢复默认接口地址:{{ config.API_BASE_URL_ORI }}
    </div>
  </t-dialog>
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