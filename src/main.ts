import {createApp} from 'vue'
import {createPinia} from 'pinia'
import piniaPluginPersist from 'pinia-plugin-persistedstate';
import router from "./router";
import "./common/config.ts"; // 全局配置文件
import './style.css'
import App from './App.vue'
import {registerStore} from "./stores";
import {checkHealth, initEndpoints} from "./common/endpoint-detector.ts";
import {logger} from "./common/utils.ts";
import {config} from "./common/config.ts";
import {apiUrls} from "./services/api.ts";
import {MessagePlugin} from 'tdesign-vue-next';
import {canAutoDetect, getDetectState, recordDetectFail, resetDetectState} from "./common/detectPersist.ts";

let app: ReturnType<typeof createApp>
let detectingLock = false // 探测锁，防止并发重复探测
let detectTimer: number | null = null // 保存定时器ID，用于清除

/** 清除探测定时器 */
function clearDetectTimer() {
    if (detectTimer !== null) {
        clearInterval(detectTimer)
        detectTimer = null
        logger.log('探测定时器已清除')
    }
}

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
    <div style="position:relative;width:42px;height:42px;">
    <div style="position:absolute;inset:0;border:3px solid #e8e8e8;border-top:3px solid #027AFF;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
    <img src="/src/assets/logo.svg" style="position:absolute;inset:0;width:24px;height:24px;margin:auto;border-radius:50%;" alt="logo" />
  </div>
  <div style="margin-top:8px;">正在自动寻找可用服务节点，请稍候...</div>
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

async function backgroundDetectTask() {
    if (detectingLock) return
    if (!canAutoDetect()) {
        const st = getDetectState()
        logger.log(`自动探测未到时间：连续失败${st.failCount}次，下次探测：${new Date(st.nextDetectTimestamp).toLocaleString()}`)
        // ⚠️即使未到探测时间，也要判断：是否已经达到3次失败，需要释放页面
        if (st.failCount === 3) {
            await MessagePlugin.error(`已尝试3次连接服务均失败，请检查网络，系统将后台继续重试`)
        }
        return
    }

    const stBefore = getDetectState()
    logger.log(`backgroundDetectTask: 进入，当前failCount=${stBefore.failCount}, nextDetect=${new Date(stBefore.nextDetectTimestamp).toLocaleString()}`)
    detectingLock = true

    try {
        logger.info('后台执行端点自动探测')
        const endpoints = await initEndpoints(false)
        const ok = await checkHealth(endpoints['api'], 10000).catch(() => false);
        if (!ok) {
            throw new Error(`最终选中API地址健康校验失败:${endpoints['api']}`)
        }
        clearDetectTimer()
        // ✅后台探测成功，找到可用节点
        resetDetectState()
        logger.log('后台端点探测完成，可用列表：', endpoints)
        removeBlockingMask()
        await MessagePlugin.info('已自动切换可用服务节点，页面即将重载');
        detectTimer = setTimeout(() => location.reload(), 60 * 1000);
    } catch (err) {
        logger.warn('后台端点探测失败', err)
        const st = recordDetectFail()
        logger.log(`自动探测记录失败，当前连续失败:${st.failCount}，下次探测时间:${new Date(st.nextDetectTimestamp).toLocaleString()}`)
        // ✅累计3次失败：释放遮罩，启动Vue应用，给用户提示
        if (st.failCount === 3) {
            await MessagePlugin.error(`已尝试3次连接服务均失败，请检查网络，系统将后台继续重试`)
        }
    } finally {
        detectingLock = false
    }
}

async function bootstrap() {
    const currentBaseUrl = config.API_BASE_URL
    const healthUrl = `${currentBaseUrl}${apiUrls.check_health()}`
    const timeoutMs = 10000

    // 预检当前正在使用的地址
    const ok = await checkHealth(healthUrl, timeoutMs).catch(() => false)

    if (ok) {
        logger.log(`当前地址 ${currentBaseUrl} 健康检测正常，直接启动应用`);
        // ✏️重要：这里不要无条件 resetDetectState()
        // 场景：页面刷新，但是后端服务还没恢复，不应该抹掉之前积累的失败计数
        // 只有【本次健康检测成功】才重置，但是注意：页面刷新，JS内存状态丢失，localStorage状态保留
        resetDetectState() // 当前主地址健康，说明服务恢复，重置探测状态 ✅这个保留没问题
        startVueApp();

        // 后台静默探测节点
        initEndpoints(false)
            .then(endpoints => {
                logger.log('后台端点探测完成，可用列表：', endpoints);
            })
            .catch(err => {
                logger.warn('后台端点探测异常', err)
            })

        // 每分钟检查一次是否该探测；内部会做退避判断，不会频繁请求
        detectTimer = setInterval(() => {
            backgroundDetectTask()
        }, 60 * 1000)

    } else {
        logger.warn(`当前地址 ${currentBaseUrl} 无法连通，开始全量探测节点`);
        createBlockingMask()
        try {
            const endpoints = await initEndpoints(true);
            const healthUrl = `${endpoints.api}${apiUrls.check_health()}`;
            const ok = await checkHealth(healthUrl, 10 * 1000).catch(() => false)
            if (!ok) {
                throw new Error(`最终选中API地址健康校验失败:${healthUrl}`)
            }
            clearDetectTimer();
            resetDetectState();
            logger.log('探测到可用服务地址：', endpoints);
            await MessagePlugin.info('已自动切换可用服务节点，页面即将重载');
            setTimeout(() => location.reload(), 3*1000);
        } catch (err) {
            logger.error('未找到任何可用服务地址', err);
            recordDetectFail()
            detectTimer = setInterval(() => {
                backgroundDetectTask()
            }, 60 * 1000)
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
