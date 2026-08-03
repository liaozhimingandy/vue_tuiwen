import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersist from 'pinia-plugin-persistedstate';
import router from "./router";
import "./common/config.ts"; // 全局配置文件
import './style.css'
import App from './App.vue'
import {registerStore} from "./stores";
import VueSocialSharing  from 'vue-social-sharing'

const app = createApp(App);

// 创建Pinia实例
const pinia = createPinia()
pinia.use(piniaPluginPersist)
app.use(pinia);
// 分享插件
app.use(VueSocialSharing );

// 注册pinia状态管理库
registerStore();
app.use(router).mount('#app')
