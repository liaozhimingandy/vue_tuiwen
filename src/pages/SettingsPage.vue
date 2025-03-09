<script setup lang="ts">
import {onMounted, reactive, ref} from "vue";
import {LockOutlined} from '@ant-design/icons-vue';
import Header from "@/components/Header.vue";
import instance from "@/services";
import {message} from "ant-design-vue";

const headerRef = ref<Element>();
import {CScrollbar} from "c-scrollbar";
import {sex_code_list} from "@/common/dataset.ts";
import type {Rule} from "ant-design-vue/es/form";
import {md5} from "js-md5";
import {get_account} from "@/services/api.ts";
import appStore from "@/stores";
import {storeToRefs} from "pinia";

const activeKey = ref<string>('1');
const {account} = storeToRefs(appStore.useAccountStore);
const saving = ref<boolean>(false);
const contentHeight = ref<number | undefined>(undefined);

const updateContentHeight = () => {
  contentHeight.value = window.innerHeight - headerRef.value.$el.offsetHeight - 12;
};

onMounted(()=>{
  updateContentHeight();
})

// 性别字典
const sexListOptions = Object.entries(sex_code_list().sex_code_list).map(([k, v]) => {
  return {"value": k[0], "label": v}
});

// 查询用户信息
get_account(localStorage.getItem('account_id'));

// 密码重置表单
const formData = reactive({
  password_current: "",
  password_new: "",
  password_confirm: ""
});

// 密码确认校验
const validateConfirmPassword = async (_rule: Rule, value: string) => {
  if (value !== formData.password_new) {
    return Promise.reject('两次输入的密码不一致');
  }
  return Promise.resolve();
};

