<script setup lang="ts">
import {onBeforeMount, onBeforeUnmount, onMounted, reactive, ref} from "vue";
import { LockOutlined } from '@ant-design/icons-vue';
import Header from "../components/Header.vue";
import instance from "../services";

const headerRef = ref<Element>();
import {CScrollbar} from "c-scrollbar";
import type {IAccount} from "../interface/types.ts";
import {sex_code_list} from "../common/dataset.ts";
import type {Rule} from "ant-design-vue/es/form";

const contentHeight = ref<number | undefined>(undefined);
const updateContentHeight = () => {
  contentHeight.value = window.innerHeight - headerRef?.value.$el.offsetHeight - 12;
};
const activeKey = ref<string>('1');
const account = ref<IAccount>({});

const sexListOptions = Object.entries(sex_code_list().sex_code_list).map(([k, v]) => {
  return {"value": k[0], "label": v}
});
const get_account = async () => {
  await instance.get(`/accounts/${localStorage.getItem('account_id')}/`).then((r: any) => {
        account.value = r.data as IAccount;
        account.value.sex = `${account.value.sex}`;
      }
  )
}
onBeforeMount(async () => {
  await get_account()
})


onMounted(async () => {
  window.addEventListener("resize", updateContentHeight);
  updateContentHeight();
});

onBeforeUnmount(async () => {
  window.removeEventListener("resize", updateContentHeight);
})

const formData = ref({
  password_current: "",
  password_new: "",
  password_confirm: ""
});
const validateConfirmPassword = async (_rule: Rule, value: string) => {
  if (value !== formData.value.password_new) {
    return Promise.reject('两次输入的密码不一致');
  }
  return Promise.resolve();
};
const rules = {
  password_current: [
    {required: true, message: '请输入密码', trigger: 'blur'},
    {message: '长度必须介于1和32之间', trigger: ['blur', 'change']}
  ],
  password_new: [
    {required: true, message: '请输入新密码', trigger: 'blur'},
    {min: 6, max: 12, message: '长度必须介于1和16之间', trigger: ['blur', 'change']}
  ],
  password_confirm: [
    {required: true, message: '请再次输入密码', trigger: 'blur'},
    {min: 6, max: 12, message: '长度必须介于1和16之间', trigger: ['blur', 'change']},
    {validator: validateConfirmPassword, trigger: 'blur'},
  ],
};
</script>

<template>
  <a-layout style="min-height: 100vh; text-align: center;">
    <a-layout-header ref="headerRef" :style="{width: '100%',
      'background-color': 'white'}">
      <Header selected-keys="o"/>
    </a-layout-header>
    <a-layout-content>
      <a-row justify="center">
        <a-col :span="12">
          <c-scrollbar
              trigger="hover"
              class="content"
          >
            <a-tabs v-model:activeKey="activeKey" tab-position="left" animated style="background-color: white">
              <a-tab-pane key="1" tab="个人资料">
                <a-layout-header style="background-color: white">个人资料</a-layout-header>
                <a-form>
                  <a-space direction="vertical">
                    <a-form-item label="用户名">
                      <a-input v-model:value="account.username"></a-input>
                    </a-form-item>
                    <a-form-item label="昵称">
                      <a-input v-model:value="account.nick_name"></a-input>
                    </a-form-item>
                    <a-form-item label="出生日期">
                      <a-date-picker v-model:value="account.gmt_birth" value-format="YYYY-MM-DD"></a-date-picker>
                    </a-form-item>
                    <a-form-item name="sex" label="性别">
                      <a-select v-model:value="account.sex" :options='sexListOptions'/>
                    </a-form-item>
                    <a-form-item>
                      <a-button type="primary" html-type="submit" style="width: 100%">确认</a-button>
                    </a-form-item>
                  </a-space>
                </a-form>
              </a-tab-pane>
              <a-tab-pane key="2" tab="账号安全">
                <a-layout-header style="background-color: white">账号安全</a-layout-header>
                <a-form :model="formData" :rules="rules" ref="formRef" autocomplete="off">
                  <a-space direction="vertical">
                    <a-form-item label="旧密码" name="password_current" hasFeedback help="输入你原始密码">
                      <a-input-password v-model:value="formData.password_current">
                        <template #prefix>
                          <LockOutlined class="site-form-item-icon"/>
                        </template>
                      </a-input-password>
                    </a-form-item>
                    <a-form-item label="新密码" name="password_new" hasFeedback help="输入你新密码">
                      <a-input-password v-model:value="formData.password_new">
                        <template #prefix>
                          <LockOutlined class="site-form-item-icon"/>
                        </template>
                      </a-input-password>
                    </a-form-item>
                    <a-form-item label="确认密码" name="password_confirm" hasFeedback help="请再次输入你新密码">
                      <a-input-password v-model:value="formData.password_confirm">
                        <template #prefix>
                          <LockOutlined class="site-form-item-icon"/>
                        </template>
                      </a-input-password>
                    </a-form-item>
                    <a-form-item>
                      <a-button type="primary" html-type="submit" style="width: 100%">确认</a-button>
                    </a-form-item>
                  </a-space>
                </a-form>
              </a-tab-pane>
              <a-tab-pane key="3" tab="通用">通用</a-tab-pane>
            </a-tabs>
          </c-scrollbar>
        </a-col>
      </a-row>
    </a-layout-content>
  </a-layout>
</template>

<style scoped>
.content {
  align-content: center;
  height: v-bind(contentHeight+ 'px');
  background-color: #E9EBEE;
}

</style>