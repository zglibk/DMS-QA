import { ref, reactive } from 'vue'
import axios from 'axios'

// 全局网站配置状态
const siteConfig = reactive({
  siteName: '质量数据管理系统',
  companyName: 'DMS质量管理系统',
  logoBase64Img: '/logo.png',
  faviconBase64Img: '/logo.png',
  headerTitle: '质量数据系统',
  loginTitle: 'DMS-QA 质量管理系统',
  footerCopyright: '© 2025 DMS质量管理系统. All rights reserved.'
})

const isLoading = ref(false)

// 加载网站配置
const loadSiteConfig = async () => {
  if (isLoading.value) return siteConfig
  
  isLoading.value = true
  try {
    const response = await axios.get('/api/config/site-config')
    if (response.data.success) {
      Object.assign(siteConfig, response.data.data)
      
      // 更新页面标题和图标
      updatePageMeta()
    }
  } catch (error) {
    console.error('加载网站配置失败:', error)
  } finally {
    isLoading.value = false
  }
  
  return siteConfig
}

// 更新网站配置
const updateSiteConfig = (newConfig) => {
  Object.assign(siteConfig, newConfig)
  updatePageMeta()
}

// 更新页面元信息
const updatePageMeta = () => {
  // 更新页面标题
  document.title = siteConfig.siteName
  
  // 更新favicon
  let favicon = document.querySelector('link[rel="icon"]')
  if (!favicon) {
    favicon = document.createElement('link')
    favicon.rel = 'icon'
    document.head.appendChild(favicon)
  }
  favicon.href = siteConfig.faviconBase64Img
}

// 监听配置更新事件
const setupConfigListener = () => {
  window.addEventListener('siteConfigUpdated', (event) => {
    updateSiteConfig(event.detail)
  })
}

// 使用网站配置的 composable
export const useSiteConfig = () => {
  return {
    siteConfig,
    isLoading,
    loadSiteConfig,
    updateSiteConfig,
    setupConfigListener
  }
}

// 自动设置监听器
if (typeof window !== 'undefined') {
  setupConfigListener()
}
