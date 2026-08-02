<script lang="ts" setup>
import {ref, getCurrentInstance, onMounted} from 'vue';
import {useRoute} from "vue-router";

import {message} from 'ant-design-vue';
import {md5} from 'js-md5';

import instance from '../services/';
import router from '../router';
import {apiUrls, update_self_account} from "@/services/api.ts";
import appStore from "@/stores";

const route = useRoute();
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
    // 可能是刷新令牌过期,重新登录
    message.error(`你的访问令牌过期了,请重新登录:${e}`);
  })
  // 获取帐户信息
  await update_self_account(localStorage.getItem('account_id') || 'unknow');
  const redirect = route.query.redirect || '/';
  router.push(redirect);
}


onMounted(() => {
  // 在此处理页面初始化逻辑
  if(appStore.useAccountStore.token.access_token) {
    router.push({name: "home"});
  }
})

const handleLogin = async () => {
  // 在此处理登录逻辑
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
  // 获取帐户信息
  update_self_account(account_id);
  // 登录成功后台跳转到原页面
  await router.push(proxy.proxy.$route.query.redirect || '/');
};

const handleRegister = () => {
  // 跳转到注册页面
  router.push({name: 'register'});
};
const goResetPwd = () => {
  // 当前页面跳转，把当前页面地址存到redirect，重置完可跳回来
  router.push({
    name: "reset_password", // 你的重置密码路由，末尾带/和你路由守卫统一
  })
}
</script>

<template>
  <a-flex style="height: 100vh; background-color: #E9EBEE" justify="center" align="center">
    <a-card :hoverable="true" style="width: 400px" title="请登录">
      <a-form :model="formData" :rules="rules" ref="formRef" @finish="handleLogin">
        <a-form-item label="用户名" name="username">
          <a-input v-model:value="formData.username" placeholder="请输入用户名"/>
        </a-form-item>
        <a-form-item label="密码" name="password">
          <a-input-password v-model:value="formData.password" placeholder="请输入密码"/>
        </a-form-item>
        <a-divider><a-button type="link" @click="goResetPwd">忘记密码？点此重置</a-button></a-divider>
        <a-form-item>
          <a-flex size="large" justify="space-evenly">
            <a-button type="primary" html-type="submit">登录</a-button>
            <a-button @click="handleRegister">注册</a-button>
          </a-flex>
        </a-form-item>
      </a-form>
    </a-card>
  </a-flex>
</template>
