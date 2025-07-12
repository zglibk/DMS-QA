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
 * 全局响应拦截器
 * 功能：处理token过期和认证失败的情况
 *
 * 工作流程：
 * 1. 检查响应状态码
 * 2. 如果是401（未授权），说明token过期或无效
 * 3. 清除本地存储的认证信息
 * 4. 显示错误消息并跳转到登录页
 */
axios.interceptors.response.use(
  // 响应成功处理
  response => response,
  // 响应错误处理
  error => {
    // 检查是否为401未授权错误
    if (error.response && error.response.status === 401) {
      // 清除本地存储的认证信息
      localStorage.removeItem('token')
      localStorage.removeItem('login-info')
      // 显示错误消息
      ElMessage.error('登录已过期，请重新登录')
      // 跳转到登录页面
      router.replace('/login')
    }
    return Promise.reject(error)
  }
)

/**
 * API基础地址管理
 * 功能：支持动态切换后端API地址，方便开发和部署
 *
 * 优先级：
 * 1. 本地存储的api-base（用户手动设置）
 * 2. 智能检测的最佳API地址
 * 3. 环境变量VITE_API_BASE
 * 4. 默认地址 http://localhost:3001
 */
const getApiBase = () => localStorage.getItem('api-base') || import.meta.env.VITE_API_BASE || 'http://localhost:3001';

// 初始设置axios默认基础URL
axios.defaults.baseURL = getApiBase();

// 导入智能检测器
import smartApiDetector from './src/utils/smartApiDetector.js';

// 智能检测并设置最佳API地址
const initializeSmartApi = async () => {
  try {
    const manualApiBase = localStorage.getItem('api-base');
    console.log('🔍 检查本地存储的API设置:', manualApiBase);
    console.log('🔍 当前axios.defaults.baseURL:', axios.defaults.baseURL);

    // 如果用户没有手动设置API地址，则使用智能检测
    if (!manualApiBase) {
      console.log('🔍 启动智能API检测...');
      const bestApiUrl = await smartApiDetector.getApiUrl();

      if (bestApiUrl) {
        console.log(`✅ 智能检测到最佳API地址: ${bestApiUrl}`);
        axios.defaults.baseURL = bestApiUrl;
        console.log('✅ 已更新axios.defaults.baseURL:', axios.defaults.baseURL);

        // 保存检测结果到本地存储
        localStorage.setItem('smart-api-detected', bestApiUrl);
      } else {
        console.log('⚠️ 智能检测失败，使用默认配置');
      }
    } else {
      console.log('📌 使用用户手动设置的API地址:', manualApiBase);
      axios.defaults.baseURL = manualApiBase;
      console.log('📌 已设置axios.defaults.baseURL:', axios.defaults.baseURL);
    }
  } catch (error) {
    console.error('❌ 智能API检测失败:', error);
    console.log('🔄 使用默认API配置');
  }
};

// 全局方法：动态切换API基础地址
// 可在浏览器控制台调用：window.setApiBase('http://新地址:端口')
window.setApiBase = (url) => {
  localStorage.setItem('api-base', url);
  axios.defaults.baseURL = url;
  ElMessage.success('API基础地址已切换为：' + url);
};

/**
 * 应用初始化函数
 * 功能：在挂载应用前加载必要的配置
 *
 * 工作流程：
 * 1. 智能检测最佳API地址
 * 2. 加载网站配置（logo、标题等）
 * 3. 处理加载失败的情况
 * 4. 挂载Vue应用到DOM
 */
const initApp = async () => {
  try {
    // 1. 首先进行智能API检测
    await initializeSmartApi();

    // 2. 加载网站配置
    const { loadSiteConfig } = useSiteConfig();
    await loadSiteConfig();
  } catch (error) {
    // 配置加载失败不影响应用启动
    console.warn('应用初始化过程中出现警告:', error);
  }

  // 3. 将Vue应用挂载到id为'app'的DOM元素
  app.mount('#app');
};

// 启动应用
initApp();