<script setup lang="ts">
import {ref} from 'vue';
import instance from '@/services'
import {apiUrls} from "@/services/api.ts";
import {message} from "ant-design-vue";
import router from "@/router";
import {md5} from "js-md5";

const items = [
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
const current = ref<number>(2);

const formRef = ref();
const formData = ref({
  email: ''
})
const handleRegister = async () => {
  const data = {
    "channel": "email",
    "account": formData.value.email,
    "scene": "reset_pwd",
  };
  await instance.post(apiUrls.send_code(), {...data}).then((r: any) => {
    message.success(r.data.message);
    current.value++;
  }).catch((e: any) => message.error(e.data.detail))
};


// 重置密码
const formData2 = ref({
  code: "",
  password: ""
})
const handleResetPWD = async () => {
  let data = formData2.value;
  data['username'] = formData.value.email;
  data["password"] = md5(data.password);
  await instance.put(apiUrls.reset_password(), {...data}).then((r: any) => {
    message.success(r.data.message);
    current.value++;
  }).catch((e: any) => message.error(e.data.message))
}
</script>

<template>
  <a-layout style="min-height: 100vh">
    <a-layout-content style="padding: 10px 50px;background-color: white">
      <a-page-header
          style="border: 1px solid rgb(235, 237, 240)"
          title="重置密码"
          sub-title="收取验证码"
          @back="() => null"
      />
      <a-steps :items="items" :current="current"></a-steps>
      <a-divider/>
      <a-card v-if="current == 0" :hoverable="true" style="width: 500px">
        <a-form ref="formRef" :model="formData" @finish="handleRegister">
          <a-form-item label="电子邮箱"
                       name="email"
                       :rules="[{required: true, message: '请输入电子邮箱', trigger: 'blur'},
                             {type: 'email', message: '请输入有效的电子邮箱地址', trigger: ['blur', 'change']}]"
                       hasFeedback
                       help="注册时填写的电子邮箱">
            <a-input v-model:value="formData.email" placeholder="注册时填写的电子邮箱" maxlength="32" show-count/>
          </a-form-item>
          <a-form-item>
            <a-button type="primary" html-type="submit">发送验证码</a-button>
          </a-form-item>
        </a-form>
      </a-card>
      <a-card v-if="current == 1" :hoverable="true" style="width: 500px">
        <a-form ref="formRef" :model="formData2" @finish="handleResetPWD">
          <a-form-item label="新密码"
                       name="password"
                       :rules="[{required: true, message: '请输入密码', trigger: 'blur'},
                             {min: 6, max: 16, message: '长度必须介于6和16之间', trigger: ['blur', 'change']}]"
                       hasFeedback
                       help="新密码">
            <a-input-password v-model:value="formData2.password" maxlength="32" show-count/>
          </a-form-item>
          <a-form-item label="验证码"
                       name="code"
                       :rules="[{required: true, message: '请输入电子邮箱', trigger: 'blur'},
                             { pattern: /^\d{6}$/, message: '验证码必须是6位数字', trigger: ['blur', 'change'] }]"
                       hasFeedback
                       help="收到的验证码">
            <a-input v-model:value="formData2.code" placeholder="收到的验证码" maxlength="6" show-count/>
          </a-form-item>
          <a-form-item>
            <a-button type="primary" html-type="submit">重置密码</a-button>
          </a-form-item>
        </a-form>
      </a-card>
      <a-result
          v-if="current == 2"
          status="success"
          title="密码重置成功"
          sub-title="请前往首页进行登录"
      >
        <template #extra>
          <a-button key="console" type="primary" @click="() => router.push({name:'login'})">前往登录</a-button>
        </template>
      </a-result>

    </a-layout-content>
  </a-layout>
</template>

<style scoped>

</style>