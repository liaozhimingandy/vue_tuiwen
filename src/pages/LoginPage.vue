<!--
  文件：LoginPage.vue
  用途：用户登录页，支持账号密码登录、注册入口、找回密码、自定义后端 API 地址
  路由：/login （登录后按 redirect 参数或回首页）
  数据来源：instance.post(apiUrls.login) 走表单格式（application/x-www-form-urlencoded）
  主要交互：
    1. 表单校验 -> md5 加密密码 -> 登录获取 token
    2. 「忘记密码」「注册」跳转；「天亮即焚」无需登录入口
    3. 右上角设置可填写自定义 API 地址并测试连通性（存 localStorage）
-->
<script lang="ts" setup>
import {ref, onMounted} from 'vue';
import {useRoute} from 'vue-router';
import {MessagePlugin} from 'tdesign-vue-next';
import type {FormProps} from 'tdesign-vue-next';
import {LockOnIcon, SettingIcon, UserIcon} from 'tdesign-icons-vue-next';
import {md5} from 'js-md5';

import instance from '../services/';
import router from '../router';
import {apiUrls, update_self_account} from '@/services/api.ts';
import appStore from '@/stores';
import {config} from '../common/config.ts';
import axios from 'axios';
import SvgIcon from '../components/SvgIcon.vue';

// 用 useRoute 取当前路由；原先的 getCurrentInstance().proxy.$route 在
// <script setup> 下类型为 null（TS 报 TS18047），且 query 值类型过宽
const route = useRoute();
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
    router.push({name: 'home'});
  }
});

/**
 * 登录提交：先校验表单，再把密码 md5 哈希后提交后端换取 token
 * @param validateResult 表单校验结果，true 表示通过
 * @param firstError 校验失败时第一条错误信息
 */
const handleLogin: FormProps['onSubmit'] = async ({validateResult, firstError}) => {
  if (!(validateResult === true)) {
    await MessagePlugin.warning(firstError || '请输入登录信息');
    return;
  }

  // 密码前端 md5 加密后再传输（注意：仅防明文截获，非高安全方案，口径待确认）
  let data = {
    username: formData.value.username,
    password: md5(formData.value.password),
  };
  let account_id;
  await instance
    .post(apiUrls.login(), data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })
    .then((r: any) => {
      appStore.useAccountStore.update_token('access_token', r.data.access_token);
      appStore.useAccountStore.update_token('refresh_token', r.data.refresh_token);
      account_id = r.data.account_id;
      MessagePlugin.success('登录成功!');
      update_self_account(account_id);
      // 跳转：优先回到登录前的目标页（?redirect=...），否则回首页
      // query 值可能是 string | string[] | null，只有非空字符串才可用作跳转目标
      const redirect = route.query.redirect;
      router.push(typeof redirect === 'string' && redirect ? redirect : '/');
    })
    .catch((err: any) => MessagePlugin.error(err?.response?.data?.detail || '接口地址不存在(404)'));
};

const handleRegister = () => {
  router.push({name: 'register'});
};

const goResetPwd = () => {
  router.push({name: 'reset_password'});
};

// 弹窗显示状态
const apiModalVisible = ref(false);
// 用户输入的自定义 API 地址
const customApiUrl = ref('');
// 打开设置：从 localStorage 读取已保存的地址回填到输入框
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
    // 持久化到 localStorage，供 API 实例初始化时读取（保存后需刷新页面生效）
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
    // 去掉结尾的斜杠（正则 /\/$/ 匹配末尾单独的 /），再拼接健康检查路径
    const testUrl = val.replace(/\/$/, '') + apiUrls.check_health();
    console.info(testUrl);
    // 超时 5s，避免无效地址长时间挂起
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
    <div
      class="login-center"
      style="display: flex; justify-content: center; align-items: center; width: 100%; height: 100%"
    >
      <t-card style="width: 400px" header-bordered>
        <!-- Logo区域 -->
        <template #title>
          <div style="display: flex; align-items: center; gap: 8px">
            <img src="../assets/icons/logo.svg" alt="logo" width="32" />
            <t-typography-title level="h4" style="margin: 0; line-height: 16px">请登录</t-typography-title>
          </div>
        </template>
        <template #actions>
          <t-tooltip content="如果默认后端地址不可用时,可以自行修改可用地址">
            <t-button variant="text" @click="setApiConfig">
              <template #icon>
                <setting-icon />
              </template>
            </t-button>
          </t-tooltip>
        </template>
        <t-form ref="formRef" :data="formData" :rules="rules" @submit="handleLogin">
          <t-form-item label="用户名" name="username">
            <t-input v-model:value="formData.username" placeholder="请输入用户名">
              <template #prefix-icon>
                <user-icon />
              </template>
            </t-input>
          </t-form-item>
          <t-form-item label="密  码" name="password">
            <t-input v-model:value="formData.password" placeholder="请输入密码" type="password" autocomplete="password">
              <template #prefix-icon>
                <lock-on-icon />
              </template>
            </t-input>
          </t-form-item>
          <t-divider>
            <t-link @click="goResetPwd">忘记密码？点此重置</t-link>
          </t-divider>
          <t-space direction="horizontal" align="center" size="large">
            <t-button theme="primary" type="submit">登录</t-button>
            <t-button theme="default" @click="handleRegister">注册</t-button>
            <t-button theme="danger" href="/snaps/">
              <template #icon>
                <SvgIcon name="snap" color="white" />
              </template>
              天亮即焚-无需登录
            </t-button>
          </t-space>
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
    <div style="margin-top: 8px; font-size: 12px; color: #999">
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
