/**
 * 应用入口
 *
 * 启动流程（顺序很关键）：
 * 1. 先对"当前配置里的 API 地址"做一次健康检查；
 * 2. 健康 → 直接挂载 Vue 应用，并在后台静默探测其它可用节点；
 *    不健康 → 全量探测所有节点，找到可用节点后刷新页面；
 * 3. 探测失败会累加失败计数（localStorage 持久化），达到 3 次后
 *    放开遮罩让用户进入页面，并转为"后台定时重试 + 退避"策略。
 *
 * 这里的遮罩复用 index.html 中已存在的 DOM（#global-splash），
 * 避免 JS 再创建一份造成首屏闪烁。
 */
import {createApp} from 'vue';
import {createPinia} from 'pinia';
import piniaPluginPersist from 'pinia-plugin-persistedstate';
import router from './router';
import './common/config.ts'; // 全局配置文件
import './style.css';
import App from './App.vue';
import {registerStore} from './stores';
import {checkHealth, initEndpoints} from './common/endpoint-detector.ts';
import {logger} from './common/utils.ts';
import {config} from './common/config.ts';
import {apiUrls} from './services/api.ts';
import {MessagePlugin} from 'tdesign-vue-next';
import {canAutoDetect, getDetectState, recordDetectFail, resetDetectState} from './common/detectPersist.ts';
import 'virtual:svg-icons-register';

/** Vue 应用实例（在 startVueApp 中创建） */
let app: ReturnType<typeof createApp>;
/** 探测锁，防止并发重复探测 */
let detectingLock = false;
/** 定时器 ID，用于清除（轮询探测用的 setInterval/setTimeout） */
let detectTimer: number | null = null;

/**
 * 【优雅方案】复用 index.html 里面已经写好的全局遮罩，仅更新文字
 * @param text 展示给用户的提示文案
 */
function updateSplashText(text: string) {
  const splash = document.getElementById('global-splash');
  if (!splash) return;
  const tipDom = splash.querySelector('.tip-text');
  if (tipDom) {
    tipDom.textContent = text;
  }
}

/**
 * 淡出关闭全局启动遮罩
 * 同时解除 index.html 中对 #app 的 display:none 锁定
 */
function hideGlobalSplash() {
  const splash = document.getElementById('global-splash');
  if (!splash) return;
  splash.style.opacity = '0';
  setTimeout(() => splash.remove(), 350);
  // 解锁Vue容器
  const appRoot = document.getElementById('app');
  if (appRoot) appRoot.style.display = 'block';
}

/** 清除探测定时器 */
function clearDetectTimer() {
  if (detectTimer !== null) {
    clearInterval(detectTimer);
    detectTimer = null;
    logger.log('探测定时器已清除');
  }
}

/**
 * 后台探测任务：由定时器每分钟触发一次
 * 内部会通过 canAutoDetect() 做退避判断，真正需要探测时才会发请求
 */
async function backgroundDetectTask() {
  if (detectingLock) return;
  if (!canAutoDetect()) {
    const st = getDetectState();
    logger.log(
      `自动探测未到时间：连续失败${st.failCount}次，下次探测：${new Date(st.nextDetectTimestamp).toLocaleString()}`,
    );
    // ⚠️即使未到探测时间，也要判断：是否已经达到3次失败，需要释放页面
    if (st.failCount === 3) {
      await MessagePlugin.error(`已尝试3次连接服务均失败，请检查网络，系统将后台继续重试`);
    }
    return;
  }

  const stBefore = getDetectState();
  logger.log(
    `backgroundDetectTask: 进入，当前failCount=${stBefore.failCount}, nextDetect=${new Date(stBefore.nextDetectTimestamp).toLocaleString()}`,
  );
  detectingLock = true;

  try {
    logger.info('后台执行端点自动探测');
    const endpoints = await initEndpoints(false);
    const ok = await checkHealth(endpoints['api'], 10000).catch(() => false);
    if (!ok) {
      throw new Error(`最终选中API地址健康校验失败:${endpoints['api']}`);
    }
    clearDetectTimer();
    // ✅后台探测成功，找到可用节点
    resetDetectState();
    logger.log('后台端点探测完成，可用列表：', endpoints);
    hideGlobalSplash();
    await MessagePlugin.info('已自动切换可用服务节点，页面即将重载');
    // 给用户一点时间看完提示再刷新
    detectTimer = setTimeout(() => location.reload(), 60 * 1000);
  } catch (err) {
    logger.warn('后台端点探测失败', err);
    const st = recordDetectFail();
    logger.log(
      `自动探测记录失败，当前连续失败:${st.failCount}，下次探测时间:${new Date(st.nextDetectTimestamp).toLocaleString()}`,
    );
    // ✅累计3次失败：释放遮罩，启动Vue应用，给用户提示
    if (st.failCount === 3) {
      await MessagePlugin.error(`已尝试3次连接服务均失败，请检查网络，系统将后台继续重试`);
    }
  } finally {
    detectingLock = false;
  }
}

