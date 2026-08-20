<script setup lang="ts">
import {ref, computed} from 'vue';
import {md5} from "js-md5";
import cloneDeep from "lodash/cloneDeep";
import instance from '@/services'
import router from "@/router";
import {sex_code_map} from "../common/constants.ts"
import {apiUrls} from "@/services/api.ts";
import  { MessagePlugin} from 'tdesign-vue-next';
import type {AutoCompleteProps, FormProps} from 'tdesign-vue-next'
const formRef = ref(null);
// 注册表单数据
const formData = ref({
  email: '',
  password: '',
  confirmPassword: '',
  nick_name: '',
  gmt_birth: "",
  area_code: "CHN",
  sex: "0",
  avatar: "https://zos.alipayobjects.com/rmsportal/jkjgkEfvpUPVyRjUImniVslZfWPnJuuZ.png"
});
const sexListOptions = Object.entries(sex_code_map).map(([k, v]) => {
  return {"value": k[0], "label": v}
});

const validateConfirmPassword = async (
  value: string,
  context?: { formData: typeof formData.value }
) => {
  if (value !== context?.formData.password) {
    return {
      result: false,
      message: '两次输入的密码不一致',
      type: 'error'
    };
  }
  return { result: true };
};

const rules = {
  email: [
    {required: true, message: '请输入电子邮箱', trigger: 'blur'},
    {
      email: {
        ignore_max_length: true,
      },
    },
  ],
  password: [
    {required: true, message: '请输入密码', trigger: 'blur'},
    {min: 6, max: 16, message: '长度必须介于6和16之间', trigger: ['blur', 'change']}
  ],
  confirmPassword: [
    {required: true, message: '请确认密码', trigger: 'blur'},
    {min: 1, max: 32, message: '长度必须介于6和16之间', trigger: ['blur', 'change']},
    {validator: validateConfirmPassword, trigger: 'blur'},
  ],
  nick_name: [
    {required: false, message: '请输入显示名称', trigger: 'blur'},
  ],
  sex: [
    {required: true, message: '请选择你的性别', trigger: 'blur'}
  ],
  gmt_birth: [
    {required: true, message: '请选择出生日期', trigger: 'blur'}
  ]
};

const handleRegister: FormProps['onSubmit'] = async ({validateResult, firstError }) => {
  if (!(validateResult === true)) {
    await MessagePlugin.warning(firstError || '表单校验不通过，请检查填写内容');
    return;
  }
  // 在此处理注册逻辑
  let data = cloneDeep(formData.value);
  data.password = md5(data.password);
  data.sex = parseInt(data.sex);

  // 调用注册接口
  instance.post(apiUrls.register(), JSON.stringify(data)).then(() => {
    MessagePlugin.success("注册成功,请登录!")
    router.push({name: "login"});
  })
};

const handleLogin = () => window.location.replace('/login/');
const emailSuffix = ['@qq.com', '@163.com', '@gmail.com'];
const emailOptions = computed<AutoCompleteProps['options']>(() => {
  const emailPrefix = formData.value.email.split('@')[0];
  if (!emailPrefix) return [];
  return emailSuffix.map((suffix) => emailPrefix + suffix);
});
</script>

<template>
  <div style="height: 100vh; background-color: #E9EBEE; display:flex;justify-content:center;align-items:center">
    <t-card  style="width: 400px" header-bordered>
      <!-- Logo区域 -->
      <template #title>
        <div style="display:flex;align-items:center;gap:8px">
          <img src="../assets/logo.svg" alt="logo" width="32"/>
          <t-typography-title level="h4" style="margin:0; line-height:16px;">注册</t-typography-title>
        </div>
      </template>
      <t-form :data="formData" :rules="rules" ref="formRef" @submit="handleRegister">
        <t-form-item label="电子邮箱" name="email">
          <t-auto-complete v-model:value="formData.email" placeholder="电子邮箱" filterable :options="emailOptions"/>
        </t-form-item>
        <t-form-item label="密码" name="password">
          <t-input v-model:value="formData.password" placeholder="请输入密码" type="password"/>
        </t-form-item>
        <t-form-item label="确认密码" name="confirmPassword">
          <t-input v-model:value="formData.confirmPassword" placeholder="请确认密码"  type="password"/>
        </t-form-item>
        <t-divider/>
        <t-form-item name="nick_name" label="显示名称">
          <t-input v-model:value="formData.nick_name"></t-input>
        </t-form-item>
        <t-form-item label="出生日期" name="gmt_birth">
          <t-date-picker v-model:value="formData.gmt_birth" value-format="YYYY-MM-DD"/>
        </t-form-item>
        <t-form-item name="sex" label="性别">
          <t-select v-model:value="formData.sex" :options='sexListOptions'/>
        </t-form-item>
        <t-divider/>
        <t-form-item>
          <div style="display:flex;gap:24px;justify-content:space-evenly;">
            <t-button type="submit">注册</t-button>
            <t-button theme="default" @click="handleLogin">已有账号？登录</t-button>
          </div>
        </t-form-item>
      </t-form>
    </t-card>
  </div>
</template>

<style scoped>

</style>