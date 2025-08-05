/**
 * 网站配置管理组合式函数
 *
 * 功能说明：
 * 1. 管理全局网站配置信息（标题、logo等）
 * 2. 从后端API加载配置
 * 3. 动态更新页面标题和图标
 * 4. 提供配置更新方法
 *
 * 设计模式：
 * - 使用Vue 3组合式API
 * - 单例模式：全局共享同一个配置对象
 * - 响应式：配置变化时自动更新UI
 */

// 导入Vue 3响应式API
import { ref, reactive } from 'vue'
// 导入HTTP请求库
import axios from 'axios'

/**
 * 全局网站配置状态
 *
 * 使用reactive创建响应式对象
 * 配置项说明：
 * - siteName: 网站名称（显示在浏览器标题栏）
 * - companyName: 公司名称
 * - logoBase64Img: Logo图片路径或Base64数据
 * - faviconBase64Img: 网站图标路径或Base64数据
 * - headerTitle: 页面头部标题
 * - loginTitle: 登录页面标题
 * - footerCopyright: 页脚版权信息
 */
const siteConfig = reactive({
  siteName: '质量数据管理系统',
  companyName: 'DMS质量管理系统',
  logoBase64Img: '/logo.png',
  faviconBase64Img: '/logo.png',
  headerTitle: '质量数据系统',
  loginTitle: 'DMS-QA 质量管理系统',
  footerCopyright: '© 2025 DMS质量管理系统. All rights reserved.'
})

// 加载状态标识
const isLoading = ref(false)

/**
 * 加载网站配置
 *
 * 功能：从后端API获取网站配置信息
 *
 * 工作流程：
 * 1. 检查是否正在加载中，避免重复请求
 * 2. 发送GET请求到/api/config/site-config
 * 3. 成功时合并配置到全局状态
 * 4. 调用updatePageMeta更新页面元信息
 * 5. 失败时记录错误但不影响应用运行
 *
 * 返回值：配置对象（无论成功失败都返回当前配置）
 */
const loadSiteConfig = async () => {
  // 防止重复加载
  if (isLoading.value) return siteConfig

  isLoading.value = true
  try {
    // 请求网站配置API
    const response = await axios.get('/config/site-config')

    if (response.data.success) {
      // 合并新配置到全局状态
      Object.assign(siteConfig, response.data.data)

      // 更新页面标题和图标
      updatePageMeta()
    }
  } catch (error) {
    // 配置加载失败不影响应用运行
  } finally {
    isLoading.value = false
  }

  return siteConfig
}

/**
 * 更新网站配置
 *
 * 功能：手动更新配置并同步到页面元信息
 *
 * 参数：
 * - newConfig: 包含新配置项的对象
 *
 * 使用场景：
 * - 管理后台修改配置后实时更新
 * - 组件内临时修改配置
 */
const updateSiteConfig = (newConfig) => {
  // 合并新配置
  Object.assign(siteConfig, newConfig)
  // 立即更新页面元信息
  updatePageMeta()
}

/**
 * 更新页面元信息
 *
 * 功能：根据当前配置更新浏览器页面的标题和图标
 *
 * 工作流程：
 * 1. 更新document.title为配置的网站名称
 * 2. 查找或创建favicon链接元素
 * 3. 设置favicon的href为配置的图标路径
 */
const updatePageMeta = () => {
  // 更新浏览器标题栏显示的标题
  document.title = siteConfig.siteName

  // 更新网站图标（favicon）
  let favicon = document.querySelector('link[rel="icon"]')
  if (!favicon) {
    // 如果页面中没有favicon元素，创建一个
    favicon = document.createElement('link')
    favicon.rel = 'icon'
    document.head.appendChild(favicon)
  }
  // 设置图标路径
  favicon.href = siteConfig.faviconBase64Img
}

/**
 * 设置配置更新监听器
 *
 * 功能：监听全局的配置更新事件
 *
 * 使用场景：
 * - 管理后台修改配置后，通过事件通知其他页面更新
 * - 实现跨组件的配置同步
 *
 * 事件格式：
 * window.dispatchEvent(new CustomEvent('siteConfigUpdated', { detail: newConfig }))
 */
const setupConfigListener = () => {
  window.addEventListener('siteConfigUpdated', (event) => {
    updateSiteConfig(event.detail)
  })
}

/**
 * 网站配置组合式函数
 *
 * 功能：提供网站配置相关的响应式状态和方法
 *
 * 返回值：
 * - siteConfig: 响应式配置对象
 * - isLoading: 加载状态
 * - loadSiteConfig: 加载配置方法
 * - updateSiteConfig: 更新配置方法
 * - setupConfigListener: 设置监听器方法
 *
 * 使用方式：
 * const { siteConfig, loadSiteConfig } = useSiteConfig()
 */
export const useSiteConfig = () => {
  return {
    siteConfig,
    isLoading,
    loadSiteConfig,
    updateSiteConfig,
    setupConfigListener
  }
}

// 自动设置监听器（仅在浏览器环境中）
if (typeof window !== 'undefined') {
  setupConfigListener()
}