/**
 * 启动引导：健康检查 + 节点探测
 * 根据当前地址是否可用，决定"直接启动"还是"探测后刷新"
 */
async function bootstrap() {
  const currentBaseUrl = config.API_BASE_URL;
  const healthUrl = `${currentBaseUrl}${apiUrls.check_health()}`;
  const timeoutMs = 10000;

  // 更新遮罩文字，提示正在探测服务
  updateSplashText('正在自动寻找可用服务节点，请稍候...');

  // 预检当前正在使用的地址
  const ok = await checkHealth(healthUrl, timeoutMs).catch(() => false);

  if (ok) {
    logger.log(`当前地址 ${currentBaseUrl} 健康检测正常，直接启动应用`);
    // ✏️重要：这里不要无条件 resetDetectState()
    // 场景：页面刷新，但是后端服务还没恢复，不应该抹掉之前积累的失败计数
    // 只有【本次健康检测成功】才重置，但是注意：页面刷新，JS内存状态丢失，localStorage状态保留
    resetDetectState(); // 当前主地址健康，说明服务恢复，重置探测状态 ✅这个保留没问题
    startVueApp();

    // 后台静默探测节点
    initEndpoints(false)
      .then((endpoints) => {
        logger.log('后台端点探测完成，可用列表：', endpoints);
      })
      .catch((err) => {
        logger.warn('后台端点探测异常', err);
      });

    // 每分钟检查一次是否该探测；内部会做退避判断，不会频繁请求
    detectTimer = setInterval(() => {
      backgroundDetectTask();
    }, 60 * 1000);
  } else {
    logger.warn(`当前地址 ${currentBaseUrl} 无法连通，开始全量探测节点`);
    try {
      const endpoints = await initEndpoints(true);
      const healthUrl = `${endpoints.api}${apiUrls.check_health()}`;
      const ok = await checkHealth(healthUrl, 10 * 1000).catch(() => false);
      if (!ok) {
        throw new Error(`最终选中API地址健康校验失败:${healthUrl}`);
      }
      clearDetectTimer();
      resetDetectState();
      logger.log('探测到可用服务地址：', endpoints);
      await MessagePlugin.info('已自动切换可用服务节点，页面即将重载');
      setTimeout(() => location.reload(), 3 * 1000);
    } catch (err) {
      logger.error('未找到任何可用服务地址', err);
      recordDetectFail();
      // 转入后台定时重试（配合退避策略，不会高频请求）
      detectTimer = setInterval(() => {
        backgroundDetectTask();
      }, 60 * 1000);
    }
  }
}

/**
 * 抽离Vue实例启动函数
 * 注意顺序：先装 pinia（registerStore 依赖它），再装 router，最后挂载
 */
function startVueApp() {
  app = createApp(App);
  const pinia = createPinia();
  pinia.use(piniaPluginPersist);
  app.use(pinia);
  registerStore();
  app.use(router).mount('#app');
  // Vue渲染完毕，淡出遮罩
  hideGlobalSplash();
}

bootstrap();
