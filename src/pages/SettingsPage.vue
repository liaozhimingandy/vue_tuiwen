<script setup lang="ts">
/**
 * 设置页（SettingsPage）
 *
 * 路由路径：/settings
 * 页面用途：已登录用户管理个人资料、账号安全与通用设置，分三个 Tab：
 *   Tab1 个人资料（头像/用户名/昵称/生日/性别）、Tab2 账号安全（改密码）、Tab3 通用设置。
 * 数据来源：Pinia(appStore.useAccountStore) 当前账户；
 *   头像上传 apiUrls.upload_image_url()；改密 apiUrls.update_password()；
 *   改用户名 apiUrls.update_username()；资料更新 apiUrls.update_account()。
 * 主要交互：资料表单提交、密码表单提交、头像上传成功后回填 avatar。
 */
import {onMounted, reactive, ref, type ComponentPublicInstance} from 'vue';
import {MessagePlugin} from 'tdesign-vue-next';
import Header from '@/components/Header.vue';
import instance from '@/services';

// 指向模板里 <t-header ref="headerRef">，需要取 $el 量高度，因此不能声明成 Element
const headerRef = ref<ComponentPublicInstance | null>(null);
import {CScrollbar} from 'c-scrollbar';
import {sexListOptions} from '@/common/constants.js';
import {md5} from 'js-md5';
import {apiUrls, update_self_account} from '@/services/api.ts';
import appStore from '@/stores';
import {storeToRefs} from 'pinia';
import type {IAccount} from '@/interface';
import router from '@/router';
import type {UploadProps} from 'tdesign-vue-next';
import {LockOnIcon} from 'tdesign-icons-vue-next';
import {getResourceUrl, logger} from '@/common/utils.ts';

const activeKey = ref(1);
const {account} = storeToRefs(appStore.useAccountStore);
const saving = ref<boolean>(false);
const contentHeight = ref<number | undefined>(undefined);

/**
 * 计算内容区高度：视口高度 - 顶部 Header 高度 - 12px 间距
 * 用于 <style> 中 v-bind(contentHeight) 撑开滚动容器
 */
const updateContentHeight = () => {
  // headerRef 是组件实例，真实 DOM 在 $el 上；未挂载时兜底为 0
  const headerHeight = (headerRef.value?.$el as HTMLElement | undefined)?.offsetHeight ?? 0;
  contentHeight.value = window.innerHeight - headerHeight - 12;
};

onMounted(() => {
  updateContentHeight();
  // files 声明在下方（setup 内为提升引用，onMounted 回调执行时已初始化），
  // 其值类型含 undefined，这里按需初始化为数组再 push
  (files.value ??= []).push({
    name: 'avator',
    url: getResourceUrl(account.value.avatar),
  });
});

// 查询用户信息（setup 阶段即发起，非 await 的预拉取，结果写入 store）
update_self_account(account.value.account_id);
const username = account.value.username;

// 密码重置表单
const formData = reactive({
  password_current: '',
  password_new: '',
  password_confirm: '',
});

// 密码确认校验
const validateConfirmPassword = async (value: string, context?: {formData: typeof formData}) => {
  if (value !== context?.formData.password_new) {
    // 返回 result:false + 自定义提示
    return {
      result: false,
      message: '两次输入的密码不一致',
      type: 'error',
    };
  }
  return {result: true};
};

import type {CustomValidator} from 'tdesign-vue-next';

/**
 * 用户名唯一性校验器（TDesign CustomValidator）
 * 调后端 apiUrls.check_username 检查是否已被占用，
 * 允许与「当前用户自身用户名」相同（自己改资料时不算冲突）。
 * @param val 输入框用户名
 * @returns true 表示可用；false 表示不可用
 */
const checkUserNameValidator: CustomValidator = async (val) => {
  if (!val || !val.trim()) {
    return new Promise((resolve) => resolve(false));
  }
  checkingName.value = true;
  try {
    const r = await instance.get(apiUrls.check_username(val));
    logger.info(r);
    // 未被占用，或者占用的正是自己当前的用户名 → 校验通过
    return new Promise((resolve) => resolve(!r.data.exists || username === account.value.username));
  } catch (err) {
    return new Promise((resolve) => resolve(false));
  } finally {
    checkingName.value = false;
  }
};

// 修改密码表单规则
const rules_password = {
  password_current: [
    {required: true, message: '请输入密码', trigger: 'blur', type: 'error'},
    {message: '长度必须介于1和32之间', trigger: ['blur', 'change'], type: 'error'},
  ],
  password_new: [
    {required: true, message: '请输入新密码', trigger: 'blur', type: 'error'},
    {min: 6, max: 12, message: '长度必须介于1和16之间', trigger: ['blur', 'change'], type: 'error'},
    {validator: validateConfirmPassword, trigger: 'blur'},
  ],
  password_confirm: [
    {required: true, message: '请再次输入密码', trigger: 'blur', type: 'error'},
    {min: 6, max: 12, message: '长度必须介于1和16之间', trigger: ['blur', 'change'], type: 'error'},
    {validator: validateConfirmPassword, trigger: 'blur'},
  ],
};

