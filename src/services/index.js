// index.js
import {ref} from 'vue';
import 'axios';
import axios from "axios";
import { message } from 'ant-design-vue';
import router from "../router";

//-------------------------1.创建axios实例-----------------------
const instance=axios.create({
    baseURL: import.meta.env.VITE_APP_BASE_URL, // 所有的请求地址前缀部分,
    timeout: 5000, // 请求超时时间
    withCredentials: true, // 异步请求携带cookie
    headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "accept": "application/json"
    }
});

//-------------------------2.请求拦截-----------------------
instance.interceptors.request.use(
    config => {
        let access_token = localStorage.getItem('access_token');
        if (access_token) {
            config.headers['Authorization'] = `Bearer ${access_token}`
        }
        //加载loading
        addLoading();
        return config;
    },
    error => {
        //请求发生错误，抛出异常
        Promise.reject(error);
    }
);

// -------------------------3.响应拦截-----------------------
instance.interceptors.response.use(
  res => {
    // 取消加载 loading
    cancelLoading();
    return res;
  },
  error => {
    // 取消加载 loading
    cancelLoading();
    if (error && error.response) {
      const status = error.response.status
      switch (status) {
        case 400:
          message.error("请求错误");
          break;
        case 401:
          message.error("未授权，请重新登录");
          // 跳转到登录页面
          localStorage.removeItem('access_token');
          router.push('/login/')
          break;
        case 403:
          message.error("登录过期，请重新登录");
          break;
        case 404:
          message.error("请求错误，未找到相应的资源");
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
          message.error("请求失败");
      }
    } else {
      if (JSON.stringify(error).includes("timeout")) {
        error.code = "TIMEOUT";
        error.message = "服务器响应超时，请刷新页面";
      }
    }
    return Promise.reject(error);
  },

);

// -------------------------4.配置全局loading-----------------------
let loadCount = 0;
let loadingInstance = ref(null);
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
  loadCount--;
  if (loadCount === 0) {
    // loadingInstance.value.close();
      console.info("数据加载完成...")
  };
};
// -------------------------配置全局loading-----------------------
// 5.导出 axios 实例
export default instance;
