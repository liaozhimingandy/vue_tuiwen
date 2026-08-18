<script setup lang="ts">
import {ref} from "vue";
import {useRoute, useRouter} from "vue-router";
import {config} from "@/common/config.ts";
import {VueTurnstile} from "vue-cloudflare-turnstile";
import instance from "@/services";
import TurnstileWidget from "@/components/TurnstileWidget.vue";
import {message} from "ant-design-vue";


// docs: https://www.npmjs.com/package/vue-cloudflare-turnstile

const route = useRoute();
const router = useRouter();
// 获取组件ref，用来调用execute()
const turnstileRef = ref<InstanceType<typeof VueTurnstile> | null>(null);


const onSuccess = async (cfToken: string) => {
  console.log("Turnstile token:", cfToken);
  sessionStorage.setItem("pre_verify_token", 'xxxx');
  try {
    // 1. 请求后端预检接口
    const res = await instance.post("/api/auth/pre-verify", {
      "cf-turnstile-response": cfToken,
    });
    // 2. 保存凭证到sessionStorage，路由守卫识别这个key
    sessionStorage.setItem("pre_verify_token", res.data.pre_token);

    // 3. 跳回原来要访问的页面
    const redirectUrl = (route.query.redirect as string) || "/login/";
    router.replace(redirectUrl);
  } catch (err) {
    console.error("预检接口失败", err);
    // 失败重置验证码，让用户重新验证
    // turnstileRef.value?.reset();
  }
};

const onError = (errCode: string) => {
  console.error("turnstile故障错误码：", errCode)
  // 110200 = 域名不在授权名单（90%线上域名故障是这个）
}

const SITE_KEY = config.TURNSTILE_SITE_KEY;
const captchaRef = ref<InstanceType<typeof TurnstileWidget>>()
const captchaToken = ref('')

function onCaptchaSuccess(token: string) {
  captchaToken.value = token
}

function onCaptchaError(e) {
  captchaToken.value = ''
  console.info(e)
}
function onCaptchaExpired() {
  captchaToken.value = ''
  message.warning('安全验证已过期，请等待重新校验')
}
</script>

<template>
  <a-flex style="min-height: 100vh" align="center" justify="center">
<!--    <TurnstileWidget-->
<!--        ref="captchaRef"-->
<!--        :site-key="SITE_KEY"-->
<!--        action="login"-->
<!--        mode="normal"-->
<!--        @success="onCaptchaSuccess"-->
<!--        @error="onCaptchaError"-->
<!--        @expired="onCaptchaExpired"-->
<!--    />-->
    <VueTurnstile
      :site-key="SITE_KEY"
      @success="onSuccess"
    />
  </a-flex>
</template>

<style scoped>
</style>
