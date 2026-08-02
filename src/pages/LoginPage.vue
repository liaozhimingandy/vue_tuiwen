<script lang="ts" setup>
import { ref, getCurrentInstance, onMounted } from 'vue';
import { useRoute } from "vue-router";

import { message } from 'ant-design-vue';
import { md5 } from 'js-md5';

import instance from '../services/';
import router from '../router';
import { apiUrls, update_self_account } from "@/services/api.ts";
import appStore from "@/stores";

const route = useRoute();
const proxy = getCurrentInstance();
const formRef = ref(null);
const formData = ref({
  username: '',
  password: '',
});
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
};

// 刷新请求令牌
const refreshAccessToken = async (refresh_token: string) => {
  const account_id = appStore.useAccountStore.account.account_id;
  await instance.get(apiUrls.update_token(account_id), {
    headers: {
      Authorization: "Bearer " + refresh_token,
    },
  }).then((r: any) => {
    appStore.useAccountStore.update_token('access_token', r.data.access_token);
  }).catch((e: any) => {
    message.error(`你的访问令牌过期了,请重新登录:${e}`);
  })
  await update_self_account(localStorage.getItem('account_id') || 'unknow');
  const redirect = route.query.redirect || '/';
  router.push(redirect);
}

onMounted(() => {
  if (appStore.useAccountStore.token.access_token) {
    router.push({ name: "home" });
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
  router.push({ name: 'register' });
};

const goResetPwd = () => {
  router.push({ name: "reset_password" })
}
</script>

<template>
  <!-- 最外层容器：铺满屏幕、禁止滚动、相对定位 -->
  <div class="login-container">
    <!-- 背景装饰圆 -->
    <div class="circle circle-purple"></div>
    <div class="circle circle-teal"></div>

    <!-- 登录卡片居中 -->
    <a-flex class="login-center" justify="center" align="center">
      <a-card :hoverable="true" style="width: 400px" title="请登录">
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
  background: #4D96E8;
  left: -12vw;
  bottom: -10vw;
}

.circle-teal {
  width: 30vw;
  height: 30vw;
  background: #2979C9;
  right: -10vw;
  top: -8vw;
}
</style>