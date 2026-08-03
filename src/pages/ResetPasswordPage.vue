<script setup lang="ts">
import {ref, unref} from 'vue';
import instance from '@/services'
import {apiUrls} from "@/services/api.ts";
import {message} from "ant-design-vue";
import router from "@/router";
import {md5} from "js-md5";

// 步骤配置
const steps = [
  {
    key: 0,
    title: '发送验证码',
    description: '填写注册时留的联系方式',
  },
  {
    key: 1,
    title: '验证码',
    description: '填写你收到的验证码',
  },
  {
    key: 2,
    title: '完成',
    description: '重置密码成功',
  },
];
const current = ref<number>(0);

// 表单实例与数据
const formRef1 = ref();
const formRef2 = ref();

const formData1 = ref({
  email: ''
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
const handleSendCode = async () => {
  const form = unref(formData1);
  if (!form.email) return

  sending.value = true
  const data = {
    "channel": "email",
    "account": form.email,
    "scene": "reset_pwd",
  };
  try {
    const res = await instance.post(apiUrls.send_code(), {...data})
    message.success(res.data.message)
    current.value = 1
  } catch (err: any) {
    const msg = err?.response?.data?.detail || '发送验证码失败'
    message.error(msg)
  } finally {
    sending.value = false
  }
};

/**
 * 重置密码
 */
const handleResetPassword = async () => {
  const {email} = unref(formData1);
  const {code, password} = unref(formData2);
  if (!email || !code || !password) return;
  resetting.value = true;
  try {
    const params = {
      username: email,
      code,
      password: md5(password),
    }

    const res = await instance.put(apiUrls.reset_password(), params)
    message.success(res.data.message)
    current.value = 2
  } catch (err: any) {
    const msg = err?.response?.data?.detail || '重置密码失败'
    message.error(msg)
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
</script>

<template>
  <a-layout style="min-height: 100vh">
    <a-layout-content style="padding: 32px 16px; background: #fff">
      <a-page-header
          style="border: 1px solid rgb(235, 237, 240)"
          title="重置密码"
          sub-title="收取验证码"
          @back="goLogin"
      />

      <a-row justify="center">
        <a-col :xs="24" :sm="24" :md="14" :lg="14" :xl="12">
          <a-steps :items="steps" :current="current" style="width: 100%"/>
        </a-col>
      </a-row>
      <a-row justify="center" style="margin-top: 30px">
        <a-col :xs="24" :sm="24" :md="14" :lg="14" :xl="12">
          <!-- 步骤1：发送验证码 -->
          <a-card v-if="current === 0" :hoverable="true" style="min-width: 100%">
            <a-form
                ref="formRef1"
                :model="formData1"
                @finish="handleSendCode"
                layout="vertical"
            >
              <a-form-item
                  label="电子邮箱"
                  name="email"
                  :rules="[
              { required: true, message: '请输入电子邮箱', trigger: 'blur' },
              { type: 'email', message: '请输入有效的邮箱', trigger: ['blur', 'change'] },
            ]"
                  has-feedback
              >
                <a-input
                    v-model:value="formData1.email"
                    placeholder="注册时填写的电子邮箱"
                    maxlength="32"
                    show-count
                />
              </a-form-item>

              <a-form-item>
                <a-button
                    type="primary"
                    html-type="submit"
                    :loading="sending"
                    block
                >
                  发送验证码
                </a-button>
              </a-form-item>
            </a-form>
          </a-card>

          <!-- 步骤2：输入验证码 + 新密码 -->
          <a-card v-else-if="current === 1" :hoverable="true" style="width: 500px">
            <a-form
                ref="formRef2"
                :model="formData2"
                @finish="handleResetPassword"
                layout="vertical"
            >
              <a-form-item
                  label="新密码"
                  name="password"
                  :rules="[
              { required: true, message: '请输入新密码', trigger: 'blur' },
              { min: 6, max: 16, message: '长度 6~16 位', trigger: ['blur', 'change'] },
            ]"
                  has-feedback
              >
                <a-input-password
                    v-model:value="formData2.password"
                    placeholder="请输入新密码"
                    maxlength="16"
                    show-count
                />
              </a-form-item>
              <a-form-item
                  label="验证码"
                  name="code"
                  :rules="[
              { required: true, message: '请输入验证码', trigger: 'blur' },
              { pattern: /^\d{6}$/, message: '验证码为6位数字', trigger: ['blur', 'change'] },
            ]"
                  has-feedback
              >
                <a-input
                    v-model:value="formData2.code"
                    placeholder="请输入6位数字验证码"
                    maxlength="6"
                    show-count
                />
              </a-form-item>

              <a-form-item>
                <a-button
                    type="primary"
                    html-type="submit"
                    :loading="resetting"
                    block
                >
                  重置密码
                </a-button>
              </a-form-item>
            </a-form>
          </a-card>

          <!-- 步骤3：成功 -->
          <a-result
              v-else-if="current === 2"
              status="success"
              title="密码重置成功"
              sub-title="请前往登录页登录"
          >
            <template #extra>
              <a-button type="primary" @click="goLogin">
                前往登录
              </a-button>
            </template>
          </a-result>
        </a-col>
      </a-row>
    </a-layout-content>
  </a-layout>
</template>

<style scoped>

</style>