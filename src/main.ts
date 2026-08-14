import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersist from 'pinia-plugin-persistedstate';
import router from "./router";
import "./common/config.ts"; // 全局配置文件
import './style.css'
import App from './App.vue'
import {registerStore} from "./stores";
import {checkHealth, initEndpoints} from "./common/endpoint-detector.ts";
import {logger} from "./common/utils.ts";
import {message} from "ant-design-vue";
import {config} from "./common/config.ts";
import {apiUrls} from "./services/api.ts";

let app: ReturnType<typeof createApp>

/**
 * 创建原生阻塞等待遮罩（Vue未启动前可用）
 */
function createBlockingMask() {
  const mask = document.createElement('div')
  mask.id = '__endpoint_detect_mask'
  mask.style.cssText = `
    position:fixed;
    inset:0;
    background:#fff;
    display:flex;
    flex-direction:column;
    gap:16px;
    align-items:center;
    justify-content:center;
    z-index:99999;
    color:#666;
    font-size:15px;
  `
  mask.innerHTML = `
    <div style="width:42px;height:42px;border:3px solid #e8e8e8;border-top:3px solid #027AFF;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
    <div>正在自动寻找可用服务节点，请稍候...</div>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
  `
  document.body.appendChild(mask)
}

/**
 * 移除阻塞遮罩
 */
function removeBlockingMask() {
  const mask = document.getElementById('__endpoint_detect_mask')
  if (mask) mask.remove()
}

async function bootstrap() {
  const currentBaseUrl = config.API_BASE_URL
  const healthUrl = `${currentBaseUrl}${apiUrls.check_health()}`
  const timeoutMs = 10000

  // 预检当前正在使用的地址
  const currentOk = await checkHealth(healthUrl, timeoutMs).catch(() => false)

  if (currentOk) {
    logger.log(`当前地址 ${currentBaseUrl} 健康检测正常，直接启动应用`);
    // 页面先渲染，不阻塞
    startVueApp();

    // 后台异步探测所有节点（静默执行）
    initEndpoints()
      .then(endpoints => {
        logger.log('后台端点探测完成，可用列表：', endpoints);
        // 在这里你可以增加逻辑：发现更好节点弹窗询问切换
      })
      .catch(err => {
        logger.warn('后台端点探测异常', err)
      })

  } else {
    logger.warn(`当前地址 ${currentBaseUrl} 无法连通，开始全量探测节点`);
    createBlockingMask()
    try {
      // 阻塞等待寻找可用地址
      const endpoints = await initEndpoints(true);
      logger.log('探测到可用服务地址：', endpoints);
      message.info('已自动切换可用服务节点，页面即将重载');
      setTimeout(() => location.reload(), 800);
    } catch (err) {
      logger.error('未找到任何可用服务地址', err);
      message.error('无法连接服务，请检查网络或稍后重试');
      // 依旧启动页面，允许用户进入设置手动更换地址
      startVueApp();
    }
  }
}
// 抽离Vue实例启动函数
function startVueApp() {
  removeBlockingMask();
  app = createApp(App);
  const pinia = createPinia()
  pinia.use(piniaPluginPersist)
  app.use(pinia);
  registerStore();
  app.use(router).mount('#app')
}

bootstrap();
