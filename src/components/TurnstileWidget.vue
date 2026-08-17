<template>
  <div ref="containerRef"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

/**
 * Cloudflare Turnstile 人机验证组件
 * - normal：可见组件，页面加载自动渲染（登录/注册页用）
 * - invisible：无感模式，需手动调用 execute 触发（发送验证码用）
 * - 显式渲染，路由切换自动销毁，无内存泄漏
 */
interface Props {
  /** 站点公钥，Cloudflare 后台获取 */
  siteKey: string
  /** 场景标识，后端可校验，如 login / register / send_code */
  action?: string
  /** 组件模式 */
  mode?: 'normal' | 'invisible'
  /** 主题：light / dark / auto */
  theme?: 'light' | 'dark' | 'auto'
}

const props = withDefaults(defineProps<Props>(), {
  action: 'verify',
  mode: 'normal',
  theme: 'auto'
})

const emit = defineEmits<{
  success: [token: string]
  expired: []
  error: []
}>()

const containerRef = ref<HTMLDivElement | null>(null)
let widgetId: string | null = null

// 渲染组件实例
function renderWidget() {
  if (!window.turnstile || !containerRef.value) return

  widgetId = window.turnstile.render(containerRef.value, {
    sitekey: props.siteKey,
    action: props.action,
    theme: props.theme,
    size: props.mode,
    callback: (token: string) => emit('success', token),
    'expired-callback': () => emit('expired'),
    'error-callback': () => emit('error')
  })
}

/** 无感模式手动触发验证（仅 invisible 生效） */
const execute = () => {
  if (widgetId && window.turnstile) {
    window.turnstile.execute(widgetId)
  }
}

/** 重置组件，业务失败后必须调用（token 一次性） */
const reset = () => {
  if (widgetId && window.turnstile) {
    window.turnstile.reset(widgetId)
  }
}

defineExpose({ execute, reset })

// 自动加载官方 JS 脚本（全局单例，避免重复加载）
function loadTurnstileScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) {
      resolve()
      return
    }
    const existScript = document.querySelector('script[src*="turnstile/v0/api.js"]')
    if (existScript) {
      existScript.addEventListener('load', () => resolve())
      existScript.addEventListener('error', () => reject())
      return
    }

    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Turnstile script load failed'))
    document.head.appendChild(script)
  })
}

onMounted(async () => {
  try {
    await loadTurnstileScript()
    renderWidget()
  } catch {
    emit('error')
  }
})

onBeforeUnmount(() => {
  // 路由切换销毁组件，防止内存泄漏与重复渲染
  if (widgetId && window.turnstile) {
    window.turnstile.remove(widgetId)
    widgetId = null
  }
})
</script>
