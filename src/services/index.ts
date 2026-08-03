// index.ts
import 'axios';
import axios from "axios";
import {message} from 'ant-design-vue';
import router from "../router";
// @ts-ignore
import {config} from "@/common/config.ts";
// @ts-ignore
import appStore from "@/stores/index.js";
// @ts-ignore
import type {IToken} from "@/interface";

// 登录跳转锁：防止多个请求同时401重复跳转登录页
let isRedirectLogin = false;

//-------------------------1.创建axios实例-----------------------
const instance = axios.create({
    baseURL: config.API_BASE_URL, // 所有的请求地址前缀部分,
    timeout: 1000, // 请求超时时间
    withCredentials: true, // 异步请求携带cookie
    headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "accept": "application/json"
    }
});

//-------------------------2.请求拦截-----------------------
instance.interceptors.request.use(
    (config) => {
        const accountStore = appStore.useAccountStore;
        const token: IToken = accountStore.token;
        if (token.access_token) {
            config.headers['Authorization'] = `Bearer ${token.access_token}`
        }
        //加载loading
        addLoading();
        return config;
    },
    (error: any) => {
        //请求发生错误，抛出异常
        cancelLoading();
        return Promise.reject(error);
    }
);

// -------------------------3.响应拦截-----------------------
instance.interceptors.response.use(
    (res: any) => {
        // 取消加载 loading
        cancelLoading();
        return res;
    },
    (error: any) => {
        // 取消加载 loading
        cancelLoading();

        const {response, code, config} = error || {};
        // 方案：单个接口可传入 customOptions:{ hideError: true } 关闭全局弹窗
        const hideGlobalError = config?.customOptions?.hideError;
        if (hideGlobalError) return Promise.reject(error);

        // 1. 网络无响应 / 超时场景（没有response对象）
        if (!response) {
            // axios原生超时标识 ECONNABORTED
            if (code === 'ECONNABORTED') {
                message.warning('请求超时，请稍后重试');
            } else {
                message.error('网络连接失败，请检查网络');
            }
            return Promise.reject(error);
        }

        // 2. 后端返回状态码
        const status: Number = response.status;
        const detail: any = response.data?.detail || '';

        switch (status) {
            case 400:
                message.error(detail || '参数错误');
                break;
            case 401:
                if (!isRedirectLogin) {
                    isRedirectLogin = true;
                    message.error("未授权，请重新登录");
                    // 清空登录状态
                    // const accountStore = appStore.useAccountStore;
                    // accountStore.logout();
                    router.push({name: "login"}).finally(() => {
                        isRedirectLogin = false;
                    });
                }
                break;
            case 403:
                message.error("登录过期，权限不足，请重新登录");
                break;
            case 404:
                message.error(detail || '接口地址不存在');
                break;
            case 408:
                message.error("请求超时");
                break;
            case 500:
                message.error("服务器错误");
                break;
            case 504:
                message.error("网络超时");
                break;
            default:
                message.error(detail || `请求失败[${status}]`);
        }

        return Promise.reject(error);
    },
);

// -------------------------4.配置全局loading-----------------------
let loadCount = 0;
// let loadingInstance = ref(null);
// 加载loading
const addLoading = () => {
    loadCount++;
    if (loadCount === 1) {
        // loadingInstance.value = ElLoading.service({
        //   fullscreen: false,
        //   text: "正在请求数据中....",
        //   background: "rgba(0, 0, 0, 0)",
        // });
        console.info("数据正在加载...")
    }

};
// 取消加载loading
const cancelLoading = () => {
    if (loadCount > 0) loadCount--;
    if (loadCount === 0) {
        // loadingInstance.value.close();
        console.info("数据加载完成...")
    }
    ;
};
// -------------------------配置全局loading-----------------------
// 5.导出 axios 实例
export default instance;
