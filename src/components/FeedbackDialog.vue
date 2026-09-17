<!--
  FeedbackDialog.vue — 意见反馈弹窗
  用途：提供「反馈内容 + 联系方式」表单，提交后调用后端反馈接口。
  职责边界：仅负责弹窗内表单的校验与提交；对外通过 open() 暴露打开能力，提交成功/失败都走 MessagePlugin 提示。
  使用场景：被 Header.vue 的「意见反馈」菜单项调用（ref.feedbackDialogRef.open()）。
  注意：
    - 表单数据使用 IFeedbackForm，feedback_type / level 默认置 1 随表单一并上报后端。
    - 通过 defineExpose 暴露 open()，由父组件控制弹窗显隐。
-->
<template>
  <t-dialog
    v-model:visible="visible"
    width="520"
    header="意见反馈"
    :confirm-btn="{content: '提交', theme: 'primary', loading: submitLoading}"
    cancel-btn="取消"
    @confirm="handleConfirm"
    @close="handleClose"
  >
    <template #header>
      <div style="display: flex; align-items: center; gap: 8px">
        <tips-icon size="20" color="#0052d9" />
        <span>意见反馈</span>
      </div>
    </template>

    <t-form ref="formRef" :data="formData" :rules="formRules" label-width="80px">
      <t-form-item label="反馈内容" name="content">
        <t-textarea
          v-model:value="formData.content"
          placeholder="请详细描述你的问题或建议，不少于5个字符"
          :maxlength="500"
          :autosize="{minRows: 3, maxRows: 5}"
        />
      </t-form-item>
      <t-form-item label="联系方式" name="contact">
        <t-input v-model:value="formData.contact" placeholder="选填：手机号/邮箱，方便我们联系你" />
      </t-form-item>
    </t-form>
  </t-dialog>
</template>

<script setup lang="ts">
import {ref, reactive} from 'vue';
import type {FormRules} from 'tdesign-vue-next';
import {TipsIcon} from 'tdesign-icons-vue-next';
import {MessagePlugin} from 'tdesign-vue-next';

import instance from '@/services';
import {apiUrls} from '@/services/api.ts';
import type {IFeedbackForm} from '@/interface';

const visible = ref(false); // 对话框是否可见
const formRef = ref();
const submitLoading = ref(false);

// 表单双向绑定的数据；feedback_type / level 默认均为 1，随提交一并上报后端
const formData = reactive<IFeedbackForm>({
  content: '',
  contact: '',
  feedback_type: 1,
  level: 1,
});

// 表单校验规则
const formRules: FormRules<IFeedbackForm> = {
  content: [
    {required: true, message: '请输入反馈内容', trigger: 'blur'},
    {min: 5, message: '反馈内容至少5个字符', trigger: 'blur'},
  ],
};

/** 打开弹窗，对外暴露 */
const open = () => (visible.value = true);

// 确认提交
const handleConfirm = async () => {
  if (!formRef.value) return;
  // t-form 表单校验
  // 注意：TDesign 的 validate() 校验通过时 resolve(true)，
  // 校验失败时 resolve 的是一个「字段 -> 错误信息」对象（并非 reject）。
  // 因此不能用 !validRes 判断——对象恒为 truthy，会导致校验失败仍继续提交。
  const validRes = await formRef.value.validate();
  if (validRes !== true) {
    return;
  }
  submitLoading.value = true;
  try {
    await instance.post(apiUrls.feedback(), formData);
    await MessagePlugin.success('感谢您提交的反馈！');
    visible.value = false;
    formRef.value?.reset();
  } catch (err) {
    const msg = (err as any)?.response?.data?.msg ?? '提交反馈失败，请稍后重试';
    await MessagePlugin.error(msg);
  } finally {
    submitLoading.value = false;
  }
};
// 弹窗关闭，重置表单
const handleClose = () => {
  formRef.value?.reset();
};

// 暴露方法给外部调用
defineExpose({open});
</script>
