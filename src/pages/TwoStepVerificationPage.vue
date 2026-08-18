<script setup lang="ts">
import {getCurrentInstance, ref} from "vue";
import {useRouter} from "vue-router";
import {config} from "@/common/config.ts";
import {VueTurnstile} from "vue-cloudflare-turnstile";
import instance from "@/services";
import {apiUrls} from "@/services/api.ts";
import {logger} from "@/common/utils.ts";


// docs: https://www.npmjs.com/package/vue-cloudflare-turnstile

const proxy = getCurrentInstance();
const router = useRouter();
const turnstileRef = ref();

const onSuccess = async (cfToken: string) => {
  try {
    // 1. 请求后端预检接口
    const res = await instance.post(apiUrls.two_step_verification(), {
      "cf_turnstile_token": cfToken,
    }, {
      headers: {
        "Content-Type": "application/json"
      }
    });
    // 2. 保存凭证到sessionStorage，路由守卫识别这个key
    sessionStorage.setItem("two_step_verification_success", res.data.success);

    // 3. 跳回原来要访问的页面
    await router.push(proxy.proxy.$route.query.redirect || '/');
  } catch (err) {
    logger.error("预检接口失败", err);
    // 失败重置验证码，让用户重新验证
    turnstileRef.value?.reset();
  }
};

const onError = (e: any) => {
  logger.error(e)
}
</script>

<template>
  <a-flex style="min-height: 100vh" align="center" justify="center">
    <a-space direction="vertical">
      <a-typography-text>正在人机检测,检测完成后会自动跳转...</a-typography-text>
      <VueTurnstile
          ref="turnstileRef"
          :site-key="config.TURNSTILE_SITE_KEY"
          @success="onSuccess"
          @error="onError"
      />
    </a-space>
  </a-flex>
</template>

<style scoped>
</style>
