<script lang="ts" setup>
import {ref, getCurrentInstance, onBeforeMount} from 'vue';
import {useRoute} from "vue-router";

import {message} from 'ant-design-vue';
import {md5} from 'js-md5';

import instance from '../services/';
import router from '../router';
import {get_account} from "@/services/api.ts";

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
  const account_id = localStorage.getItem('account_id');
  await instance.get(`/oauth/refresh-token/${account_id}/refresh_token/`, {
    headers: {
      Authorization: "Bearer " + refresh_token,
    },
  }).then((r: any) => {
    localStorage.setItem('access_token', r.data.access_token);
    localStorage.setItem('account_id', r.data.account_id);
  }).catch((e: any) => {
    // 可能是刷新令牌过期,重新登录
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    message.error("登录失败!原因:" + e + "!")
  })

  // 获取帐户信息
  await get_account(localStorage.getItem('account_id') || 'unknow');
  const redirect = route.query.redirect || '/';
  router.push(redirect as string);
}


onBeforeMount(() => {
  // 在此处理页面初始化逻辑
  const refresh_token = localStorage.getItem('refresh_token');
  if (refresh_token) {
    refreshAccessToken(refresh_token);
  }
})

const handleLogin = async () => {
  // 在此处理登录逻辑
  let data = {
    "username": formData.value.username,
    "password": md5(formData.value.password)
  }
  await instance.post("/oauth/authorize/password/", data, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  }).then((r: any) => {
    localStorage.setItem('access_token', r.data.access_token);
    localStorage.setItem('refresh_token', r.data.refresh_token);
    localStorage.setItem('account_id', r.data.account_id);
    message.success("登录成功!")
  });

  // 获取帐户信息
  await get_account(localStorage.getItem('account_id') || 'unknow');
  // 登录成功后台跳转到原页面
  await router.push(proxy.proxy.$route.query.redirect || '/');
};

const handleRegister = () => {
  // 跳转到注册页面
  router.push('/register/');
};
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
        <a-divider>更多</a-divider>
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
