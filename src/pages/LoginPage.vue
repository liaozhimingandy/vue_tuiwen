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
import {logger} from '@/common/utils.ts';
import SvgIcon from '../components/SvgIcon.vue';
import {useDeviceWatcher} from '@/common/device.ts';
import ShinyText from '@/components/ShinyText.vue';

// 用 useRoute 取当前路由；原先的 getCurrentInstance().proxy.$route 在
// <script setup> 下类型为 null（TS 报 TS18047），且 query 值类型过宽
const route = useRoute();
const formRef = ref(null);

/**
 * 移动端断点（响应式单例）
 *
 * ⚠️ 原先写的是 `import {isMobile} from '@/common/device.ts'`。那个 isMobile 是
 * 一次性初值常量，只有 useDeviceWatcher() 才会注册全局 resize 监听并同步状态；
 * 直接 import 时监听从未注册、值恒为 false，手机上左侧品牌栏照样渲染、
 * 登录卡被严重挤压。ResetPasswordPage.vue 用的就是下面的正确写法。
 */
const {isMobile} = useDeviceWatcher();

const formData = ref({
  username: '',
  password: '',
});
/** 登录提交中：弱网下连点会发出多个登录请求，按钮需禁用 + loading */
const submitting = ref(false);
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
  // 防重复提交：请求在途时忽略后续点击
  if (submitting.value) return;
  submitting.value = true;

  try {
    // 密码前端 md5 加密后再传输（注意：仅防明文截获，非高安全方案，口径待确认）
    const data = {
      username: formData.value.username,
      password: md5(formData.value.password),
    };
    const r: any = await instance.post(apiUrls.login(), data, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    appStore.useAccountStore.update_token('access_token', r.data.access_token);
    appStore.useAccountStore.update_token('refresh_token', r.data.refresh_token);
    const account_id = r.data.account_id;
    MessagePlugin.success('登录成功!');
    // 登录后预拉取账户资料：失败不影响登录流程，单独兜住避免 unhandled rejection
    void update_self_account(account_id).catch((e) => logger.error('登录后拉取账户信息失败', e));
    // 跳转：优先回到登录前的目标页（?redirect=...），否则回首页
    // query 值可能是 string | string[] | null，只有非空字符串才可用作跳转目标
    const redirect = route.query.redirect;
    router.push(typeof redirect === 'string' && redirect ? redirect : '/');
  } catch (err: any) {
    logger.error('登录失败', err);
    // 网络错误 / 超时没有 response，统一可选链 + 兜底文案
    MessagePlugin.error(err?.response?.data?.detail || '登录失败，请检查账号密码或接口地址');
  } finally {
    submitting.value = false;
  }
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

  // 只认 http(s) 协议：原 startsWith('http') 会被 "httpfoo" 之类的非法串绕过
  if (val && !/^https?:\/\//i.test(val)) {
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
  if (!/^https?:\/\//i.test(val)) {
    await MessagePlugin.error('请输入以 http:// 或 https:// 开头的有效地址');
    return;
  }

  try {
    // 去掉结尾的斜杠（正则 /\/$/ 匹配末尾单独的 /），再拼接健康检查路径
    const testUrl = val.replace(/\/$/, '') + apiUrls.check_health();
    logger.info('测试接口连通性', testUrl);
    // 走统一实例（绝对地址会覆盖 baseURL，不影响测试目的），而不是裸 axios；
    // hideError 让失败只走本地的提示，避免全局错误弹窗重复报一次
    await instance.get(testUrl, {timeout: 5000, customOptions: {hideError: true}} as any);
    MessagePlugin.success('连接成功！接口地址可用');
  } catch (err) {
    logger.warn('接口连通性测试失败', err);
    MessagePlugin.error('连接失败，请检查地址或网络');
  }
};
</script>

<template>
  <!-- TDesign 原生栅格 t-row -->
  <t-row align="middle" style="height: 100vh; background-color: #e9ebee">
    <!-- 左侧品牌栏：PC span=12；移动端 xs:span=0 自动隐藏 -->
    <t-col
      :md="7"
      v-if="!isMobile"
      :xs="0"
      :sm="0"
      style="border-right: 3px solid #888888; height: 100vh; padding: 0 64px"
    >
      <div
        class="login-center"
        style="display: flex; justify-content: center; align-items: center; width: 100%; height: 100%"
      >
        <t-space direction="vertical" :size="0">
          <img src="../assets/icons/logo.svg" alt="logo" style="width: 100px; height: 100px" />
          <t-typography-title level="h1">
            <ShinyText
              text="做你喜欢的事情 - Enjoy yourself!"
              :speed="2"
              :delay="0"
              color="#000000"
              shine-color="#EF4444"
              :spread="120"
              direction="left"
              :yoyo="false"
              :pause-on-hover="false"
            />
          </t-typography-title>
        </t-space>
      </div>
    </t-col>

    <!-- 登录卡片居中 -->
    <t-col :md="5" :xs="12" :sm="12" style="height: 100vh">
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
              <t-input
                v-model:value="formData.password"
                placeholder="请输入密码"
                type="password"
                autocomplete="password"
              >
                <template #prefix-icon>
                  <lock-on-icon />
                </template>
              </t-input>
            </t-form-item>
            <t-divider>
              <t-link @click="goResetPwd">忘记密码？点此重置</t-link>
            </t-divider>
            <t-space direction="horizontal" align="center" size="large">
              <t-button theme="primary" type="submit" :loading="submitting" :disabled="submitting">登录</t-button>
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
      <div class="absolute bottom-0 left-0 w-full text-center">
        <t-typography-text theme="secondary"
          >© {{ new Date().getFullYear() }} tuiwen. All rights reserved.</t-typography-text
        >
      </div>
    </t-col>
  </t-row>
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

<style scoped></style>