// 修改密码表单规则
const rules_password = {
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

// 个人信息更新规则
const rules_account = {
  avatar: [
      {required: true, message: '你的头像', trigger: 'blur'},
  ],
  username: [
    {required: true, message: '用户名,平台唯一标识,不能和其他人相同', trigger: 'blur'},
    {min: 2, max: 32, message: '长度必须介于2和32之间', trigger: ['blur', 'change']},
  ],
  nick_name: [
    {required: true, message: '用于对外显示的网名', trigger: 'blur'},
    {min: 2, max: 32, message: '长度必须介于2和32之间', trigger: ['blur', 'change']},
  ],
  gmt_birth: [
    {required: true, message: '你的出生日期', trigger: 'blur'},
  ],
  sex: [
    {required: true, message: '性别', trigger: 'blur'},
  ],
};

// 密码重置
const password_reset = () => {
  saving.value = true;
  let data = {
    account_id: localStorage.getItem('account_id'),
    password_current: md5(formData.password_current),
    password_new: md5(formData.password_new)
  }
  instance.put('/accounts/password/change/', JSON.stringify(data)).then(() => {
    message.success("密码设置成功,下次请用新密码登录!");
    localStorage.removeItem('refresh_token');
  }).catch(((err: any) => message.error(err.response.data.message)))
      .finally(() => saving.value = false);
}

// 更新账户信息
const update_account = () => {
  saving.value = true;
  let data = {
    username: account.value.username,
    nick_name: account.value.nick_name,
    gmt_birth: account.value.gmt_birth,
    area_code: account.value.area_code,
    sex: parseInt(account.value.sex),
    avatar: account.value.avatar
  }
  localStorage.setItem('nick_name', account.value.nick_name);
  instance.put(`/accounts/${account.value.account_id}/`, JSON.stringify(data))
      .then(() => message.success("更新成功"))
      .finally(() => saving.value=false)
}

// 上传的图片列表
const files = ref<File[]>([]);

// 上传事件
const uploadChange = (info: any) => {
  if (info.file.status === 'done') {
    // 上传完成
    account.value.avatar = info.file.response.image_url;
  }
}

//token
const access_token = 'Bearer ' + localStorage.getItem('access_token');
// 设置图片上传的接口地址
const url_upload = import.meta.env.VITE_APP_BASE_URL + '/upload/image/';
</script>

<template>
  <a-layout style="min-height: 100vh; text-align: center;">
    <a-layout-header ref="headerRef" :style="{width: '100%',
      'background-color': 'white'}">
      <Header selected-keys="o"/>
    </a-layout-header>
    <a-layout-content style="padding-top: 8px">
      <a-row justify="center">
        <a-col :span="12">
          <c-scrollbar
              trigger="hover"
              class="content"
          >
            <a-tabs v-model:activeKey="activeKey" tab-position="left" animated class="content">
              <a-tab-pane key="1" tab="个人资料">
                <a-typography-title>个人资料</a-typography-title>
                <a-form :model="account" :rules="rules_account" ref="formRef1" @finish="update_account">
                  <a-space direction="vertical">
                    <a-form-item>
                      <a-upload-dragger v-model:file-list="files" :action="url_upload" :headers="{'Authorization': access_token}"
                                        maxCount="1" @change="uploadChange">
                        <a-avatar :src="account.avatar" :size="80"></a-avatar>
                      </a-upload-dragger>
                    </a-form-item>
                    <a-form-item label="用户名" name="username">
                      <a-input v-model:value="account.username" placeholder="平台唯一标识,不能和其他人相同"></a-input>
                    </a-form-item>
                    <a-form-item label="昵称" name="nick_name">
                      <a-input v-model:value="account.nick_name" placeholder="用于对外显示的网名,可以和其他人同名"></a-input>
                    </a-form-item>
                    <a-form-item label="出生日期" name="gmt_birth">
                      <a-date-picker v-model:value="account.gmt_birth" value-format="YYYY-MM-DD"></a-date-picker>
                    </a-form-item>
                    <a-form-item name="sex" label="性别">
                      <a-select v-model:value="account.sex" :options='sexListOptions'/>
                    </a-form-item>
                    <a-form-item>
                      <a-button type="primary" html-type="submit" style="width: 100%" :loading="saving">保存</a-button>
                    </a-form-item>
                  </a-space>
                </a-form>
              </a-tab-pane>
              <a-tab-pane key="2" tab="账号安全">
                <a-typography-title>账号安全</a-typography-title>
                <a-form :model="formData" :rules="rules_password" ref="formRef" autocomplete="off" @finish="password_reset">
                  <a-space direction="vertical">
                    <a-form-item label="旧密码" name="password_current" hasFeedback>
                      <a-input-password v-model:value="formData.password_current" placeholder="请输入当前密码">
                        <template #prefix>
                          <LockOutlined class="site-form-item-icon"/>
                        </template>
                      </a-input-password>
                    </a-form-item>
                    <a-form-item label="新密码" name="password_new" hasFeedback placeholder="请输入新密码">
                      <a-input-password v-model:value="formData.password_new">
                        <template #prefix>
                          <LockOutlined class="site-form-item-icon"/>
                        </template>
                      </a-input-password>
                    </a-form-item>
                    <a-form-item label="确认密码" name="password_confirm" hasFeedback placeholder="请输入新密码">
                      <a-input-password v-model:value="formData.password_confirm">
                        <template #prefix>
                          <LockOutlined class="site-form-item-icon"/>
                        </template>
                      </a-input-password>
                    </a-form-item>
                    <a-form-item>
                      <a-button type="primary" html-type="submit" :loading="saving" style="width: 100%">保存</a-button>
                    </a-form-item>
                  </a-space>
                </a-form>
              </a-tab-pane>
              <a-tab-pane key="3" tab="通用">
                <a-typography-title>通用设置</a-typography-title>
                <a-form >
                  <a-form-item label="是否接收系统通知">
                    <a-switch value="true">推送</a-switch>
                  </a-form-item>
                </a-form>
              </a-tab-pane>
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
  background-color: white;
}

</style>