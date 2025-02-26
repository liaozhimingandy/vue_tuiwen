<script setup lang="ts">
import {ref} from 'vue';

import router from "../router";

const formRef = ref(null);
const formData = ref({
  username: '',
  password: '',
  confirmPassword: '',
});

const validateConfirmPassword = (rule, value) => {
  if (value !== formData.value.password) {
    return Promise.reject('两次输入的密码不一致');
  }
  return Promise.resolve();
};
const rules = {
  username: [{required: true, message: '请输入用户名', trigger: 'blur'}],
  password: [{required: true, message: '请输入密码', trigger: 'blur'}],
  confirmPassword: [
    {required: true, message: '请确认密码', trigger: 'blur'},
    {validator: validateConfirmPassword, trigger: 'blur'},
  ],
};

const handleRegister = () => {
  // 在此处理注册逻辑
  console.log('注册数据:', formData.value);
};

const handleLogin = () => window.location.replace('/login/');

</script>

<template>
  <a-flex style="height: 100vh; background-color: #E9EBEE" justify="center" align="center">
    <a-card :hoverable="true" style="width: 400px" title="注册">
      <a-form :model="formData" :rules="rules" ref="formRef" @finish="handleRegister">
        <a-form-item label="用户名" name="username">
          <a-input v-model:value="formData.username" placeholder="请输入用户名"/>
        </a-form-item>
        <a-form-item label="密码" name="password">
          <a-input-password v-model:value="formData.password" placeholder="请输入密码"/>
        </a-form-item>
        <a-form-item label="确认密码" name="confirmPassword">
          <a-input-password v-model:value="formData.confirmPassword" placeholder="请确认密码"/>
        </a-form-item>
        <a-divider />
        <a-form-item>
          <a-flex size="large" justify="space-evenly">
            <a-button type="primary" html-type="submit">注册</a-button>
            <a-button @click="handleLogin">已有账号？登录</a-button>
          </a-flex>
        </a-form-item>
      </a-form>
    </a-card>
  </a-flex>
</template>

<style scoped>

</style>