// 个人信息更新规则
const rules_account = {
  avatar: [{required: true, message: '你的头像', trigger: 'blur'}],
  username: [
    {required: true, message: '用户名,平台唯一标识,不能和其他人相同', trigger: 'blur'},
    {min: 2, max: 32, message: '长度必须介于2和32之间', trigger: ['blur', 'change']},
    {
      required: true,
      message: 'username必填',
      type: 'error',
    },
    {
      min: 2,
      message: '至少需要两个字母',
      type: 'error',
      trigger: 'blur',
    },
    {
      validator: checkUserNameValidator,
      message: '该用户已存在',
      type: 'error',
      trigger: 'blur',
    },
  ],
  nick_name: [
    {required: true, message: '用于对外显示的网名', trigger: 'blur'},
    {min: 2, max: 32, message: '长度必须介于2和32之间', trigger: ['blur', 'change']},
  ],
  gmt_birth: [{required: true, message: '你的出生日期', trigger: 'blur'}],
  sex: [{required: true, message: '性别', trigger: 'blur'}],
};

/**
 * 修改密码提交
 * @param ctx TDesign 表单提交上下文，含整体校验结果 validateResult 与首个错误提示
 */
const password_reset = (ctx: {validateResult: any; firstError?: string}) => {
  if (ctx.validateResult !== true) {
    MessagePlugin.warning(ctx.firstError || '表单校验不通过，请检查填写内容');
    return;
  }

  saving.value = true;
  let data = {
    account_id: account.value.account_id,
    password_current: md5(formData.password_current),
    password_new: md5(formData.password_new),
  };
  instance
    .put(apiUrls.update_password(), JSON.stringify(data))
    .then(() => {
      MessagePlugin.success('密码设置成功,下次请用新密码登录!');
      appStore.useAccountStore.logout();
      router.push({name: 'login'});
    })
    .catch((err: any) => MessagePlugin.error(err.response.data.detail))
    .finally(() => (saving.value = false));
};

/**
 * 单独修改用户名（局部更新接口，避免整表提交）
 * @param newUsername 新用户名
 */
const update_username = async (newUsername: string) => {
  const payload = {
    type: 'username',
    new_value: newUsername,
  };

  instance.patch(apiUrls.update_username(), payload).then((r) => {
    account.value = r.data;
  });
};

/**
 * 更新账户基础信息（昵称/生日/地区/性别/头像）
 * 若用户名有变动，会先调用 update_username 单独提交用户名，再提交其余字段。
 * @param ctx TDesign 表单提交上下文
 */
const update_account = async (ctx: {validateResult: any; firstError?: string}) => {
  if (ctx.validateResult !== true) {
    await MessagePlugin.warning(ctx.firstError || '表单校验不通过，请检查填写内容');
    return;
  }

  saving.value = true;
  // 仅当用户名真的变了才单独提交（username 为可选字段，需判空）
  const currentUsername = account.value.username;
  if (currentUsername && username !== currentUsername) {
    await update_username(currentUsername);
  }

  let data = {
    nick_name: account.value.nick_name,
    gmt_birth: account.value.gmt_birth,
    area_code: account.value.area_code,
    // sex 在 IAccount 中本就是 number | null，无需 parseInt；
    // 缺失时传 null（与原先 parseInt(undefined) 序列化后的结果一致）
    sex: account.value.sex ?? null,
    avatar: account.value.avatar,
  };

  instance
    .put(apiUrls.update_account(account.value.account_id), data)
    .then((r) => {
      MessagePlugin.success('更新成功');
      account.value = r.data as IAccount;
    })
    .finally(() => (saving.value = false));
};

// 上传的图片列表
const files = ref<UploadProps['value']>([]);
const sizeLimit = ref<UploadProps['sizeLimit']>({
  size: 10,
  unit: 'MB',
});

/**
 * 头像上传成功回调：把后端返回的图片地址回填到当前账户 avatar
 * @param file Upload 组件返回的当前文件对象（含 response）
 */
const onUploadSuccess: UploadProps['onSuccess'] = ({file}) => {
  account.value.avatar = file?.response?.image_url;
  MessagePlugin.success(`头像上传成功`);
};

// 通用设置：是否接收通知（开关）
const allow_beep = ref<boolean>(true);

/**
 * 头像上传失败回调
 * @param file 上传失败的文件对象
 */
