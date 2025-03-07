<script setup lang="ts">
import {ref} from 'vue';
import {md5} from "js-md5";
import cloneDeep from "lodash/cloneDeep";
import instance from '../services'
import {message} from "ant-design-vue";
import router from "../router";
import {sex_code_list} from "../common/dataset.ts"

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
const sexListOptions = Object.entries(sex_code_list().sex_code_list).map(([k, v]) => {return {"value": k[0], "label": v}});
const validateConfirmPassword = (rule, value) => {
  if (value !== formData.value.password) {
    return Promise.reject('两次输入的密码不一致');
  }
  return Promise.resolve();
};
const rules = {
  email: [
    {required: true, message: '请输入电子邮箱', trigger: 'blur'},
    {type: 'email', message: '请输入有效的电子邮箱地址', trigger: ['blur', 'change']}
  ],
  password: [
    {required: true, message: '请输入密码', trigger: 'blur'},
    {min: 6, max: 16, message: '长度必须介于1和32之间', trigger: ['blur', 'change']}
  ],
  confirmPassword: [
    {required: true, message: '请确认密码', trigger: 'blur'},
    {min: 1, max: 32, message: '长度必须介于1和32之间', trigger: ['blur', 'change']},
    {validator: validateConfirmPassword, trigger: 'blur'},
  ],
  nick_name: [
    {required: false, message: '请输入显示名称', trigger: 'blur'},
  ],
  sex: [
    {required: false, message: '请选择你的性别', trigger: 'blur'}
  ],
  gmt_birth: [
    {required: false, message: '请选择出生日期', trigger: 'blur'}
  ]
};

const handleRegister = () => {
  // 在此处理注册逻辑
  let data = cloneDeep(formData.value);
  data.password = md5(data.password);
  data.sex = parseInt(data.sex);

  // 调用注册接口
  instance.post('/accounts/register/', JSON.stringify(data)).then((r: any) => {
    message.success("注册成功,请登录!")
    router.push({name: "login"});
  })
};

const handleLogin = () => window.location.replace('/login/');

</script>

<template>
  <a-flex style="height: 100vh; background-color: #E9EBEE" justify="center" align="center">
    <a-card :hoverable="true" style="width: 400px" title="注册">
      <a-form :model="formData" :rules="rules" ref="formRef" @finish="handleRegister">
        <a-form-item label="电子邮箱" name="email">
          <a-input v-model:value="formData.email" placeholder="电子邮箱"/>
        </a-form-item>
        <a-form-item label="密码" name="password">
          <a-input-password v-model:value="formData.password" placeholder="请输入密码"/>
        </a-form-item>
        <a-form-item label="确认密码" name="confirmPassword">
          <a-input-password v-model:value="formData.confirmPassword" placeholder="请确认密码"/>
        </a-form-item>
        <a-divider/>
        <a-form-item name="nick_name" label="显示名称">
          <a-input v-model:value="formData.nick_name"></a-input>
        </a-form-item>
        <a-form-item label="出生日期"  name="gmt_birth">
           <a-date-picker v-model:value="formData.gmt_birth" value-format="YYYY-MM-DD" style="width: 100%" />
        </a-form-item>
        <a-form-item name="sex" label="性别">
          <a-select v-model:value="formData.sex" :options='sexListOptions'/>
        </a-form-item>
        <a-divider/>
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