<script setup lang="ts">
/**
 * 人机预检页（TwoStepVerificationPage / 两步验证页）
 *
 * 路由路径：/two-step-verification?redirect=原目标地址
 * 页面用途：被路由守卫拦截后跳转至此，强制完成 Cloudflare Turnstile 人机验证。
 * 数据来源：apiUrls.two_step_verification()（携带 cf_turnstile_token）。
 * 主要交互：
 *   1. 用户完成 Turnstile 验证 → @success 回调；
 *   2. 调用后端预检接口，成功后把凭证写入 sessionStorage；
 *   3. 路由守卫检测到该凭证后放行，跳转回 redirect 原页面。
 */
import {ref} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {config} from '@/common/config.ts';
import {VueTurnstile} from 'vue-cloudflare-turnstile';
import instance from '@/services';
import {apiUrls} from '@/services/api.ts';
import {logger} from '@/common/utils.ts';

// docs: https://www.npmjs.com/package/vue-cloudflare-turnstile

// 用 useRoute 取当前路由：原先的 getCurrentInstance().proxy.$route 在 <script setup> 下
// 类型为 null（TS18047），且 query 值类型过宽无法直接传给 router.push
const route = useRoute();
const router = useRouter();
const turnstileRef = ref();

/**
 * Turnstile 验证成功回调
 * @param cfToken Cloudflare 返回的人机验证 token
 */
const onSuccess = async (cfToken: string) => {
  try {
    // 1. 请求后端预检接口
    const res = await instance.post(
      apiUrls.two_step_verification(),
      {
        cf_turnstile_token: cfToken,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
    // 2. 保存凭证到 sessionStorage，路由守卫识别这个 key 后放行
    sessionStorage.setItem('two_step_verification_success', res.data.success);

    // 3. 跳回原来要访问的页面（redirect 由守卫写入；缺省回首页）
    // query 值可能是 string | string[] | null，只有非空字符串才可作为跳转目标
    const redirect = route.query.redirect;
    await router.push(typeof redirect === 'string' && redirect ? redirect : '/');
  } catch (err) {
    logger.error('预检接口失败', err);
    // 失败重置验证码，让用户重新验证
    turnstileRef.value?.reset();
  }
};

const onError = (e: any) => {
  logger.error(e);
};
</script>

<template>
  <div style="min-height: 100vh; display: flex; justify-content: center; align-items: center">
    <t-space direction="vertical">
      <t-typography-text
        >本网站使用安全服务防护恶意自动程序。在验证您不是自动程序期间，将显示此页面。</t-typography-text
      >
      <VueTurnstile ref="turnstileRef" :site-key="config.TURNSTILE_SITE_KEY" @success="onSuccess" @error="onError" />
    </t-space>
  </div>
</template>

<style scoped></style>
