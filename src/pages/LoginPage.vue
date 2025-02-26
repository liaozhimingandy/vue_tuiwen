
<script lang="ts" setup>
import {ref, getCurrentInstance} from 'vue';

import {message} from 'ant-design-vue';
import {md5} from 'js-md5';

import instance from '../services/';

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

const handleLogin = () => {
  // 在此处理登录逻辑
  let data = {
    "username": formData.value.username,
    "password": md5(formData.value.password)
  }
  instance.post("/oauth/authorize/password/", data, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  }).then((res: any) => {
    localStorage.setItem('access_token', res.data.access_token);
    localStorage.setItem('refresh_token', res.data.refresh_token);
    localStorage.setItem('account_id', res.data.account_id);
    message.success("登录成功!")

    // 登录成功后台跳转到原页面
    window.location.replace(proxy.proxy.$route.query.redirect || '/')

  })
};

const handleRegister = () => {
  // 跳转到注册页面
  window.location.replace('/register/');
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
        <a-divider/>
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