const onUploadFail: UploadProps['onFail'] = ({file}) => {
  MessagePlugin.error(`文件 ${file.name} 上传失败`);
};

// 是否正在校验用户名（用于显示 loading 状态）
const checkingName = ref(false);
</script>

<template>
  <t-layout style="min-height: 100vh; text-align: center">
    <t-header ref="headerRef" :style="{width: '100%', 'background-color': 'white'}">
      <Header selected-keys="none" />
    </t-header>
    <t-content style="padding-top: 8px">
      <t-row justify="center">
        <t-col :md="6" :xs="12" :sm="12">
          <c-scrollbar trigger="hover" class="content">
            <t-tabs :default-value="activeKey" animated placement="left" size="large">
              <t-tab-panel :value="1" label="个人资料">
                <t-typography-title level="h4">个人资料</t-typography-title>
                <t-form
                  ref="formRef1"
                  :data="account"
                  :rules="rules_account"
                  :status-icon="true"
                  :colon="true"
                  @submit="update_account"
                >
                  <t-space direction="vertical">
                    <t-form-item label="头像">
                      <t-upload
                        v-model="files"
                        :action="apiUrls.upload_image_url()"
                        :size-limit="sizeLimit"
                        theme="image"
                        accept="image/*"
                        :show-image-preview="true"
                        :max="1"
                        :autoUpload="true"
                        :headers="{Authorization: `Bearer ${appStore.useAccountStore.token.access_token}`}"
                        @fail="onUploadFail"
                        @success="onUploadSuccess"
                      />
                    </t-form-item>
                    <t-form-item label="用户名" name="username">
                      <t-input v-model="account.username" placeholder="平台唯一标识,不能和其他人相同"> </t-input>
                    </t-form-item>
                    <t-form-item label="昵称" name="nick_name">
                      <t-input
                        v-model:value="account.nick_name"
                        placeholder="用于对外显示的网名,可以和其他人同名"
                      ></t-input>
                    </t-form-item>
                    <t-form-item label="出生日期" name="gmt_birth">
                      <t-date-picker v-model:value="account.gmt_birth" value-format="YYYY-MM-DD"> </t-date-picker>
                    </t-form-item>
                    <t-form-item name="sex" label="性别">
                      <t-select v-model:value="account.sex" :options="sexListOptions" />
                    </t-form-item>
                    <t-form-item>
                      <!-- 注意属性名是 disabled（TDesign 规范）；写成 disable 不会生效，会导致保存期间按钮不禁用 -->
                      <t-button theme="primary" type="submit" block :disabled="saving">保存</t-button>
                    </t-form-item>
                  </t-space>
                </t-form>
              </t-tab-panel>
              <t-tab-panel :value="2" label="账号安全">
                <t-space direction="vertical">
                  <t-typography-title level="h4">账号安全</t-typography-title>
                  <t-form ref="formRef" :data="formData" :rules="rules_password" @submit="password_reset">
                    <t-space direction="vertical">
                      <input v-model="account.username" type="text" autocomplete="username" hidden readonly />
                      <t-form-item label="旧密码" name="password_current">
                        <t-input
                          v-model:value="formData.password_current"
                          placeholder="请输入当前密码"
                          type="password"
                          autocomplete="current-password"
                        >
                          <template #prefix-icon>
                            <lock-on-icon />
                          </template>
                        </t-input>
                      </t-form-item>
                      <t-form-item label="新密码" name="password_new" placeholder="请输入新密码">
                        <t-input v-model:value="formData.password_new" type="password" autocomplete="new-password">
                          <template #prefix-icon>
                            <lock-on-icon />
                          </template>
                        </t-input>
                      </t-form-item>
                      <t-form-item label="确认密码" name="password_confirm" placeholder="请输入新密码">
                        <t-input v-model:value="formData.password_confirm" type="password" autocomplete="new-password">
                          <template #prefix-icon>
                            <lock-on-icon />
                          </template>
                        </t-input>
                      </t-form-item>
                      <t-form-item>
                        <t-button theme="primary" type="submit" block :disabled="saving">保存</t-button>
                      </t-form-item>
                    </t-space>
                  </t-form>
                </t-space>
              </t-tab-panel>
              <t-tab-panel :value="3" label="通用设置">
                <t-typography-title level="h4">通用设置</t-typography-title>
                <t-form>
                  <t-form-item label="接收通知" name="allow_beep">
                    <t-switch v-model:value="allow_beep" :label="['开', '关']" size="large"> </t-switch>
                  </t-form-item>
                </t-form>
              </t-tab-panel>
            </t-tabs>
          </c-scrollbar>
        </t-col>
      </t-row>
    </t-content>
  </t-layout>
</template>

<style scoped>
.content {
  align-content: center;
  height: v-bind(contentHeight + 'px');
  background-color: white;
}
</style>
