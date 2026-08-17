<template>
  <div ref="container"></div>
</template>

<script setup lang="ts">
import {
  ref,
  onMounted,
  onBeforeUnmount,
  defineExpose
} from 'vue'


interface Props {
  siteKey?: string
  theme?: 'auto' | 'light' | 'dark'
  size?: 'normal' | 'compact' | 'flexible'
  action?: string
}

const props = withDefaults(defineProps<Props>(), {
  siteKey: '0x4AAAAAAESdeo4CxkDVW1Rh',
  theme: 'auto',
  size: 'normal',
  action: 'submit'
})


const emit = defineEmits<{
  success: [token: string]
  error: [error: string]
  expired: []
}>()


const container = ref<HTMLDivElement>()

let widgetId: string | undefined


/**
 * 加载 Turnstile JS
 */
function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {

    if (window.turnstile) {
      resolve()
      return
    }


    const script = document.createElement('script')

    script.src =
      'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

    script.async = true
    script.defer = true


    script.onload = () => {
      resolve()
    }

    script.onerror = () => {
      reject(new Error('Turnstile script load failed'))
    }


    document.head.appendChild(script)
  })
}



/**
 * 初始化 widget
 */
async function render() {

  await loadScript()


  if (!container.value) {
    return
  }


  widgetId = window.turnstile.render(
    container.value,
    {
      sitekey: props.siteKey,

      theme: props.theme,

      size: props.size,

      action: props.action,


      callback(token:string){

        emit(
          'success',
          token
        )
      },


      'error-callback'(error:string){

        emit(
          'error',
          error
        )
      },


      'expired-callback'(){

        emit(
          'expired'
        )
      }
    }
  )
}



/**
 * 手动刷新验证
 */
function reset(){

  if(widgetId){
    window.turnstile.reset(widgetId)
  }

}



/**
 * 获取当前token
 */
function getToken(){

  if(widgetId){

    return window.turnstile.getResponse(widgetId)

  }

  return null
}



/**
 * 销毁
 */
function destroy(){

  if(widgetId){

    window.turnstile.remove(widgetId)

    widgetId = undefined
  }

}



defineExpose({

  reset,

  getToken,

  render,

  destroy

})



onMounted(()=>{

  render()

})



onBeforeUnmount(()=>{

  destroy()

})

</script>