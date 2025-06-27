import { createApp } from 'vue'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import { createPinia } from 'pinia'
import router from './src/router/index.js'
import axios from 'axios'
import { ElMessage } from 'element-plus'

const app = createApp(App)
app.use(ElementPlus, { locale: zhCn })
app.use(createPinia())
app.use(router)

// 全局响应拦截器，token过期自动跳转登录
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('login-info')
      ElMessage.error('登录已过期，请重新登录')
      router.replace('/login')
    }
    return Promise.reject(error)
  }
)

// 设置axios基础地址，优先本地存储（如无则用环境变量）
const getApiBase = () => localStorage.getItem('api-base') || import.meta.env.VITE_API_BASE || 'http://localhost:3001';
axios.defaults.baseURL = getApiBase();
window.setApiBase = (url) => {
  localStorage.setItem('api-base', url);
  axios.defaults.baseURL = url;
  ElMessage.success('API基础地址已切换为：' + url);
};

app.mount('#app') 