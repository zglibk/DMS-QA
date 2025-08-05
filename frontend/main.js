/**
 * 前端应用程序主入口文件
 *
 * 功能说明：
 * 1. 创建Vue应用实例并配置全局插件
 * 2. 配置axios请求/响应拦截器
 * 3. 设置API基础地址管理
 * 4. 初始化网站配置并启动应用
 *
 * 技术栈：
 * - Vue 3 (组合式API)
 * - Element Plus (UI组件库，中文本地化)
 * - Pinia (状态管理)
 * - Vue Router (路由管理)
 * - Axios (HTTP请求库)
 */

// 导入Vue核心库
import { createApp } from 'vue'
// 导入根组件
import App from './App.vue'
// 导入Element Plus UI组件库
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
// 导入Element Plus中文本地化配置
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
// 导入状态管理库
import { createPinia } from 'pinia'
// 导入路由配置
import router from './src/router/index.js'
// 导入HTTP请求库
import axios from 'axios'
// 导入Element Plus消息组件
import { ElMessage } from 'element-plus'
// 导入网站配置管理组合式函数
import { useSiteConfig } from './src/composables/useSiteConfig.js'

// 创建Vue应用实例
const app = createApp(App)

// 配置Element Plus UI组件库，使用中文本地化
app.use(ElementPlus, { locale: zhCn })
// 安装Pinia状态管理插件
app.use(createPinia())
// 安装Vue Router路由插件
app.use(router)

/**
 * 全局请求拦截器
 * 功能：自动为所有请求添加JWT认证token
 *
 * 工作流程：
 * 1. 从localStorage获取token
 * 2. 如果token存在，添加到请求头的Authorization字段
 * 3. 格式：Bearer <token>
 */
axios.interceptors.request.use(
  config => {
    // 从本地存储获取JWT token
    const token = localStorage.getItem('token')
    if (token) {
      // 添加Bearer认证头
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  // 请求错误处理
  error => Promise.reject(error)
)
/**
 * 初始化API配置
 * 直接使用vite配置的代理路径，简化配置逻辑
 */
const initializeApi = () => {
  // 直接使用vite配置的代理路径
  // 开发环境：vite会将/api代理到localhost:3001
  // 生产环境：nginx或其他代理服务器处理/api路径
  axios.defaults.baseURL = '/api';
  console.log('✅ API配置完成，使用vite代理路径:', axios.defaults.baseURL);
};

/**
 * 应用初始化函数
 * 功能：在挂载应用前加载必要的配置
 *
 * 工作流程：
 * 1. 检查并恢复用户登录状态
 * 2. 加载网站配置（logo、标题等）
 * 3. 处理加载失败的情况
 * 4. 挂载Vue应用到DOM
 */
const initApp = async () => {
  try {
    // 1. 首先进行API配置
    initializeApi();

    // 2. 检查并恢复用户登录状态（简化版本，避免与路由守卫冲突）
    const token = localStorage.getItem('token');
    if (token) {
      try {
        // 动态导入userStore以避免循环依赖
        const { useUserStore } = await import('./src/store/user.js');
        const userStore = useUserStore();

        // 只设置token到store中，不在这里验证
        // 让路由守卫统一处理用户信息获取和验证
        userStore.setToken(token);
      } catch (error) {
        // 静默处理token设置失败
      }
    }

    // 3. 加载网站配置
    const { loadSiteConfig } = useSiteConfig();
    await loadSiteConfig();
  } catch (error) {
    // 配置加载失败不影响应用启动
    console.warn('应用初始化过程中出现警告:', error);
  }

  // 4. 将Vue应用挂载到id为'app'的DOM元素
  app.mount('#app');
};

// 启动应用
initApp();