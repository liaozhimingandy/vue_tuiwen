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
      <div style="display:flex;align-items:center;gap:8px;">
        <tips-icon size="20" color="#0052d9"/>
        <span>意见反馈</span>
      </div>
    </template>

    <t-form
      ref="formRef"
      :data="formData"
      :rules="formRules"
      label-width="80px"
    >
      <t-form-item label="反馈内容" name="content">
        <t-textarea
          v-model:value="formData.content"
          placeholder="请详细描述你的问题或建议，不少于5个字符"
          :maxlength="500"
          :autosize="{ minRows: 3, maxRows: 5 }"
        />
      </t-form-item>
      <t-form-item label="联系方式" name="contact">
        <t-input
          v-model:value="formData.contact"
          placeholder="选填：手机号/邮箱，方便我们联系你"
        />
      </t-form-item>
    </t-form>
  </t-dialog>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import type { FormRules } from 'tdesign-vue-next';
import { TipsIcon } from 'tdesign-icons-vue-next';
import { MessagePlugin } from 'tdesign-vue-next';

import instance from "@/services";
import {apiUrls} from "@/services/api.ts";
import type {IFeedbackForm} from "@/interface";

const visible = ref(false); // 对话框是否可见
const formRef = ref();
const submitLoading = ref(false);

const formData = reactive<IFeedbackForm>({
  content: '',
  contact: '',
  feedback_type: 1,
  level: 1
});

// 表单校验规则
const formRules: FormRules<IFeedbackForm> = {
  content: [
    { required: true, message: '请输入反馈内容', trigger: 'blur' },
    { min: 5, message: '反馈内容至少5个字符', trigger: 'blur' }
  ]
};

/** 打开弹窗，对外暴露 */
const open = () => visible.value = true;

// 确认提交
const handleConfirm = async () => {

  if (!formRef.value) return ;
  // t‑form表单校验
  const validRes = await formRef.value.validate();
  if (!validRes) {
    return
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
  }finally {
    submitLoading.value = false;
  }
};
// 弹窗关闭，重置表单
const handleClose = () => {
  formRef.value?.reset();
};


// 暴露方法给外部调用
defineExpose({ open });
</script>
