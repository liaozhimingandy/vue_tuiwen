import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersist from 'pinia-plugin-persistedstate';
import router from "./router";
import "./common/config.ts"; // 全局配置文件
import './style.css'
import App from './App.vue'
import {registerStore} from "./stores";
import VueSocialSharing  from 'vue-social-sharing'

import { ConfigProvider } from 'ant-design-vue';
import zhCN from 'ant-design-vue/es/locale/zh_CN'; // 中文语言包
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn'; // 必须引入 dayjs 中文 locale

// 设置 dayjs 全局语言
dayjs.locale('zh-cn');

const app = createApp(App);
app.use(ConfigProvider, {locale: zhCN,})

// 创建Pinia实例
const pinia = createPinia()
pinia.use(piniaPluginPersist)
app.use(pinia);
// 分享插件
app.use(VueSocialSharing );

// 注册pinia状态管理库
registerStore();
app.use(router).mount('#app')
