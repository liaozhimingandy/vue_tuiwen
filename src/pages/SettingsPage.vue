<script setup lang="ts">
import {onMounted, reactive, ref} from "vue";
import {MessagePlugin} from 'tdesign-vue-next';
import Header from "@/components/Header.vue";
import instance from "@/services";

const headerRef = ref<Element>();
import {CScrollbar} from "c-scrollbar";
import {sexListOptions} from "@/common/constants.js";
import {md5} from "js-md5";
import {apiUrls, update_self_account} from "@/services/api.ts";
import appStore from "@/stores";
import {storeToRefs} from "pinia";
import type {IAccount} from "@/interface";
import router from "@/router";
import type {UploadProps} from 'tdesign-vue-next';
import {getResourceUrl} from "@/common/utils.ts";

const activeKey = ref(1);
const {account} = storeToRefs(appStore.useAccountStore);
const saving = ref<boolean>(false);
const contentHeight = ref<number | undefined>(undefined);

const updateContentHeight = () => {
  contentHeight.value = window.innerHeight - headerRef.value.$el.offsetHeight - 12;
};

onMounted(() => {
  updateContentHeight();
  files.value.push({
    name: 'avator',
    url: getResourceUrl(account.value.avatar),
  })
})

// 查询用户信息
update_self_account(account.value.account_id);

// 密码重置表单
const formData = reactive({
  password_current: "",
  password_new: "",
  password_confirm: ""
});

// 密码确认校验
const validateConfirmPassword = async (
    value: string,
    context?: { formData: typeof formData }
) => {
  if (value !== context?.formData.password_new) {
    // 返回 result:false + 自定义提示
    return {
      result: false,
      message: '两次输入的密码不一致',
      type: 'error'
    };
  }
  return {result: true};
};

// 修改密码表单规则
const rules_password = {
  password_current: [
    {required: true, message: '请输入密码', trigger: 'blur', type: 'error'},
    {message: '长度必须介于1和32之间', trigger: ['blur', 'change'], type: 'error'}
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
const password_reset = (ctx: { validateResult: any, firstError?: string }) => {
  if (ctx.validateResult !== true) {
    MessagePlugin.warning(ctx.firstError || '表单校验不通过，请检查填写内容');
    return;
  }

  saving.value = true;
  let data = {
    account_id: account.value.account_id,
    password_current: md5(formData.password_current),
    password_new: md5(formData.password_new)
  }
  instance.put(apiUrls.update_password(), JSON.stringify(data)).then(() => {
    MessagePlugin.success("密码设置成功,下次请用新密码登录!");
    appStore.useAccountStore.logout();
    router.push({name: "login"});
  }).catch(((err: any) =>
      MessagePlugin.error(err.response.data.detail)))
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

  instance.put(apiUrls.update_account(account.value.account_id), data)
      .then((r: IAccount) => {
            MessagePlugin.success("更新成功");
            account.value = r.data as IAccount;
          }
      ).finally(() => saving.value = false)
}

// 上传的图片列表
const files = ref<UploadProps['value']>([]);
const sizeLimit = ref<UploadProps['sizeLimit']>({
  size: 10,
  unit: 'MB',
});


// 上传事件
const onUploadSuccess: UploadProps['onSuccess'] = ({file}) => {
  account.value.avatar = file?.response?.image_url;
  MessagePlugin.success(`头像上传成功`);
};

const allow_beep = ref<boolean>(true);

const onUploadFail: UploadProps['onFail'] = ({file}) => {
  MessagePlugin.error(`文件 ${file.name} 上传失败`);
};
</script>

<template>
  <t-layout style="min-height: 100vh; text-align: center;">
    <t-header ref="headerRef" :style="{width: '100%',
      'background-color': 'white'}">
      <Header selected-keys="none"/>
    </t-header>
    <t-content style="padding-top: 8px">
      <t-row justify="center">
        <t-col :span="6">
          <c-scrollbar
              trigger="hover"
              class="content"
          >
            <t-tabs :default-value="activeKey" animated placement="left" size="large">
              <t-tab-panel :value="1" label="个人资料">
                <t-typography-title level="h4">个人资料</t-typography-title>
                <t-form ref="formRef1" :data="account" :rules="rules_account" :colon="true" @submit="update_account">
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
                          :headers="{'Authorization': `Bearer ${appStore.useAccountStore.token.access_token}`}"
                          @fail="onUploadFail"
                          @success="onUploadSuccess"
                      />
                    </t-form-item>
                    <t-form-item label="用户名" name="username">
                      <t-input :value="account.username" placeholder="平台唯一标识,不能和其他人相同" disabled></t-input>
                    </t-form-item>
                    <t-form-item label="昵称" name="nick_name">
                      <t-input v-model:value="account.nick_name"
                               placeholder="用于对外显示的网名,可以和其他人同名"></t-input>
                    </t-form-item>
                    <t-form-item label="出生日期" name="gmt_birth">
                      <t-date-picker v-model:value="account.gmt_birth" value-format="YYYY-MM-DD">
                      </t-date-picker>
                    </t-form-item>
                    <t-form-item name="sex" label="性别">
                      <t-select v-model:value="account.sex" :options='sexListOptions'/>
                    </t-form-item>
                    <t-form-item>
                      <t-button theme="primary" type="submit" style="width: 100%" :disable="saving">保存</t-button>
                    </t-form-item>
                  </t-space>
                </t-form>
              </t-tab-panel>
              <t-tab-panel :value="2" label="账号安全">
                <t-space direction="vertical">
                  <t-typography-title level="h4">账号安全</t-typography-title>
                  <t-form ref="formRef" :data="formData" :rules="rules_password" @submit="password_reset">
                    <t-space direction="vertical">
                      <input
                          v-model="account.username"
                          type="text"
                          autocomplete="username"
                          hidden
                          readonly
                      />
                      <t-form-item label="旧密码" name="password_current">
                        <t-input v-model:value="formData.password_current" placeholder="请输入当前密码" type="password"
                                 autocomplete="current-password">
                          <template #prefix-icon>
                            <t-icon name="lock-on" />
                          </template>
                        </t-input>
                      </t-form-item>
                      <t-form-item label="新密码" name="password_new" placeholder="请输入新密码">
                        <t-input v-model:value="formData.password_new" type="password" autocomplete="new-password">
                          <template #prefix-icon>
                           <t-icon name="lock-on" />
                          </template>
                        </t-input>
                      </t-form-item>
                      <t-form-item label="确认密码" name="password_confirm" placeholder="请输入新密码">
                        <t-input v-model:value="formData.password_confirm" type="password" autocomplete="new-password">
                          <template #prefix-icon>
                            <t-icon name="lock-on" />
                          </template>
                        </t-input>
                      </t-form-item>
                      <t-form-item>
                        <t-button theme="primary" type="submit" :disabled="saving">保存</t-button>
                      </t-form-item>
                    </t-space>
                  </t-form>
                </t-space>
              </t-tab-panel>
              <t-tab-panel :value="3" label="通用">
                <t-typography-title level="h4">通用设置</t-typography-title>
                <t-form>
                  <t-form-item label="是否接收系统通知">
                    <t-switch v-model:value="allow_beep">推送</t-switch>
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
  height: v-bind(contentHeight+ 'px');
  background-color: white;
}

</style>