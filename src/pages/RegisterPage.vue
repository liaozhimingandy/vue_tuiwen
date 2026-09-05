<script setup lang="ts">
import {ref, computed} from 'vue';
import {md5} from "js-md5";
import cloneDeep from "lodash/cloneDeep";
import instance from '@/services'
import router from "@/router";
import {sexListOptions} from "../common/constants.ts"
import {apiUrls} from "@/services/api.ts";
import {MessagePlugin} from 'tdesign-vue-next';
import type {AutoCompleteProps, FormProps} from 'tdesign-vue-next'
import {LockOnIcon, MailIcon} from 'tdesign-icons-vue-next';
import {config} from "@/common/config.ts";

const formRef = ref(null);
// 注册表单数据
const formData = ref({
  mail: '',
  password: '',
  confirmPassword: '',
  nick_name: '',
  gmt_birth: "",
  area_code: "CHN",
  sex: 1
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
  return {result: true};
};

const rules = {
  mail: [
    {required: true, message: '请输入电子邮箱', trigger: 'blur'},
    {
      mail: {
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

const handleRegister: FormProps['onSubmit'] = async ({validateResult, firstError}) => {
  if (!(validateResult === true)) {
    await MessagePlugin.warning(firstError || '表单校验不通过，请检查填写内容');
    return;
  }
  // 在此处理注册逻辑
  let data = cloneDeep(formData.value);
  data.password = md5(data.password);

  // 调用注册接口
  instance.post(apiUrls.register(), data).then(() => {
    MessagePlugin.success("注册成功,请登录!")
    router.push({name: "login"});
  }).catch((err: any) => MessagePlugin.error(err.response.data.detail))
};

const handleLogin = () => window.location.replace('/login/');
const mailOptions = computed<AutoCompleteProps['options']>(() => {
  const mailPrefix = formData.value.mail.split('@')[0];
  if (!mailPrefix) return [];
  return config.MAIL_SUFFIX.map((suffix: string) => mailPrefix + suffix);
});
</script>

<template>
  <div style="height: 100vh; background-color: #E9EBEE; display:flex;justify-content:center;align-items:center">
    <t-card style="width: 400px" header-bordered>
      <!-- Logo区域 -->
      <template #title>
        <div style="display:flex;align-items:center;gap:8px">
          <img src="../assets/icons/logo.svg" alt="logo" width="32"/>
          <t-typography-title level="h4" style="margin:0; line-height:16px;">注册</t-typography-title>
        </div>
      </template>
      <t-form :data="formData" :rules="rules" ref="formRef" @submit="handleRegister">
        <t-form-item label="电子邮箱" name="mail" :status-icon="true">
          <t-auto-complete filterable :options="mailOptions" v-model="formData.mail">
            <template #default>
              <t-input
                  v-model="formData.mail"
                  placeholder="电子邮箱"
              >
                <template #prefix-icon>
                  <mail-icon/>
                </template>
              </t-input>
            </template>
          </t-auto-complete>
        </t-form-item>
        <t-form-item label="密码" name="password" :status-icon="true">
          <t-input v-model:value="formData.password" placeholder="请输入密码" type="password" autocomplete="password">
            <template #prefix-icon>
              <lock-on-icon/>
            </template>
          </t-input>
        </t-form-item>
        <t-form-item label="确认密码" name="confirmPassword" :status-icon="true">
          <t-input v-model:value="formData.confirmPassword" placeholder="请确认密码" type="password"
                   autocomplete="confirmPassword">
            <template #prefix-icon>
              <lock-on-icon/>
            </template>
          </t-input>
        </t-form-item>
        <t-divider/>
        <t-form-item name="nick_name" label="显示名称" :status-icon="true">
          <t-input v-model:value="formData.nick_name"></t-input>
        </t-form-item>
        <t-form-item label="出生日期" name="gmt_birth" :status-icon="true">
          <t-date-picker v-model:value="formData.gmt_birth" value-format="YYYY-MM-DD" style="width: 100%"/>
        </t-form-item>
        <t-form-item name="sex" label="性别" :status-icon="true">
          <t-select v-model:value="formData.sex" :options='sexListOptions'/>
        </t-form-item>
        <t-divider/>
        <div style="display:flex;gap:24px;justify-content:space-evenly;">
          <t-button type="submit">注册</t-button>
          <t-button theme="default" @click="handleLogin">已有账号？登录</t-button>
        </div>
      </t-form>
    </t-card>
  </div>
</template>

<style scoped>

</style>