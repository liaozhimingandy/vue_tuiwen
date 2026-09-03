<script setup lang="ts">
import {computed, ref, unref} from 'vue';
import instance from '@/services'
import {apiUrls} from "@/services/api.ts";
import router from "@/router";
import {md5} from "js-md5";
import type {FormProps, AutoCompleteProps} from 'tdesign-vue-next';
import {MessagePlugin} from 'tdesign-vue-next'
import {config} from "@/common/config.ts";

const current = ref<number>(0);

// 表单实例与数据
const formRef1 = ref();
const formRef2 = ref();

const formData1 = ref({
  mail: ''
})
const formData2 = ref({
  code: "",
  password: ""
})

// 防重复提交
const sending = ref(false)
const resetting = ref(false)

/**
 * 发送验证码
 */
const handleSendCode: FormProps['onSubmit'] = async ({validateResult, firstError}) => {
  if (!(validateResult === true)) {
    await MessagePlugin.warning(firstError || '');
    return;
  }

  const form = unref(formData1);
  if (!form.mail) return

  sending.value = true
  const data = {
    "channel": "mail",
    "account": form.mail,
    "scene": "reset_pwd",
  };
  try {
    const res = await instance.post(apiUrls.send_code(), data)
    await MessagePlugin.success(res.data.message)
    current.value = 1
  } catch (err: any) {
    const msg = err?.response?.data?.detail || '发送验证码失败'
    await MessagePlugin.error(msg)
  } finally {
    sending.value = false
  }
};

/**
 * 重置密码
 */
const handleResetPassword: FormProps['onSubmit'] = async ({validateResult, firstError}) => {
  if (!(validateResult === true)) {
    await MessagePlugin.warning(firstError || '');
    return;
  }
  const {mail} = unref(formData1);
  const {code, password} = unref(formData2);
  if (!mail || !code || !password) return;
  resetting.value = true;
  try {
    const params = {
      username: mail,
      code,
      password: md5(password),
    }

    const res = await instance.put(apiUrls.reset_password(), params)
    await MessagePlugin.success(res.data.message)
    goLogin()
    current.value = 2
  } catch (err: any) {
    const msg = err?.response?.data?.detail || '重置密码失败'
    await MessagePlugin.error(msg)
  } finally {
    resetting.value = false
  }
}

/**
 * 去登录页
 */
const goLogin = () => {
  router.push({name: 'login'})
}

/**
 * 邮箱自动填入
 */
const emailOptions = computed<AutoCompleteProps['options']>(() => {
  const emailPrefix = formData1.value.mail.split('@')[0];
  if (!emailPrefix) return [];
  return config.EMAIL_SUFFIX.map((suffix) => emailPrefix + suffix);
});
</script>

<template>
  <t-layout style="min-height: 100vh; background-color: white;">
    <t-content>
      <t-row justify="center">
        <t-col :span="6">
          <t-space direction="vertical" style="width: 100%">
            <t-typography-title>密码重置</t-typography-title>
            <t-divider></t-divider>
            <t-steps layout="horizontal" :current="current" status="process">
              <t-step-item title="步骤1" content="填写邮箱">
                <template v-if="current === 0" #extra>
                  <t-button size="small" variant="base" @click="current++"> 下一步</t-button>
                </template>
              </t-step-item>
              <t-step-item title="步骤2" content="填写密码和验证码">
                <template v-if="current === 1" #extra>
                  <t-button size="small" variant="text" @click="current--"> 上一步</t-button>
                  <t-button size="small" variant="base" @click="current++"> 下一步</t-button>
                </template>
              </t-step-item>
              <t-step-item title="步骤3" content="完成">
                <template v-if="current === 2" #extra>
                  <t-button size="small" @click="current--"> 上一步</t-button>
                </template>
              </t-step-item>
            </t-steps>
            <t-form
                ref="formRef1"
                :data="formData1"
                @submit="handleSendCode"
                v-show="current === 0"
                style="margin-top: 20px;"
            >
              <t-form-item
                  label="电子邮箱"
                  name="email"
                  :rules="[{required: true, message: '请输入电子邮箱', trigger: 'blur' },{mail: {ignore_max_length: true,}}]"
              >
                <t-auto-complete
                    v-model:value="formData1.mail"
                    placeholder="注册时填写的电子邮箱"
                    :options="emailOptions"
                />
              </t-form-item>
              <t-form-item>
                <t-button type="submit" :disabled="sending" block>发送验证码</t-button>
              </t-form-item>
            </t-form>
            <!-- 步骤2：输入验证码 + 新密码 -->
            <t-form
                ref="formRef2"
                :data="formData2"
                @submit="handleResetPassword"
                layout="vertical"
                v-show="current === 1"
            >
              <t-form-item
                  label="新密码"
                  name="password"
                  :rules="[{ required: true, message: '请输入新密码', trigger: 'blur' },]">
                <t-input
                    v-model:value="formData2.password"
                    placeholder="请输入新密码"
                    type="password"
                    maxlength="10"
                    autocomplete="password"
                    show-limit-number
                />
              </t-form-item>
              <t-form-item
                  label="验证码"
                  name="code"
                  :rules="[
              { required: true, message: '请输入验证码', trigger: 'blur' },
              {
      validator: (val: string) => /^\d{6}$/.test(val),
      message: '验证码必须为6位纯数字',
      trigger: ['blur', 'change']
    },
    ]">
                <t-input
                    v-model:value="formData2.code"
                    placeholder="请输入6位数字验证码"
                    show-limit-number
                    maxlength="6"
                />
              </t-form-item>
              <t-form-item>
                <t-button type="submit" :disabled="resetting" block>重置密码</t-button>
              </t-form-item>
            </t-form>

            <div v-show="current === 2" style="width: 100%;text-align: center;">
              <t-space align="center" size="large">
                <t-link href="/" content="返回首页" theme="primary" size="large"/>
              </t-space>
            </div>
          </t-space>
        </t-col>
      </t-row>
    </t-content>
  </t-layout>

</template>

<style scoped>

</style>