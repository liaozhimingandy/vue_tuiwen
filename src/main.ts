import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from "./router";
import './style.css'
import App from './App.vue'
import {registerStore} from "./stores";

const app = createApp(App);

// 创建Pinia实例
const pinia = createPinia()
app.use(pinia);

// 注册pinia状态管理库
registerStore();

app.use(router).mount('#app')
