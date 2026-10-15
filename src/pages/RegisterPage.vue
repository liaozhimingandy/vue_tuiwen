<script setup lang="ts">
/**
 * 注册页（RegisterPage）
 *
 * 路由路径：/register（路由命名 name: 'register'）
 * 页面用途：新用户注册，填写邮箱、密码、确认密码、昵称、出生日期、性别后提交。
 * 数据来源：提交至后端 apiUrls.register()；密码经 md5 哈希后再传输，不发送明文。
 * 主要交互：
 *   1. 邮箱自动补全：基于 config.MAIL_SUFFIX 生成可选后缀候选；
 *   2. 表单校验：必填、密码长度 6~16、两次密码一致性；
 *   3. 注册成功后跳转登录页。
 */
import {ref, computed} from 'vue';
import {md5} from 'js-md5';
import cloneDeep from 'lodash/cloneDeep';
import instance from '@/services';
import router from '@/router';
import {sexListOptions} from '../common/constants.ts';
import {apiUrls} from '@/services/api.ts';
import {MessagePlugin} from 'tdesign-vue-next';
import type {AutoCompleteProps, FormProps} from 'tdesign-vue-next';
import {LockOnIcon, MailIcon} from 'tdesign-icons-vue-next';
import {config} from '@/common/config.ts';

const formRef = ref(null);
// 注册表单数据
const formData = ref({
  mail: '',
  password: '',
  confirmPassword: '',
  nick_name: '',
  gmt_birth: '',
  area_code: 'CHN',
  sex: 1,
});

/**
 * 校验「确认密码」是否与「密码」一致
 * TDesign Form 自定义校验器（validator），返回 { result, message, type }
 * @param value 当前字段（confirmPassword）的值
 * @param context 表单上下文，含完整 formData
 * @returns 一致返回 { result: true }；不一致返回错误提示
 */
const validateConfirmPassword = async (value: string, context?: {formData: typeof formData.value}) => {
  if (value !== context?.formData.password) {
    return {
      result: false,
      message: '两次输入的密码不一致',
      type: 'error',
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
    {min: 6, max: 16, message: '长度必须介于6和16之间', trigger: ['blur', 'change']},
  ],
  confirmPassword: [
    {required: true, message: '请确认密码', trigger: 'blur'},
    {min: 1, max: 32, message: '长度必须介于6和16之间', trigger: ['blur', 'change']},
    {validator: validateConfirmPassword, trigger: 'blur'},
  ],
  nick_name: [{required: false, message: '请输入显示名称', trigger: 'blur'}],
  sex: [{required: true, message: '请选择你的性别', trigger: 'blur'}],
  gmt_birth: [{required: true, message: '请选择出生日期', trigger: 'blur'}],
};

/**
 * 提交注册表单
 * @param validateResult 表单整体校验结果（true 表示全部通过）
 * @param firstError 第一个校验失败的提示信息
 */
const handleRegister: FormProps['onSubmit'] = async ({validateResult, firstError}) => {
  if (!(validateResult === true)) {
    await MessagePlugin.warning(firstError || '表单校验不通过，请检查填写内容');
    return;
  }
  // 在此处理注册逻辑
  let data = cloneDeep(formData.value);
  // 密码 md5 哈希后再提交，避免以明文在网络中传输
  data.password = md5(data.password);

  // 调用注册接口
  instance
    .post(apiUrls.register(), data)
    .then(() => {
      MessagePlugin.success('注册成功,请登录!');
      router.push({name: 'login'});
    })
    .catch((err: any) => MessagePlugin.error(err.response.data.detail));
};

const handleLogin = () => window.location.replace('/login/');
/**
 * 邮箱自动补全候选：取用户输入的 @ 前半段（mailPrefix），
 * 与 config.MAIL_SUFFIX 中各后缀拼接，生成可选邮箱列表。
 * 例如输入 "abc" 且后缀含 ["@qq.com"]，则候选为 ["abc@qq.com"]。
 */
const mailOptions = computed<AutoCompleteProps['options']>(() => {
  const mailPrefix = formData.value.mail.split('@')[0];
  if (!mailPrefix) return [];
  return config.MAIL_SUFFIX.map((suffix: string) => mailPrefix + suffix);
});
</script>

<template>
  <!-- 最外层容器：铺满屏幕、禁止滚动、相对定位 -->
  <div class="login-container">
    <!-- 背景装饰圆 -->
    <div class="circle circle-purple"></div>
    <div class="circle circle-teal"></div>
    <div style="height: 100vh; background-color: #e9ebee; display: flex; justify-content: center; align-items: center">
      <t-card style="width: 400px" header-bordered>
        <!-- Logo区域 -->
        <template #title>
          <div style="display: flex; align-items: center; gap: 8px">
            <img src="../assets/icons/logo.svg" alt="logo" width="32" />
            <t-typography-title level="h4" style="margin: 0; line-height: 16px">注册</t-typography-title>
          </div>
        </template>
        <t-form :data="formData" :rules="rules" ref="formRef" @submit="handleRegister">
          <t-form-item label="电子邮箱" name="mail" :status-icon="true">
            <t-auto-complete filterable :options="mailOptions" v-model="formData.mail">
              <template #default>
                <t-input v-model="formData.mail" placeholder="电子邮箱">
                  <template #prefix-icon>
                    <mail-icon />
                  </template>
                </t-input>
              </template>
            </t-auto-complete>
          </t-form-item>
          <t-form-item label="密码" name="password" :status-icon="true">
            <t-input v-model:value="formData.password" placeholder="请输入密码" type="password" autocomplete="password">
              <template #prefix-icon>
                <lock-on-icon />
              </template>
            </t-input>
          </t-form-item>
          <t-form-item label="确认密码" name="confirmPassword" :status-icon="true">
            <t-input
              v-model:value="formData.confirmPassword"
              placeholder="请确认密码"
              type="password"
              autocomplete="confirmPassword"
            >
              <template #prefix-icon>
                <lock-on-icon />
              </template>
            </t-input>
          </t-form-item>
          <t-divider />
          <t-form-item name="nick_name" label="显示名称" :status-icon="true">
            <t-input v-model:value="formData.nick_name"></t-input>
          </t-form-item>
          <t-form-item label="出生日期" name="gmt_birth" :status-icon="true">
            <t-date-picker v-model:value="formData.gmt_birth" value-format="YYYY-MM-DD" style="width: 100%" />
          </t-form-item>
          <t-form-item name="sex" label="性别" :status-icon="true">
            <t-select v-model:value="formData.sex" :options="sexListOptions" />
          </t-form-item>
          <t-divider />
          <div style="display: flex; gap: 24px; justify-content: space-evenly">
            <t-button type="submit">注册</t-button>
            <t-button theme="default" @click="handleLogin">已有账号？登录</t-button>
          </div>
        </t-form>
      </t-card>
    </div>
  </div>
</template>

<style scoped>
/* 关键：铺满屏幕、隐藏滚动条、禁止内容撑开高度 */
.login-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  background-color: #e9ebee;
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
  background: #027aff;
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
